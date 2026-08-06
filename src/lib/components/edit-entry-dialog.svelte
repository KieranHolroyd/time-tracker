<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { formatDateLong } from '$lib/format';
	import type { TimeEntry } from '$lib/types';

	type Props = {
		open?: boolean;
		entry?: TimeEntry | null;
		actionSuffix?: string;
	};

	let { open = $bindable(false), entry = null, actionSuffix = '' }: Props = $props();
	let submitting = $state(false);
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{entry?.comment ? 'Edit note' : 'Add note'}</Dialog.Title>
			<Dialog.Description>
				{#if entry}
					{entry.hours}h on {formatDateLong(entry.worked_on)}
					{#if entry.project_name}
						· {entry.project_name}
					{/if}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if entry}
			<form
				method="POST"
				action="?/updateComment{actionSuffix}"
				class="grid gap-3"
				use:enhance={() => {
					submitting = true;
					return async ({ result, update }) => {
						submitting = false;
						await update();
						if (result.type === 'success') {
							open = false;
							await invalidateAll();
						}
					};
				}}
			>
				<input type="hidden" name="id" value={entry.id} />
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

				<Dialog.Footer class="gap-2 sm:gap-0">
					<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
					<Button type="submit" disabled={submitting}>
						{submitting ? 'Saving…' : 'Save note'}
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
