<script>
	// @ts-nocheck

	// TODOs
	// - database for pts; hashed NHI as input, and need a 'setter' for writing data as well as modify setPatientData() function (include an amorphos table for audit; https://ludwigstuyck.wordpress.com/2013/04/04/history-tracking/)
	// - ?Daylight savigns time - needs to work... can we test?
	// - plot margins of error on the graph
	// - option to plot as log or linear

	// INPORTS
	import { writable, derived } from 'svelte/store';
	import { fade, slide, scale } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import { tick } from 'svelte';

	import { quantile } from 'd3-array';
	import { integrateRK4 } from './integration';
	import { sampleMultivariateNormal, generateStandardNormalSample } from './sampling';
	import DateTimeSelect from '$lib/components/dateTime/DateTimeSelect.svelte';
	import { formatDate, getDaysDiff } from '$lib/components/dateTime/dateHelpers.js';
	import Modal from '$lib/components/Modal.svelte';

	import { userSchema } from '$lib/config/zod-schemas';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Select from '$lib/components/ui/select';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Progress } from '$lib/components/ui/progress';

	import { params, pvvs, calculated, globals, rows, pts, seed, inputs } from './modelData';

	let seedInUse = $seed;
	let output;

	let modelParams = writable({
		timeStart: 0,
		timeEnd: 7,
		dt: 0.005
	});
	const numSimulations = 100;
	let modelstatus = 'needToRun';
	let progress = 0;

	let showAddAnnotationDialog = false;
	let showAbout = false;

	$: Time_Surg = getDaysDiff($inputs.birthDateTime, $inputs.surgeryDate);
	$: PMAW_S = $inputs.gestationalAge_weeks + Time_Surg / 7;

	$: points = makeConcPoints($inputs.measurements, $inputs.birthDateTime);
	$: runfromstoreupdate($inputs);
	function runfromstoreupdate(inputs) {
		modelstatus = 'needToRun';
	}

	// Create stores for params and pvvs
	let localpvvs = writable();
	let pvvsUpdated = writable(false);
	function resetGlobals() {
		Object.keys($globals).forEach((key) => {
			$globals[key] = [];
		});
		$globals = $globals;
	}

	function makeConcPoints(measurements, birthDateTime) {
		if ($inputs.measurements.length == 0) return [];
		const xs = $inputs.measurements.map((measurement) => {
			return getDaysDiff($inputs.birthDateTime, measurement.time);
		});
		const ys = $inputs.measurements.map((measurement) => {
			return measurement.conc;
		});

		return {
			x: xs, // x coordinates of points
			y: ys, // y coordinates of points
			mode: 'markers', // Only markers (no lines)
			name: 'Measurements',
			marker: {
				color: 'black', // Color of the markers
				size: 10 // Size of the markers
			}
		};
	}

	// Derived store for calculated values
	function doCalculated() {
		// the model equations
		$calculated.TM50 = $params.POP_TM50 * Math.exp($localpvvs.PPV_TM50);
		$calculated.Hill = parseInt($params.POP_HILL * Math.exp($localpvvs.PPV_HILL));

		$calculated.FPREM = 1 / (1 + Math.pow($params.PMAW / $calculated.TM50, -$calculated.Hill));
		$calculated.F_STER_RIN = $params.STER === 1 ? $params.F_STER : 1;
		$calculated.F_RESP_SL = $params.RESP >= 1 ? $params.F_RESP : 1;
		$calculated.F_LOWAPG1_SL = $params.LOWAPG1 === 1 ? $params.F_LOWAPG1 : 1;

		$calculated.TELB =
			$params.POP_TELB * Math.exp($localpvvs.PPV_TELB) * Math.pow($params.WT / 70, 0.25);
		$calculated.KELB = Math.log(2) / $calculated.TELB;
		$calculated.SLOPEBE =
			$params.POP_SLOPEB *
			Math.exp($localpvvs.PPV_SLOPEB) *
			$calculated.F_RESP_SL *
			$calculated.F_LOWAPG1_SL;
		$calculated.VB = 1;
		$calculated.MTT = $params.POP_MTT * Math.exp($localpvvs.PPV_MTT);
		$calculated.KTR = $params.POP_NT / $calculated.MTT;

		$calculated.TELS =
			$params.POP_TELS * Math.exp($localpvvs.PPV_TELS) * Math.pow($params.WT / 70, 0.25);
		$calculated.KELS = Math.log(2) / $calculated.TELS;
		$calculated.SLOPES1 = $params.POP_SLOPES1 * Math.exp($localpvvs.PPV_SLOPES1);
		$calculated.SLOPEDSC = $params.POP_SLOPEDSC * Math.exp($localpvvs.PPV_SLOPEDSC);
		$calculated.VS = 1;

		$calculated.VC = $params.POP_VC * ($params.WT / 70);
		$calculated.CL =
			$params.POP_CL *
			Math.exp($localpvvs.PPV_CL) *
			$calculated.FPREM *
			Math.pow($params.WT / 70, 0.75);
		$calculated.RATEIN_PCT =
			$params.POP_RATEIN *
			Math.exp($localpvvs.PPV_RATEIN) *
			Math.pow($params.WT / 70, 0.75) *
			$calculated.F_STER_RIN;

		$calculated.initialPCT = ($calculated.RATEIN_PCT / $calculated.CL) * $calculated.VC;
	}

	function model(t, y) {
		if (!pvvsUpdated) return;

		// Calculations for SYNB and SYNS
		const SYNB = 1 + $calculated.SLOPEBE * (y[5] / 1);
		const SYNS = 1 + $calculated.SLOPES1 * (y[1] / 1);

		// Constants for RATE and AMT
		const RATE = 1;
		const AMT = 2 / 24;

		// Initialize the derivative array
		const dy = new Array(y.length).fill(0);

		// Calculate derivatives for each compartment
		dy[0] = -$calculated.KTR * y[0]; //Transit1
		dy[1] = -$calculated.KELS * y[1]; //Surgery
		dy[2] = $calculated.RATEIN_PCT * SYNB * SYNS - (y[2] / $calculated.VC) * $calculated.CL; //PCT
		dy[3] = -$calculated.KELS * y[3]; //DSC
		dy[4] = -$calculated.KELS * y[4]; //Surgery2
		dy[5] = $calculated.KTR * y[y.length - 1] - $calculated.KELB * y[5]; //Birth
		dy[6] = $calculated.KTR * y[0] - $calculated.KTR * y[6]; //Transit2
		// Update the derivatives for the transit compartments
		for (let i = 7; i < y.length; i++) {
			dy[i] = $calculated.KTR * y[i - 1] - $calculated.KTR * y[i]; //Transit3-Transit20
		}

		//Do the additions (ROWS)
		for (let r = 0; r < $rows.length; r++) {
			// If the time is correct
			if (
				t - $rows[r].TIME <= $rows[r].AMT / $rows[r].RATE && // start counting the amt/rate from the start time
				t >= $rows[r].TIME //start the admin from the start time
			) {
				dy[$rows[r].CMT - 1] += $rows[r].RATE; // ADD THE DOSE
			}

			//If its a measurement to change weight
			if (
				$rows[r].WT && //if there is a weight value
				$rows[r].TIME > t //if the time is before the weight has updated
			) {
				//calculate the change to add
				const dWT = Number($rows[r].WT) - Number($params.WT);
				const dWTt = Number($rows[r].TIME) - Number(t);
				console.log('changing wt | dwt:', dWT, 'dwtt', dWTt, 'prm', $params.WT, 'row', $rows[r].WT);
				$params.WT = Number($params.WT) + (Number(dWT) / Number(dWTt)) * Number($modelParams.dt);
			}
		}

		updateGlobals(t, y);
		return dy;
	}

	function updateGlobals(t, y) {
		doCalculated();
		//Update any globals
		$globals.t.push(t);
		$globals.CONCS1.push(y[1] / $calculated.VS);
		$globals.CONCDSC.push(y[3] / $calculated.VS);
		$globals.CONCS2.push(y[4] / $calculated.VS);
		$globals.CONCB.push(y[5] / $calculated.VB);
		$globals.CONCPCT.push(y[2] / $calculated.VC);
		$globals.WT.push($params.WT);
		$globals.CL.push($calculated.CL);
	}

	function runModel() {
		generatePVVs();

		resetGlobals();

		//reset the rows - this is a "birth event"
		$rows = [{ TIME: 0, AMT: 2 / 24, RATE: 1, CMT: 1 }];

		//Baseline (ROW 1)
		$params.PMAW = $inputs.gestationalAge_weeks;
		$params.WT = $inputs.birthWeight;
		$params.RESP = $inputs.RDS + $inputs.MAS;
		$params.LOWAPG1 = $inputs.LOWAPG + 0;

		//ROW2
		if ($inputs.postSurgical) {
			const Time_Surg = getDaysDiff($inputs.birthDateTime, $inputs.surgeryDate);
			$rows.push({
				TIME: Time_Surg,
				AMT: $inputs.surgeryDuration / 24,
				RATE: 1,
				CMT: 2,
				WT: $inputs.surgeryWeight
			});
			$params.STER = $inputs.surgerySteroids;
		}

		doCalculated();

		let initialConditionsArray = Array(25).fill(0);
		initialConditionsArray[2] = $calculated.initialPCT;
		updateGlobals(0, initialConditionsArray);

		const resultRK4 = integrateRK4(
			(t, y) => model(t, y),
			initialConditionsArray,
			$modelParams.timeStart,
			$modelParams.timeEnd,
			$modelParams.dt
		);

		const PCTConc = resultRK4.ys.map((y) => y[2]); // PCT

		output = { ts: resultRK4.ts, ...$globals };
		for (let i = 0; i < resultRK4.ys[0].length; i++) {
			//add in the ys
			output[`y${i + 1}`] = [];
		}
		// Separate each ys array into y1, y2, ..., y25 and add to output
		resultRK4.ys.forEach((yArray) => {
			yArray.forEach((value, i) => {
				output[`y${i + 1}`].push(value);
			});
		});

		return [resultRK4.ts, PCTConc];
	}

	function generatePVVs() {
		let covMatrix = [];
		let singleValues = {};
		let maxLength = 0;

		// First pass: determine the size of the covariance matrix and collect single values
		let pvvsCopy = structuredClone($pvvs);
		Object.entries(pvvsCopy).forEach(([key, value]) => {
			if (Array.isArray(value)) {
				maxLength = Math.max(maxLength, value.length);
				pvvsCopy[key] = value;
			} else {
				singleValues[key] = value;
			}
		});

		// Second pass: build the covariance matrix
		for (let i = 0; i < maxLength; i++) {
			covMatrix[i] = Object.values(pvvsCopy)
				.filter(Array.isArray)
				.map((arr) => arr[i] || 0);
		}
		// Make the covariance matrix symmetric
		for (let i = 0; i < maxLength; i++) {
			for (let j = i + 1; j < maxLength; j++) {
				covMatrix[j][i] = covMatrix[i][j];
			}
		}

		// Combine the covariance matrix and single values
		let result = {
			covMatrix: covMatrix,
			...singleValues
		};

		// Generate samples for the covariance matrix
		if (covMatrix.length > 0) {
			const samples = sampleMultivariateNormal(
				new Array(covMatrix.length).fill(0),
				covMatrix,
				seedInUse
			);

			// Update the pvvsCopy with the sampled values
			Object.keys(pvvsCopy).forEach((key, index) => {
				if (Array.isArray(pvvsCopy[key])) {
					pvvsCopy[key] = samples[index];
				}
			});
		}

		// Generate samples for single values
		Object.keys(singleValues).forEach((key) => {
			pvvsCopy[key] =
				generateStandardNormalSample(1, seedInUse)[0] * Math.sqrt(Math.abs(pvvsCopy[key]));
		});
		//Set the local PVVs
		$localpvvs = pvvsCopy;
	}

	function makeSeq(START, STOP, STEP) {
		const result = [];
		for (let i = START; i <= STOP; i += STEP) {
			result.push(i);
		}
		return result;
	}

	function plotPercentiles(percentiles) {
		const times = makeSeq($modelParams.timeStart, $modelParams.timeEnd, $modelParams.dt);
		const traceP5 = {
			x: times,
			y: percentiles.p5,
			mode: 'lines',
			name: '7.5%',
			line: { color: 'blue', dash: 'dash' }
		};

		const traceMedian = {
			x: times,
			y: percentiles.median,
			mode: 'lines',
			name: 'Median',
			line: { color: 'green', dash: 'solid' }
		};

		const traceP95 = {
			x: times,
			y: percentiles.p95,
			mode: 'lines',
			name: '92.5%',
			line: { color: 'red', dash: 'dash' }
		};

		const layout = {
			xaxis: { title: 'Time (Days)', range: [$modelParams.timeStart, $modelParams.timeEnd] },
			yaxis: { title: 'PCT concentration (mcg/L)', type: 'log' },
			legend: {
				x: 1,
				xanchor: 'right',
				y: 1
			},
			margin: { l: 60, r: 20, t: 20, b: 60, pad: 20 }
		};

		try {
			Plotly.newPlot('pct_plot', [traceP5, traceMedian, traceP95, points], layout, {
				responsive: true,
				autosize: true,
				displayModeBar: false
			});
		} catch (e) {
			//console.log(e);
		}
	}

	async function dothebusiness() {
		modelstatus = 'running';
		await tick();
		await new Promise((resolve) => setTimeout(resolve, 0)); // Yield control to the event loop
		await runandplotModelSimulations();
		try {
			setTimeout(function () {
				Plotly.relayout('pct_plot', { responsive: true, autosize: true });
			}, 10);
		} catch (e) {}
		modelstatus = 'complete';
		progress = 0;
	}

	async function runandplotModelSimulations() {
		seedInUse = $seed; //reset the seed to default (from store)
		const startTime = performance.now();
		let modelSamples = [];

		let CLoutputs = [];
		let pvvOutputs = [];

		// Run simulations
		for (let i = 0; i < numSimulations; i++) {
			progress = ((i + 1) / numSimulations) * 100;
			await tick();
			await new Promise((resolve) => setTimeout(resolve, 1)); // Yield control to the event loop
			const [times, PCTConc] = runModel();

			pvvOutputs.push($localpvvs);
			CLoutputs.push($calculated.CL);
			modelSamples[i] = PCTConc;
			//update the seed to the next value
			seedInUse = seedInUse * 1.234;
		}

		// Get percentiles
		const numTimePoints = modelSamples[0].length;
		const percentiles = {
			p5: Array(numTimePoints).fill(0),
			p5ME: Array(numTimePoints).fill(0),
			p95: Array(numTimePoints).fill(0),
			p95ME: Array(numTimePoints).fill(0),
			median: Array(numTimePoints).fill(0),
			medianME: Array(numTimePoints).fill(0)
		};

		for (let t = 0; t < numTimePoints; t++) {
			const valuesAtTime = modelSamples.map((sample) => sample[t]);
			percentiles.p5[t] = quantile(valuesAtTime, 0.075);
			percentiles.p5ME[t] = 1; //1.959964 is qnorm(0.975)
			percentiles.median[t] = quantile(valuesAtTime, 0.5);
			percentiles.p95[t] = quantile(valuesAtTime, 0.925);
		}

		output = {
			CL: CLoutputs,
			pvvs: pvvOutputs,
			ts: makeSeq($modelParams.timeStart, $modelParams.timeEnd, $modelParams.dt),
			percentiles: percentiles
		};
		console.log(output);

		plotPercentiles(percentiles);
		const endTime = performance.now();
		const duration = endTime - startTime;
		console.log(`Time taken: ${duration} milliseconds`);
	}
