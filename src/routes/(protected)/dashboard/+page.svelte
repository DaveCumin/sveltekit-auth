<script>
	import Model from '$lib/model/Model.svelte';
	export let data;

	let modelProps = { birthweight: 5, gestationalAge_weeks: 40 };
</script>

<section class="container grid items-center gap-6">
	<div class="flex max-w-[980px] flex-col items-start gap-2">
		<h1 class="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
			Protected Area for {data.user.firstName}
		</h1>
		<p class="max-w-[700px] text-lg text-muted-foreground">
			If you are seeing this page, you are logged in.
		</p>
		<p>Testing data = {JSON.stringify(data.patients)}</p>
	</div>
</section>

<Model {...modelProps} />
