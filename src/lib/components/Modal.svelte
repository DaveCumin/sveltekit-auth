<script>
	export let showModal; // boolean

	let dialog; // HTMLDialogElement

	$: if (dialog && showModal) dialog.showModal();
	$: if (dialog && !showModal) dialog.close();
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<dialog
	bind:this={dialog}
	on:close={() => (showModal = false)}
	on:click|self={() => dialog.close()}
>
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<button autofocus on:click={() => dialog.close()}>x</button>

	<div class="modalContents" on:click|stopPropagation>
		<slot />
	</div>
</dialog>

<style>
	dialog {
		max-width: 60%;
		border-radius: 0.5em;
		border: none;
		padding: 0;
	}
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
	}
	dialog > div {
		padding: 1em;
	}
	dialog[open] {
		animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes zoom {
		from {
			transform: scale(0.95);
		}
		to {
			transform: scale(1);
		}
	}
	dialog[open]::backdrop {
		animation: fade 0.2s ease-out;
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	button {
		position: absolute;
		top: 2px;
		right: 2px;
		padding: 0;
		margin: 2px;
		color: red;
		font-size: 20px;
		border: none;
		width: 25px;
		height: 25px;
	}
	button:hover {
		background: grey;
	}
	.modalContents {
		margin: 14px auto; /* Center horizontally */
		width: 90%;
		display: flex;
		justify-content: center; /* Center horizontally */
		align-items: center; /* Center vertically */
		height: 100%; /* Take full height of the dialog */
		margin-top: 14px;
		flex-direction: column;
	}
</style>
