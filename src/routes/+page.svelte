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

	<ModelInputs />
	<ModelPlot />
</div>
