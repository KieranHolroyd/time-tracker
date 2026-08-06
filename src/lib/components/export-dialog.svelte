<script lang="ts">
	import DownloadIcon from '@lucide/svelte/icons/download';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import type { ProjectWithStats } from '$lib/types';

	type Props = {
		open?: boolean;
		projects: ProjectWithStats[];
		selectedProjectId: number | null;
		showAll: boolean;
	};

	let { open = $bindable(false), projects, selectedProjectId, showAll }: Props = $props();

	const exportScope = $derived(
		showAll || !selectedProjectId ? 'all' : String(selectedProjectId)
	);

	const scopeLabel = $derived(
		showAll || !selectedProjectId
			? 'All projects'
			: (projects.find((project) => project.id === selectedProjectId)?.name ?? 'Current project')
	);

	const exportUrl = $derived(`/export?project=${exportScope}`);
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Export notes</Dialog.Title>
			<Dialog.Description>
				Download a formatted text file of all notes from your time entries.
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4">
			<div class="grid gap-1.5">
				<Label>Scope</Label>
				<p class="m-0 rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-sm">
					{scopeLabel}
				</p>
			</div>

			<p class="m-0 text-sm text-muted-foreground">
				Notes are grouped by project and date, with hours included on each line.
			</p>
		</div>

		<Dialog.Footer class="gap-2 sm:gap-0">
			<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button href={exportUrl} download>
				<DownloadIcon />
				Download .txt
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
