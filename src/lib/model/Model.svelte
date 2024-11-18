<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { writable, derived } from 'svelte/store';
	import { fade, slide } from 'svelte/transition';
	import { tick } from 'svelte';

	import { quantile } from 'd3-array';
	import { integrateRK4 } from './integration';
	import { sampleMultivariateNormal, generateStandardNormalSample } from './sampling';
	import DateTimeSelect from '$lib/components/dateTime/DateTimeSelect.svelte';
	import { formatDate } from '$lib/components/dateTime/dateHelpers.js';
	import Modal from '$lib/components/Modal.svelte';

	import { params, pvvs, calculated, globals, pts, seed } from './modelData';

	let plotElement;
	let output;

	let setPVVs_0 = writable(false);
	let modelParams = writable({
		timeStart: 0,
		timeEnd: 7,
		dt: 0.005
	});
	const numSimulations = 100;

	// TODOs
	// - database for pts; hashed NHI as input, and need a 'setter' for writing data as well as modify setPatientData() function (include an amorphos table for audit; https://ludwigstuyck.wordpress.com/2013/04/04/history-tracking/)
	// - add selector for 'neonate','infant','child','adult' and have appropriate checks and changes to UI etc
	// - ?Daylight savigns time - needs to work... can we test?
	// - remove the PVV, 100 run, and 'download' UI elements => only allow the multisims (100x)
	// - plot margins of error on the graph
	// - option to plot as log or linear
	// - consider NONMEM file read (from a mrgsolve or xpose file [the cpp one I have] or R object)

	let seedInUse = $seed;
	//Pt details
	let birthDateTime = formatDate(new Date().setMinutes(0, 0, 0));
	export let birthWeight = 3.5;
	export let gestationalAge_weeks = 40;
	let RDS = 0;
	let MAS = 0;
	let LOWAPG = 0;
	let postSurgical = 0;
	let surgeryDate = new Date().setMinutes(0, 0, 0);
	let surgeryDuration = 2;
	let surgerySteroids = 0;
	let surgeryWeight = birthWeight;

	$: Time_Surg = getDaysDiff(birthDateTime, surgeryDate);
	$: PMAW_S = gestationalAge_weeks + Time_Surg / 7;

	$: relayoutPlot(postSurgical);

	function relayoutPlot(postSurgical) {
		try {
			setTimeout(function () {
				try {
					Plotly.relayout('pct_plot', { responsive: true, autosize: true });
				} catch (e) {
					//console.log(e);
				}
			}, 500);
		} catch (e) {}
	}

	//Measurements
	let measurements = [];
	let temp_measurementDate = new Date().setMinutes(0, 0, 0);
	let temp_measurementConc = 0.1;
	let temp_measurementWeight = 3.5;
	let points = writable([]);

	let showAddAnnotationDialog = false;
	let showAbout = false;

	//Additions (rows)
	let rows = writable([{ TIME: 0, AMT: 2 / 24, RATE: 1, CMT: 1 }]);

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
		if (measurements.length == 0) return [];
		const xs = measurements.map((measurement) => {
			return getDaysDiff(birthDateTime, measurement.time);
		});
		const ys = measurements.map((measurement) => {
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

	$: initialConditionsArray = Array(25).fill(0);

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

		//Do the additions (ROWS) : TODO, this needs updating
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
				const dWT = $rows[r].WT - $params.WT;
				const dWTt = $rows[r].TIME - t;
				$params.WT += (dWT / dWTt) * $modelParams.dt;
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

	//This is only run when a pt is selected - to retrieve data.
	//Default settings are provided in case there is no value for a variable
	function setPatientData() {
		$rows = [{ TIME: 0, AMT: 2 / 24, RATE: 1, CMT: 1 }];
		if (Object.keys($pts).includes(patientID)) {
			console.log(patientID);
			for (const [key, value] of Object.entries($pts[patientID])) {
				//birthdate
				birthDateTime = new Date($pts[patientID].birthDateTime) || new Date().setMinutes(0, 0, 0);
				//Birthweight
				birthWeight = $pts[patientID].birthWeight || 3.5;
				//Gestational age
				gestationalAge_weeks = $pts[patientID].gestationalAge_weeks || 40;
				//RDS
				RDS = $pts[patientID].RDS || 0;
				//MAS
				MAS = $pts[patientID].MAS || 0;
				//LOWAPG
				LOWAPG = $pts[patientID].LOWAPG || 0;
				//postSurgical
				postSurgical = $pts[patientID].postSurgical || 0;
				//surgeryDate
				surgeryDate = new Date($pts[patientID].surgeryDate) || new Date().setMinutes(0, 0, 0);
				//surgeryDuration
				surgeryDuration = $pts[patientID].surgeryDuration || 2;
				//surgerySteroids
				surgerySteroids = $pts[patientID].surgerySteroids || 0;
				//surgeryWeight
				surgeryWeight = $pts[patientID].weight || 3.5;
			}
			//ADD in the measurements (need to update the store also)
			measurements = $pts[patientID].measurements || [];
			if (measurements.length > 0) {
				sortMeasurements(); // and ensure they are sorted and plotted
			} else {
				$points = [];
			}

			console.log('doCalc rows = ', $rows);
		} else {
			setPatientData();
		}

		runModelAndUpdatePlot();
	}

	function runModel() {
		if ($setPVVs_0) {
			//Make the pvvs 0
			Object.entries($localpvvs).forEach(([key, value]) => {
				$localpvvs[key] = 0;
			});
			$localpvvs = $localpvvs;
		} else {
			//Generate PVVs
			generatePVVs();
		}

		resetGlobals();

		//reset the rows - this is a "birth event"
		$rows = [{ TIME: 0, AMT: 2 / 24, RATE: 1, CMT: 1 }];

		//Baseline (ROW 1)
		$params.PMAW = gestationalAge_weeks;
		$params.WT = birthWeight;
		$params.RESP = RDS + MAS;
		$params.LOWAPG1 = LOWAPG + 0;

		//ROW2
		if (postSurgical) {
			const Time_Surg = getDaysDiff(birthDateTime, surgeryDate);
			$rows.push({
				TIME: Time_Surg,
				AMT: surgeryDuration / 24,
				RATE: 1,
				CMT: 2,
				WT: surgeryWeight
			});
			$params.STER = surgerySteroids;
		}

		//Measurements - more rows to add
		//Load in the measurements
		if (measurements.length > 0) {
			sortMeasurements();
		}

		doCalculated();

		initialConditionsArray[2] = $calculated.initialPCT;
		updateGlobals(setPVVs_0, initialConditionsArray);

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

	function downloadCSV(dataIN, filename = 'model_data.csv', multiple = false) {
		let csvContent = '';
		if ($setPVVs_0 == 1) {
			//dataIN is a single set of results
			// Get the keys (headings) from the output object
			const keys = Object.keys(dataIN);

			// Create the header row
			const header = keys.join(',');

			// Create the data rows
			// Determine the number of rows by checking the length of the first array
			const numRows = dataIN[keys[0]].length;
			const rows = [];

			for (let i = 0; i < numRows; i++) {
				const row = keys.map((key) => {
					const value = dataIN[key][i];
					// Handle cases where value might be a string containing commas
					return `"${value}"`;
				});
				rows.push(row.join(','));
			}

			// Combine header and rows into a CSV string
			csvContent = [header, ...rows].join('\n');
		} else {
			// dataIN is the PVVs and the 5-95% timeseries
			const { CL, pvvs, ts, percentiles } = dataIN;
			const pvvKeys = Object.keys(pvvs[0]);

			const headers = ['CL', ...Object.keys(pvvs[0]), 'ts', 'p5', 'median', 'p95'];

			// Combine header and rows into a CSV string
			const csvRows = [headers.join(',')];

			// Determine the maximum number of rows needed
			const maxLength = Math.max(pvvs.length, ts.length, percentiles.p5.length);

			for (let i = 0; i < maxLength; i++) {
				const CLRow = CL[i] || {};
				const pvvRow = pvvs[i] || {};
				const pvvValues = pvvKeys.map((key) => (pvvRow[key] !== undefined ? pvvRow[key] : ''));
				const tsValue = ts[i] !== undefined ? ts[i] : '';
				const p5Value = percentiles.p5[i] !== undefined ? percentiles.p5[i] : '';
				const medianValue = percentiles.median[i] !== undefined ? percentiles.median[i] : '';
				const p95Value = percentiles.p95[i] !== undefined ? percentiles.p95[i] : '';

				const row = [CLRow, ...pvvValues, tsValue, p5Value, medianValue, p95Value];

				csvRows.push(row.join(','));
			}

			// Combine header and rows into a CSV string
			csvContent = csvRows.join('\n');
		}
		// Create a Blob object with the CSV content
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

		// Create a link element
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', filename);
		link.style.visibility = 'hidden';

		// Append the link to the body
		document.body.appendChild(link);

		// Trigger the download
		link.click();

		// Clean up
		document.body.removeChild(link);
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

	function downloadOutput() {
		console.log(output);
		downloadCSV(output, patientID + '_PVV' + parseInt(0 + !$setPVVs_0) + '.csv');
	}

	function updateplot(times, values) {
		const modelData = {
			x: times,
			y: values,
			mode: 'lines',
			name: 'PCT'
		};

		const layout = {
			xaxis: { title: 'Time (Days)' },
			yaxis: { title: 'PCT concentration (mcg/L)', type: 'log' },
			margin: { l: 40, r: 20, t: 20, b: 40 }
		};

		try {
			Plotly.newPlot('pct_plot', [modelData, $points], layout, {
				responsive: true,
				autosize: true
			});
		} catch (e) {
			//console.log(e);
		}
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
			xaxis: { title: 'Time (Days)' },
			yaxis: { title: 'PCT concentration (mcg/L)', type: 'log' },
			legend: {
				x: 1,
				xanchor: 'right',
				y: 1
			},
			margin: { l: 40, r: 20, t: 20, b: 40 }
		};

		try {
			Plotly.newPlot('pct_plot', [traceP5, traceMedian, traceP95, $points], layout, {
				responsive: true,
				autosize: true
			});
		} catch (e) {
			//console.log(e);
		}
	}

	function runModelAndUpdatePlot() {
		runModel();

		updateplot($globals.t, $globals.CONCPCT);
	}

	function runandplotModelSimulations() {
		seedInUse = $seed; //reset the seed to default (from store)
		const startTime = performance.now();
		let modelSamples = [];

		let CLoutputs = [];
		let pvvOutputs = [];

		// Run simulations
		for (let i = 0; i < numSimulations; i++) {
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

	//helper function to get the difference between two dates, in days
	function getDaysDiff(date1, date2) {
		date1 = new Date(date1);
		date2 = new Date(date2);
		const millisecondsDiff = date2.getTime() - date1.getTime();

		const daysDiff = millisecondsDiff / (24 * 60 * 60 * 1000);
		return daysDiff;
	}

	onMount(() => {
		$setPVVs_0 = true;
		generatePVVs();
		runModelAndUpdatePlot();
	});

	function addMeasurement(time, conc, weight) {
		measurements = [...measurements, { time: time, conc: conc, weight: weight }];
		sortMeasurements();
	}
	function removeMeasurement(idx) {
		measurements = [...measurements.slice(0, idx), ...measurements.slice(idx + 1)];
		sortMeasurements();
	}
	function sortMeasurements() {
		measurements = measurements.sort((a, b) => new Date(a.time) - new Date(b.time));
		$points = makeConcPoints(measurements, birthDateTime);
		//Add in rows for the calc
		for (let m = 0; m < measurements.length; m++) {
			$rows.push({
				TIME: getDaysDiff(birthDateTime, new Date(measurements[m].time)),
				WT: measurements[m].weight
			});
		}
	}
</script>

<Modal bind:showModal={showAddAnnotationDialog}>
	<div class="container" style="width:100%;">
		<label
			>Date of measurement: <DateTimeSelect
				label=""
				bind:thedatetime={temp_measurementDate}
			/></label
		>

		<label
			>Measured concentration: <input
				type="number"
				min="0.1"
				max="10"
				step="0.1"
				bind:value={temp_measurementConc}
			/></label
		>

		<label
			>Weight: <input
				type="number"
				min="0.1"
				max="10"
				step="0.1"
				bind:value={temp_measurementWeight}
			/></label
		>
	</div>
	<div style="flex: 1; width:100%; border:none;">
		<button
			style="color: darkgreen; cursor: pointer; font-weight:900;"
			on:click={() => {
				addMeasurement(temp_measurementDate, temp_measurementConc, temp_measurementWeight);
				runModelAndUpdatePlot();
				showAddAnnotationDialog = false;
			}}>Add</button
		>
		<button
			style="color: red; cursor: pointer; font-weight:900;"
			on:click={() => {
				showAddAnnotationDialog = false;
				console.log(showAddAnnotationDialog);
			}}>Cancel</button
		>
	</div>
</Modal>

<div class="container" id="about">
	<p>
		This tool provides predictions of procalcitonin (PCT) concentations in non-infected neonates,
		infants and adults. The user should enter patient factors to see predicted PCT concentrations in
		non-infected individuals. Observed PCT concentrations can be entered and will be plotted
		alongside the reference range. If observed PCT concentrations are outside the reference range
		the patient has a suspected infection. Definitions: Neonate: &lt; 30 days old, Infant: 1 month -
		2 years of age, Child: 2 - 18 years old, Adult: &gt; 18 years old
	</p>
</div>

<div class="containers">
	<div class="container" id="ptDataAndMeasures">
		<h4>Patient details</h4>
		<label
			>Birth time: <DateTimeSelect
				label=""
				bind:thedatetime={birthDateTime}
				on:input={runModelAndUpdatePlot}
			/>
		</label>
		<label>
			Birth weight (kg):
			<input
				type="number"
				min="0.1"
				max="10"
				step="0.1"
				bind:value={birthWeight}
				on:change={runModelAndUpdatePlot}
			/>
		</label>
		<label>
			Gestational age (weeks):
			<input
				type="number"
				min="20"
				max="45"
				step="1"
				bind:value={gestationalAge_weeks}
				on:change={runModelAndUpdatePlot}
			/>
		</label>
		<label
			>Respiratory Distress Syndrome:
			<input type="checkbox" on:input={() => (RDS = !RDS * 1)} on:change={runModelAndUpdatePlot} />
		</label>
		<label
			>Meconium Aspiration Syndrome:
			<input type="checkbox" on:input={() => (MAS = !MAS * 1)} on:change={runModelAndUpdatePlot} />
		</label>
		<label
			>{'APGAR 1 Minute < 7:'}
			<input
				type="checkbox"
				on:input={() => (LOWAPG = !LOWAPG * 1)}
				on:change={runModelAndUpdatePlot}
			/>
		</label>
		<label
			>Post-surgical patient:<input
				type="checkbox"
				bind:checked={postSurgical}
				on:change={runModelAndUpdatePlot}
			/></label
		>
		{#if postSurgical}
			<div id="surgeryData" transition:slide>
				<label
					>Surgery time:<DateTimeSelect
						label=""
						bind:thedatetime={surgeryDate}
						on:input={runModelAndUpdatePlot}
					/>
				</label>
				<label
					>Surgery duration (hours):
					<input
						type="number"
						min="1"
						max="24"
						step="1"
						bind:value={surgeryDuration}
						on:change={runModelAndUpdatePlot}
					/>
				</label>
				<label
					>Pre-surgical Steroids:
					<input
						type="checkbox"
						on:input={() => (surgerySteroids = !surgerySteroids * 1)}
						on:change={runModelAndUpdatePlot}
					/>
				</label>
				<label
					>Weight at surgery (kg):
					<input
						type="number"
						min="0.1"
						max="10"
						step="0.1"
						bind:value={surgeryWeight}
						on:change={runModelAndUpdatePlot}
					/>
				</label>
			</div>
		{/if}

		<h4>Measurements</h4>
		<table>
			<thead>
				<tr>
					<th>Date</th>
					<th>PCT (mcg/L)</th>
					<th>Weight (kg)</th>
				</tr>
			</thead>
			<tbody>
				{#if measurements.length > 0}
					{#each measurements as measurement, idx}
						<tr>
							<td class="time">{formatDate(measurement.time)}</td>
							<td class="conc">{measurement.conc}</td>
							<td class="weight"
								>{measurement.weight}
								<span
									style="float: right;"
									on:click={() => {
										removeMeasurement(idx);
										runModelAndUpdatePlot();
									}}><a style="color: red; cursor: pointer">🗑️</a></span
								></td
							>
						</tr>
					{/each}
				{/if}
				<tr
					style="cursor: pointer; "
					on:click={() => {
						showAddAnnotationDialog = true;
					}}>Add a measurement: <button style="color: darkgreen; font-weight:900;">+</button></tr
				>
			</tbody>
		</table>
	</div>

	<!-- THE PLOT -->
	<div class="container" id="pct_plot" bind:this={plotElement} style="width: 100%;"></div>
</div>

<div class="container" id="modelcontrols">
	<!-- BUTTONS TO RUN MODEL(S) -->
	<!-- MODEL PARAMETERS -->
	<label>
		<input type="checkbox" bind:checked={$setPVVs_0} on:change={runModelAndUpdatePlot} />
		Keep PVVs 0
	</label>
	<button
		on:click={() => {
			runandplotModelSimulations();
		}}>Sample {numSimulations}</button
	>
	<button on:click={downloadOutput}>Download Output</button>
	<button
		on:click={() => {
			showAbout = true;
		}}>About</button
	>
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
	.containers {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		gap: 2px; /* Optional: Adds space between the containers */
	}

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
	#ptDataAndMeasures {
		min-width: 200px;
		flex-grow: 1;
	}
	#pct_plot {
		min-width: 300px;
		flex-grow: 2;
	}
	.overlay {
		position: absolute; /* Position it absolutely within the container */
		top: 0;
		left: 0;
		width: 100%; /* Cover the entire width of the container */
		height: 100%; /* Cover the entire height of the container */
		background: rgba(0, 0, 0, 0.5); /* Semi-transparent black background */
		display: flex; /* Flexbox to center content */
		align-items: center; /* Vertically center the content */
		justify-content: center; /* Horizontally center the content */
		color: white; /* Text color */
		font-size: 1.5em; /* Font size for message */
		z-index: 10; /* Ensure it sits above other content */
		pointer-events: none; /* Allows clicks to pass through the overlay */
	}

	#modelcontrols {
		width: 98%;
		display: flex;
	}

	#about {
		width: 98%;
		display: flex;
	}

	.container h4 {
		margin: 0;
		margin-bottom: 5px;
		padding: 0;
		font-size: 18px;
	}

	.container label {
		display: flex;
		vertical-align: top;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}

	.container input {
		cursor: pointer;
		text-align: right;
	}
	.container input[type='range'] {
		width: 25%;
		margin-top: 5px;
	}
	.container input[type='number'] {
		width: 3em;
		height: 1em;
		margin-top: 5px;
	}

	.container input[type='checkbox'] {
		margin-left: 10px;
	}
	#surgeryData {
		margin-left: 10px;
	}
	table,
	td,
	th {
		border: 1px solid;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	input[type='number']::-webkit-inner-spin-button,
	input[type='number']::-webkit-outer-spin-button {
		margin-left: 3px;
		padding-left: 2px;
	}
</style>
