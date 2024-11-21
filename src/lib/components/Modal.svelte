<script>
	// @ts-nocheck
	export let showModal = false; // boolean

	let dialog; // HTMLDialogElement

	$: {
		if (dialog) {
			if (showModal && !dialog.open) {
				dialog.showModal();
			} else if (!showModal && dialog.open) {
				dialog.close();
			}
		}
	}

	function handleClose() {
		showModal = false;
	}
</script>

<dialog
	class="rounded-lg border bg-card text-card-foreground shadow-sm z-50"
	style="width:90%;"
	bind:this={dialog}
	on:close={handleClose}
	on:click|self={() => dialog.close()}
>
	<div class="modalContents" on:click|stopPropagation>
		<slot />
	</div>
</dialog>

<style>
	dialog {
		width: 50%;
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
		width: 80%;
		display: flex;
		justify-content: center; /* Center horizontally */
		align-items: center; /* Center vertically */
		height: 100%; /* Take full height of the dialog */
		margin-top: 14px;
		flex-direction: column;
	}
</style>