</script>

<!-- THE PLOT -->

<div class="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
	<Card.Root>
		<Card.Header>
			{#if modelstatus == 'needToRun'}
				<Card.Title>Need to rerun the model</Card.Title>
				<Card.Description
					>Changes have been made. Click the button below to re-run the model with updated inputs.</Card.Description
				>
			{/if}
			{#if modelstatus == 'running'}
				<Card.Title>Model is running</Card.Title>
				<Card.Description>Calculating...</Card.Description>
			{/if}
			{#if modelstatus == 'complete'}
				<Card.Title>Model result and measurements</Card.Title>
			{/if}
		</Card.Header>
		<Card.Content>
			{#if modelstatus == 'needToRun'}
				<div>
					<Button on:click={dothebusiness}>Run</Button>
				</div>
			{/if}
			{#if modelstatus == 'running'}
				<Progress value={progress} />
			{/if}
			<div
				id="pct_plot"
				style={`width: 100%; height: 500px; display: ${modelstatus != 'complete' ? 'none' : 'block'}`}
			></div>
		</Card.Content>
	</Card.Root>
</div>

<!-- ABOUT -->
<Modal bind:showModal={showAbout}>
	<div class="container" style="width:100%;">
		<h4>Procalcitonin Concentration Time Course</h4>
		<p>
			<b
				>This model-based tool is intended as clinical support toaid the interpretation of
				procalcitonin concentrations in different patient populations. This is not a diagnostic tool
				and cannot be used as a standalone tool for infection diagnosis.</b
			>
		</p>
		<p>
			The model used in this tool is based on data from 350 neonates and infants with over 1300
			procalciton in (PCT) concentrations following birth and surgery. These were patients for whom
			infection was ruled out. The tool displays expected concentration ranges of PCT over time,
			based on simulations for a patient in the non-infected state only. The reference range
			considers patient factors entered by the user (e.g. patient age, current weight, date and
			duration of surgery etc). This provides an individualised time-specific reference range for
			expected PCT concentrations in the non-infected state.
		</p>
		<p>
			Reference ranges are based on 100 simulations with median, 7.5th and 92.5th percentiles shown.
			A 95% confidence interval is coloured around each prediction percentile to show the confidence
			associated with the reference range. The smaller inset plot shows the PCT concentration time
			course on the log scale (concentration axis only). Where a concentration measurement is
			entered for the patient, a metric (“Inf” or “No Inf”) is presented that evaluates the measured
			PCT concentration relative to the 92.5th percentile of the model-predicted PCT concentrations,
			which assume no infection. The 92.5th percentile generated from the model has a sensitivity of
			85.2% and specificity of 92.5% for detecting infection. An observed concentration less than
			the 92.5th percentile concentration rising from the non-infected model suggests they are both
			likely derived from the same distribution, supporting no infection. A result where the
			observed concentration is greater than the 92.5th percentile arising from the non-infected
			model suggests the concentration is not derived from the same distribution, or in other words,
			the observed concentration is not expected under the non-infected state.
		</p>
		<p>
			<b>Note:</b> Each observed concentration is considered individually to guide whether infection
			is suspected. This simulation does not consider whether multiple concentrations combined indicate
			suspected infection. The metric underpinning this tool has not been validated in a prospective
			clinical dataset.
		</p>
		<p><u>About Model</u></p>
		<p>
			PCT was described using a one compartment turnover model with first order elimination and a
			volume of distribution of 15L/70kg. Birth and surgical event stimuli were described with one
			compartments, a zero-order input and first order elimination. PCT production was assumed to
			increase linearly with stimuli associated with birth and surgery. Patient factors included
			postmenstrual age (empirical sigmoid Emax), theory based allometric size using total body
			weight, factors related to APGAR score at 1 minute, respiratory distress syndrome, meconium
			aspiration syndrome and pre-surgical steroid use. Models were developed using NONMEM 7.5.1.
		</p>
		<p>
			This work was performed using a license for NONMEM granted by ICON to the Australian Centre of
			Pharmacometrics. The Australian Centre for Pharmacometrics is an initiative of the Australian
			Government as part of the National Collaborative Research Infrastructure Strategy.
		</p>
	</div>
</Modal>

<style>
	.container {
		border: 1px solid var(--txt-col);
		padding: 5px;
		border-radius: 5px;
		width: 300px;
		margin: 5px;
		box-shadow: 0 0 10px var(--bg-col);
		text-align: left;
		flex: 1;
	}
	#pct_plot {
		min-width: 300px;
		flex-grow: 2;
	}

	.container h4 {
		margin: 0;
		margin-bottom: 5px;
		padding: 0;
		font-size: 18px;
	}
</style>
