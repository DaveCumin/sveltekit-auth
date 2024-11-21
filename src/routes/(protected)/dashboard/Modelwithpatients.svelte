<script>
	// @ts-nocheck
	import { writable } from 'svelte/store';
	import ModelPlot from '$lib/model/ModelPlot.svelte';
	import ModelInputs from '$lib/model/ModelInputs.svelte';

	import { inputs, pts, rows, forceRun } from '$lib/model/modelData';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Input from '$lib/components/ui/input/input.svelte';

	export let userpts = {};

	let patientID = 'a';

	async function setPatientData() {
		if (Object.keys($pts).includes(patientID)) {
			for (const [key, value] of Object.entries($pts[patientID])) {
				$inputs.ageCategory = $pts[patientID].ageCategory || 'Neonate';
				//birthdate
				$inputs.birthDateTime =
					new Date($pts[patientID].birthDateTime) || new Date().setMinutes(0, 0, 0);
				//Birthweight
				$inputs.birthWeight = $pts[patientID].birthWeight || 3.5;
				//Gestational age
				$inputs.gestationalAge_weeks = $pts[patientID].gestationalAge_weeks || 40;
				//RDS
				$inputs.RDS = $pts[patientID].RDS || 0;
				//MAS
				$inputs.MAS = $pts[patientID].MAS || 0;
				//LOWAPG
				$inputs.LOWAPG = $pts[patientID].LOWAPG || 0;
				//postSurgical
				$inputs.postSurgical = $pts[patientID].postSurgical || 0;
				//surgeryDate
				$inputs.surgeryDate =
					new Date($pts[patientID].surgeryDate).setMinutes(0, 0, 0) ||
					new Date().setMinutes(0, 0, 0);
				//surgeryDuration
				$inputs.surgeryDuration = $pts[patientID].surgeryDuration || 2;
				//surgerySteroids
				$inputs.surgerySteroids = $pts[patientID].surgerySteroids || 0;
				//surgeryWeight
				$inputs.surgeryWeight = $pts[patientID].weight || 3.5;
			}
			//Add in the measurements (need to update the store also)
			$inputs.measurements = $pts[patientID].measurements || [];

			//run the model
			//$forceRun = true;
		} else {
			console.log('no pt with that nhi');
		}
	}

	function savePtData() {
		//save/insert the pt data into the database
		$pts[patientID] = {
			ageCategory: $inputs.ageCategory,
			birthDateTime: $inputs.birthDateTime,
			birthWeight: $inputs.birthWeight,
			gestationalAge_weeks: $inputs.gestationalAge_weeks,
			RDS: $inputs.RDS,
			MAS: $inputs.MAS,
			LOWAPG: $inputs.LOWAPG,
			postSurgical: $inputs.postSurgical,
			surgeryDate: $inputs.surgeryDate,
			surgeryDuration: $inputs.surgeryDuration,
			surgerySteroids: $inputs.surgerySteroids,
			weight: $inputs.weight,
			measurements: $inputs.measurements
		};
	}

	$: runfromstoreupdate($inputs);
	function runfromstoreupdate(inputs) {
		console.log('doing stuff in here');
	}
</script>

<ModelInputs>
	<div slot="PtID">
		<Label>Patient NHI</Label>
		<div class="flex items-center space-x-2">
			<Input type="text" bind:value={patientID} />

			<Button on:click={setPatientData}>Load patient data</Button>
		</div>
	</div>
</ModelInputs>
<Button on:click={savePtData}>Save data for this patient</Button>
<ModelPlot />
