<script lang="ts">
	// @ts-nocheck
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { APP_NAME } from '$lib/config/constants';
	import ModelPlot from '$lib/model/ModelPlot.svelte';
	import ModelInputs from '$lib/model/ModelInputs.svelte';
</script>

<svelte:head>
	<title>{APP_NAME}</title>
	<meta name="description" content="An app to run a PK model of Procalactin." />
</svelte:head>

<div class="container grid items-center gap-6">
	<div class="flex-1">
		<section class="flex gap-10">
			<div class="flex flex-col items-start gap-2">
				<h1 class="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
					{APP_NAME}
				</h1>
			</div>
		</section>
	</div>

	<div>
		<p class="max-w-[100%] text-lg text-muted-foreground">
			This tool provides predictions of procalcitonin (PCT) concentations in non-infected neonates,
			infants and adults. The user should enter patient factors to see predicted PCT concentrations
			in non-infected individuals. Observed PCT concentrations can be entered and will be plotted
			alongside the reference range. If observed PCT concentrations are outside the reference range
			the patient has a suspected infection. Definitions: Neonate: &lt; 30 days old, Infant: 1 month
			- 2 years of age, Child: 2 - 18 years old, Adult: &gt; 18 years old
		</p>
	</div>
	<div class="container grid items-center gap-6 grid-cols-1">
		<ModelInputs />
		<ModelPlot />
	</div>
</div>
