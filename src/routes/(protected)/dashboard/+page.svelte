<script>
	import Modelwithpatients from './Modelwithpatients.svelte';
	export let data;
</script>

<section class="container grid items-center gap-6">
	<div class="flex max-w-[980px] flex-col items-start gap-2">
		<h1 class="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
			Welcome {data.user.firstName}
		</h1>
		<p class="max-w-[700px] text-lg text-muted-foreground">
			You can run models for your patients by entering their NHI below and clicking on "Load". To
			save the data, click the "Save" button.
		</p>
	</div>
</section>
<div class="container grid items-center gap-6 grid-cols-1">
	<Modelwithpatients userpts={data.patients} />
</div>
