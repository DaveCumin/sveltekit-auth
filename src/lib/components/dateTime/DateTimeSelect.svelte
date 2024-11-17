<script>
	// @ts-nocheck
	import { createEventDispatcher } from 'svelte';
	import { formatDate } from './dateHelpers';

	export let thedatetime;
	export let label = 'Date and Time:';
	export let dateonly = false;

	let picker;
	const dispatch = createEventDispatcher();

	function showpicker() {
		picker.showPicker();
	}

	function handleInput(event) {
		// Get the selected datetime and set minutes to 00
		let selectedDate = new Date(event.target.value);

		// Format date to preserve timezone
		const year = selectedDate.getFullYear();
		const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
		const day = String(selectedDate.getDate()).padStart(2, '0');
		let hours = '00'; // Default to 00 hours if only the date
		if (!dateonly) {
			hours = String(selectedDate.getHours()).padStart(2, '0');
		}
		//Test for minutes - consider a warning here
		const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
		if (minutes !== '00') {
			console.log('Minutes cannot be entered');
		}
		// Format in "YYYY-MM-DDTHH:00" to maintain timezone and minutes as 00
		thedatetime = `${year}-${month}-${day}T${hours}:00`;
		// Dispatch the input event with the new value
		dispatch('input', { value: thedatetime });
	}
</script>

<div class="datetimeselect">
	<label>{label}</label>
	<span on:click={showpicker}>{formatDate(new Date(thedatetime), dateonly)}</span>
	{#if dateonly}
		<input
			bind:this={picker}
			class="selection"
			type="date"
			bind:value={thedatetime}
			on:input={handleInput}
		/>
	{:else}
		<input
			bind:this={picker}
			class="selection"
			type="datetime-local"
			bind:value={thedatetime}
			on:input={handleInput}
		/>
	{/if}
	<span class="icon" on:click={showpicker}>🗓️</span>
</div>

<style>
	.datetimeselect {
		cursor: pointer;
	}
	.selection {
		width: 0;
		height: 0;
		margin: 0px;
		padding: 0px;
		position: relative;
		left: 10px;
		z-index: 0;
	}
	.icon {
		position: relative;
		cursor: pointer;
	}
</style>
