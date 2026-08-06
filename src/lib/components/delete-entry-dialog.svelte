<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { formatDateLong, formatHours } from '$lib/format';
	import type { TimeEntry } from '$lib/types';

	type Props = {
		open?: boolean;
		entry?: TimeEntry | null;
		actionSuffix?: string;
	};

	let { open = $bindable(false), entry = null, actionSuffix = '' }: Props = $props();
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete entry?</AlertDialog.Title>
			<AlertDialog.Description>
				{#if entry}
					This removes {formatHours(entry.hours)}h
					{#if entry.project_name}
						from {entry.project_name}
					{/if}
					on {formatDateLong(entry.worked_on)}. This cannot be undone.
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>

		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			{#if entry}
				<form
					method="POST"
					action="?/deleteEntry{actionSuffix}"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success') {
								open = false;
								await invalidateAll();
							}
						};
					}}
				>
					<input type="hidden" name="id" value={entry.id} />
					<AlertDialog.Action type="submit" class="bg-destructive text-white hover:bg-destructive/90">
						Delete
					</AlertDialog.Action>
				</form>
			{/if}
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
