<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	type Props = {
		open?: boolean;
		errorMessage?: string;
	};

	let { open = $bindable(false), errorMessage }: Props = $props();
	let submitting = $state(false);
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Add profile</Dialog.Title>
			<Dialog.Description>Create a profile so each person gets their own project list.</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/createProfile"
			class="grid gap-3"
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					submitting = false;
					if (result.type === 'success') {
						open = false;
						await invalidateAll();
						return;
					}
					await update();
				};
			}}
		>
			<div class="grid gap-1.5">
				<Label for="create-profile-name">Name</Label>
				<Input
					id="create-profile-name"
					name="name"
					placeholder="e.g. Alex"
					required
					class="h-9"
				/>
			</div>

			{#if errorMessage}
				<p class="m-0 text-sm text-destructive">{errorMessage}</p>
			{/if}

			<Dialog.Footer class="gap-2 sm:gap-0">
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={submitting}>
					{submitting ? 'Creating…' : 'Create profile'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
