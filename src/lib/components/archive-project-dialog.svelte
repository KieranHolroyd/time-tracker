<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { formatHours } from '$lib/format';
	import type { ProjectWithStats } from '$lib/types';

	type Props = {
		open?: boolean;
		project?: ProjectWithStats | null;
		selectedProjectId?: number | null;
	};

	let {
		open = $bindable(false),
		project = null,
		selectedProjectId = null
	}: Props = $props();
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Archive project?</AlertDialog.Title>
			<AlertDialog.Description>
				{#if project}
					<strong>{project.name}</strong> will be hidden from the sidebar. Its
					{formatHours(project.total_hours)}h of logged time stays in your history.
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>

		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			{#if project}
				<form
					method="POST"
					action="?/archiveProject"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success') {
								open = false;
								if (project && project.id === selectedProjectId) {
									await goto('?project=all', { noScroll: true, invalidateAll: true });
									return;
								}
								await invalidateAll();
							}
						};
					}}
				>
					<input type="hidden" name="id" value={project.id} />
					<AlertDialog.Action type="submit">Archive</AlertDialog.Action>
				</form>
			{/if}
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
