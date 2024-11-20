<script>
	// @ts-nocheck
	import { getFlash } from 'sveltekit-flash-message';
	import { page } from '$app/stores';

	import { createEventDispatcher } from 'svelte';
	import { formatDate } from './dateHelpers';

	export let thedatetime;
	export let label = 'Date and Time:';
	export let dateonly = false;
	export let minDate = '';
	export let maxDate = '';

	const flash = getFlash(page);
	let firstWarning = true;
	let picker;
	const dispatch = createEventDispatcher();

	function showpicker() {
		picker.showPicker();
		firstWarning = true;
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
		if (minutes !== '00' && firstWarning) {
			$flash = { type: 'error', message: 'Minutes cannot be entered; they will not be used.' };
			firstWarning = false;
		}
		// Format in "YYYY-MM-DDTHH:00" to maintain timezone and minutes as 00
		if (dateonly) {
			thedatetime = `${year}-${month}-${day}`;
		} else {
			thedatetime = `${year}-${month}-${day}T${hours}:00`;
		}
		// Dispatch the input event with the new value
		dispatch('input', { value: thedatetime });
	}
</script>

<div class="datetimeselect h-10">
	{#if label != ''}
		<!-- svelte-ignore a11y-label-has-associated-control -->
		<!-- svelte-ignore a11y-label-has-associated-control -->
		<label>{label}</label>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
	{/if}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<span
		on:click={showpicker}
		class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-foreground file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
		>{formatDate(new Date(thedatetime), dateonly)}</span
	>
	{#if dateonly}
		<input
			class="selection"
			bind:this={picker}
			type="date"
			min={minDate}
			max={maxDate}
			bind:value={thedatetime}
			on:input={handleInput}
		/>
	{:else}
		<input
			class="selection"
			bind:this={picker}
			type="datetime-local"
			min={minDate}
			max={maxDate}
			bind:value={thedatetime}
			on:input={handleInput}
		/>
	{/if}
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
</style>
