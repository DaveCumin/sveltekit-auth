<script>
	// @ts-nocheck

	import { onMount } from 'svelte';
	import { writable, get } from 'svelte/store';
	import { fade, slide, scale } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import { tick } from 'svelte';

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

	import { inputs, rows, ageCategories } from './modelData';

	let setPVVs_0 = writable(false);
	//Measurements
	let temp_measurementDate = new Date().setMinutes(0, 0, 0);
	let temp_measurementConc = 0.1;
	let temp_measurementWeight = 3.5;
	let showAddAnnotationDialog = false;
	let showAbout = false;

	// Make sure the ages etc are appropriate when they are changed
	$: checkAgeCatVars($inputs.ageCategory);
	function checkAgeCatVars(ageCategory) {
		console.log(ageCategory, ': need to check for parameters here.');
	}

	$: relayoutPlot($inputs.postSurgical);
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

	function addMeasurement(time, conc, weight) {
		$inputs.measurements = [...$inputs.measurements, { time: time, conc: conc, weight: weight }];
		sortMeasurements();
	}
	function removeMeasurement(idx) {
		$inputs.measurements = [
			...$inputs.measurements.slice(0, idx),
			...$inputs.measurements.slice(idx + 1)
		];
		sortMeasurements();
	}
	function sortMeasurements() {
		$inputs.measurements = $inputs.measurements.sort((a, b) => new Date(a.time) - new Date(b.time));
		//Add in rows for the calc
		for (let m = 0; m < $inputs.measurements.length; m++) {
			$rows.push({
				TIME: getDaysDiff($inputs.birthDateTime, new Date($inputs.measurements[m].time)),
				WT: $inputs.measurements[m].weight
			});
		}
	}
</script>

<Modal bind:showModal={showAddAnnotationDialog}>
	<div class="grid w-full max-w-sm items-center gap-1.5">
		{formatDate(new Date($inputs.birthDateTime), false, 'other')}
		<Label>Date of measurement:</Label>
		<DateTimeSelect
			label=""
			minDate={formatDate(new Date($inputs.birthDateTime), false, 'other')}
			bind:thedatetime={temp_measurementDate}
		/>

		<Label for="measuredconc">Measured concentration:</Label>
		<Input type="number" min="0.1" max="10" step="0.1" bind:value={temp_measurementConc} />

		<Label for="measuredconc">Weight:</Label>
		<Input type="number" min="0.1" max="10" step="0.1" bind:value={temp_measurementWeight} />

		<div class="flex justify-end space-x-2">
			<Button
				variant="ghost"
				on:click={() => {
					showAddAnnotationDialog = false;
					console.log(showAddAnnotationDialog);
				}}>Cancel</Button
			>
			<Button
				on:click={() => {
					addMeasurement(temp_measurementDate, temp_measurementConc, temp_measurementWeight);

					showAddAnnotationDialog = false;
				}}>Add</Button
			>
		</div>
	</div>
</Modal>

<div>
	<p class="max-w-[100%] text-lg text-muted-foreground">
		This tool provides predictions of procalcitonin (PCT) concentations in non-infected neonates,
		infants and adults. The user should enter patient factors to see predicted PCT concentrations in
		non-infected individuals. Observed PCT concentrations can be entered and will be plotted
		alongside the reference range. If observed PCT concentrations are outside the reference range
		the patient has a suspected infection. Definitions: Neonate: &lt; 30 days old, Infant: 1 month -
		2 years of age, Child: 2 - 18 years old, Adult: &gt; 18 years old
	</p>
</div>

