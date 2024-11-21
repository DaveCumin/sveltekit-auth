<script lang="ts">
	import { base } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Command from '$lib/components/ui/command';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Sun, Moon, SunMoon, UserRound, LogOut } from 'lucide-svelte';
	import { setMode, resetMode } from 'mode-watcher';
	import { APP_NAME } from '$lib/config/constants';
	import Logo from '$lib/components/logo/logo.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import convertNameToInitials from '$lib/_helpers/convertNameToInitials';
	import Modal from '$lib/components/Modal.svelte';
	let showAbout = false;

	export let user: any;
	$: currentPage = $page.url.pathname;

	function signOut() {
		// Create a form element
		var form = document.createElement('form');
		form.method = 'POST';
		form.action = '/auth/sign-out';
		document.body.appendChild(form);
		form.submit();
	}

	let initials: string = '';
	$: {
		if (user) {
			initials = convertNameToInitials(user.firstName, user.lastName);
		}
	}
</script>

<header class="bg-background sticky top-0 z-40 w-full border-b">
	<div class="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
		<div class="flex gap-6 md:gap-10">
			<a class="flex items-center space-x-2" href="/">
				<img src={`${base}/favicon.png`} height="32" width="32" alt="PCT Sim" />
				<span class="inline-block font-bold">{APP_NAME}</span></a
			>
		</div>
		<div class="flex flex-1 items-center justify-end space-x-4">
			<nav class="flex items-center space-x-1">
				{#if !user}
					<Button on:click={() => goto('/auth/sign-in')}>Sign in</Button>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger asChild let:builder>
							<Button builders={[builder]} variant="ghost" size="icon">
								<Sun
									class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
								/>
								<Moon
									class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
								/>
								<span class="sr-only">Toggle theme</span>
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item on:click={() => setMode('light')}>Light</DropdownMenu.Item>
							<DropdownMenu.Item on:click={() => setMode('dark')}>Dark</DropdownMenu.Item>
							<DropdownMenu.Item on:click={() => resetMode()}>System</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{:else}
					<p class="mr-2" style="cursor: pointer;" on:click={() => (showAbout = true)}>About</p>
					<Button on:click={signOut}>Sign out</Button>
					<div class="mr-2"></div>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger asChild let:builder>
							<Button variant="ghost" builders={[builder]} class="relative h-8 w-8 rounded-full">
								<Avatar.Root class="h-8 w-8">
									<Avatar.Fallback>{initials}</Avatar.Fallback>
								</Avatar.Root>
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content class="w-56" align="end">
							<DropdownMenu.Label class="font-normal">
								<div class="flex flex-col space-y-1">
									<p class="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
									<p class="text-xs leading-none text-muted-foreground">{user?.email}</p>
								</div>
							</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.Group>
								<DropdownMenu.Item on:click={() => goto('/profile')}>
									<UserRound class="mr-2 h-4 w-4" />
									Profile
									<DropdownMenu.Shortcut></DropdownMenu.Shortcut>
								</DropdownMenu.Item>
							</DropdownMenu.Group>
							<DropdownMenu.Separator />
							<DropdownMenu.Item on:click={signOut}>
								<LogOut class="mr-2 h-4 w-4" />
								Sign out
								<DropdownMenu.Shortcut></DropdownMenu.Shortcut>
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger asChild let:builder>
							<Button builders={[builder]} variant="ghost" size="icon">
								<Sun
									class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
								/>
								<Moon
									class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
								/>
								<span class="sr-only">Toggle theme</span>
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item on:click={() => setMode('light')}>Light</DropdownMenu.Item>
							<DropdownMenu.Item on:click={() => setMode('dark')}>Dark</DropdownMenu.Item>
							<DropdownMenu.Item on:click={() => resetMode()}>System</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{/if}
			</nav>
		</div>
	</div>
</header>

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
	.active {
		@apply text-primary;
	}
</style>
