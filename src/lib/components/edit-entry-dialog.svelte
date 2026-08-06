<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import DurationField from '$lib/components/duration-field.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { formatDateLong, hoursToParts } from '$lib/format';
	import type { TimeEntry } from '$lib/types';

	type Props = {
		open?: boolean;
		entry?: TimeEntry | null;
		actionSuffix?: string;
		errorMessage?: string;
	};

	let { open = $bindable(false), entry = null, actionSuffix = '', errorMessage }: Props = $props();
	let submitting = $state(false);
	let hours = $state(1);
	let minutes = $state(0);

	$effect(() => {
		if (open && entry) {
			const parts = hoursToParts(entry.hours);
			hours = parts.hours;
			minutes = parts.minutes;
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit entry</Dialog.Title>
			<Dialog.Description>
				{#if entry}
					Logged on {formatDateLong(entry.worked_on)}
					{#if entry.project_name}
						· {entry.project_name}
					{/if}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if entry}
			<form
				method="POST"
				action="?/updateEntry{actionSuffix}"
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
				<input type="hidden" name="id" value={entry.id} />

				<DurationField
					bind:hours
					bind:minutes
					hoursId="edit-entry-hours"
					minutesId="edit-entry-minutes"
				/>

				<div class="grid gap-1.5">
					<Label for="entry-comment">Note</Label>
					<Textarea
						id="entry-comment"
						name="comment"
						rows={3}
						placeholder="What did you work on?"
						value={entry.comment ?? ''}
					/>
				</div>

				{#if errorMessage}
					<p class="m-0 text-sm text-destructive">{errorMessage}</p>
				{/if}

				<Dialog.Footer class="gap-2 sm:gap-0">
					<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
					<Button type="submit" disabled={submitting}>
						{submitting ? 'Saving…' : 'Save changes'}
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
