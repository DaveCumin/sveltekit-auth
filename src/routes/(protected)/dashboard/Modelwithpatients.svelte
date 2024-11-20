<script>
	// @ts-nocheck
	import { writable } from 'svelte/store';
	import ModelPlot from '$lib/model/ModelPlot.svelte';
	import ModelInputs from '$lib/model/ModelInputs.svelte';

	import { inputs, pts, rows } from '$lib/model/modelData';

	export let userpts = {};

	let patientID = 'a';

	async function setPatientData() {
		$rows = [{ TIME: 0, AMT: 2 / 24, RATE: 1, CMT: 1 }];
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
			//ADD in the measurements (need to update the store also)
			$inputs.measurements = $pts[patientID].measurements || [];
		} else {
			setPatientData();
		}
	}
</script>

<div class="container grid items-center gap-6">
	<input type="text" bind:value={patientID} on:change={setPatientData} />
	<ModelInputs />
	<ModelPlot />
</div>