<div class="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
	<Card.Root>
		<Card.Header>
			<Card.Title>Patient details</Card.Title>
			<Card.Description>Enter the patient details below.</Card.Description>
		</Card.Header>
		<Card.Content>
			<Label>Age category:</Label>
			<Select.Root
				onSelectedChange={(v) => {
					$inputs.ageCategory = v.value;
					if ($inputs.ageCategory != 'Neonate') {
						$inputs.postSurgical = true;
					}
				}}
			>
				<Select.Trigger class="w-full">
					<Select.Value placeholder="Neonate" />
				</Select.Trigger>

				<Select.Content>
					<Select.Group>
						{#each $ageCategories as ac}
							<Select.Item value={ac.value} label={ac.label}>{ac.label}</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
				<Select.Input name="ageCategory" />
			</Select.Root>
			{#key $inputs.ageCategory}
				{#if $inputs.ageCategory == 'Neonate'}
					<div transition:fade|global={{ easing: cubicInOut }}>
						<Label for="birthdate">Birth time:</Label>
						<DateTimeSelect label="" bind:thedatetime={$inputs.birthDateTime} />

						<Label for="ga">Gestational age (weeks):</Label>
						<Input
							type="number"
							min="20"
							max="45"
							step="1"
							bind:value={$inputs.gestationalAge_weeks}
						/>

						<Label for="birthwt">Birth weight (kg):</Label>
						<Input type="number" min="0.1" max="10" step="0.1" bind:value={$inputs.birthWeight} />

						<div class="flex items-center my-2 mr-2">
							<Checkbox
								class="mr-2"
								bind:checked={$inputs.RDS}
								onCheckedChange={(v) => {
									$inputs.RDS = !$inputs.RDS * 1;
								}}
							/>
							<Label>Respiratory Distress Syndrome</Label>
						</div>
						<div class="flex items-center my-2 mr-2">
							<Checkbox
								class="mr-2"
								bind:checked={$inputs.MAS}
								onCheckedChange={(v) => {
									$inputs.MAS = !$inputs.MAS * 1;
								}}
							/>
							<Label>Meconium Aspiration Syndrome</Label>
						</div>
						<div class="flex items-center my-2 mr-2">
							<Checkbox
								class="mr-2"
								bind:checked={$inputs.LOWAPG}
								onCheckedChange={(v) => {
									$inputs.LOWAPG = !$inputs.LOWAPG * 1;
								}}
							/>
							<Label>{`APGAR 1 Minute < 7`}</Label>
						</div>
					</div>
				{:else if $inputs.ageCategory == 'Infant'}
					<div transition:fade|global={{ easing: cubicInOut }}>
						<Label for="birthdate">Birth date:</Label>
						<DateTimeSelect label="" dateonly="true" bind:thedatetime={$inputs.birthDateTime} />

						<Label for="ga">Gestational age (weeks):</Label>
						<Input
							type="number"
							min="20"
							max="45"
							step="1"
							bind:value={$inputs.gestationalAge_weeks}
						/>

						<Label for="birthwt">Birth weight (kg):</Label>
						<Input type="number" min="0.1" max="10" step="0.1" bind:value={$inputs.birthWeight} />
					</div>
				{:else if $inputs.ageCategory == 'Child'}
					<div transition:fade|global={{ easing: cubicInOut }}></div>
				{:else if $inputs.ageCategory == 'Adult'}
					<div transition:fade|global={{ easing: cubicInOut }}></div>
				{:else}
					<div transition:fade|global={{ easing: cubicInOut }}>
						<p class="text-sm text-muted-foreground">Start by selecting an age category, above.</p>
					</div>
				{/if}
			{/key}
		</Card.Content>
	</Card.Root>

	<!-- Surgical details -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Surgical details</Card.Title>
			<Card.Description>Enter the surgery details below.</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex items-center my-2 mr-2">
				<Checkbox
					class="mr-2"
					bind:checked={$inputs.postSurgical}
					onCheckedChange={(v) => {
						$inputs.postSurgical = !$inputs.postSurgical;
					}}
				/>
				<Label>Post-surgical patient</Label>
			</div>

			{#if $inputs.postSurgical}
				<div id="" transition:slide|global>
					<Label for="surgDate">Surgery time:</Label>
					<DateTimeSelect
						label=""
						minDate={$inputs.birthDateTime}
						bind:thedatetime={$inputs.surgeryDate}
					/>

					<Label for="surgDuration">Surgery duration (hours):</Label>
					<Input type="number" min="1" max="24" step="1" bind:value={$inputs.surgeryDuration} />

					<div class="flex items-center my-2 mr-2">
						<Checkbox
							class="mr-2"
							bind:checked={$inputs.surgerySteroids}
							onCheckedChange={(v) => {
								$inputs.surgerySteroids = !$inputs.surgerySteroids * 1;
							}}
						/>
						<Label>Pre-surgical steroids</Label>
					</div>

					<Label for="surgwt">Weight at surgery (kg):</Label>
					<Input type="number" min="0.1" max="10" step="0.1" bind:value={$inputs.surgeryWeight} />
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- MEASUREMENTS -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Measurements</Card.Title>
			<Card.Description>Enter measures below.</Card.Description>
		</Card.Header>
		<Card.Content>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-[180px]">Time</Table.Head>
						<Table.Head>PCT (mcg/L)</Table.Head>
						<Table.Head>Weight (kg)</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each $inputs.measurements as measurement, idx}
						<Table.Row>
							<Table.Cell>{formatDate(measurement.time)}</Table.Cell>
							<Table.Cell>{measurement.conc}</Table.Cell>
							<Table.Cell
								>{measurement.weight}
								<!-- svelte-ignore a11y-no-static-element-interactions -->
								<!-- svelte-ignore a11y-click-events-have-key-events -->
								<!-- svelte-ignore a11y-missing-attribute -->
								<span
									style="float: right;"
									on:click={() => {
										removeMeasurement(idx);
									}}><a style="color: red; cursor: pointer">🗑️</a></span
								></Table.Cell
							>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
			<Button
				class="mt-4"
				on:click={() => {
					showAddAnnotationDialog = true;
				}}>Add a measurement</Button
			>
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

	.container input[type='checkbox'] {
		margin-left: 10px;
	}
</style>
