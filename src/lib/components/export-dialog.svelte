<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import LoaderIcon from '@lucide/svelte/icons/loader-circle';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import {
		RANGE_PRESETS,
		isReversedRange,
		resolveRange,
		type RangePresetId
	} from '$lib/date-range';
	import { formatDateMedium } from '$lib/format';
	import type { ProjectWithStats } from '$lib/types';

	type Props = {
		open?: boolean;
		projects: ProjectWithStats[];
		selectedProjectId: number | null;
		showAll: boolean;
		today: string;
	};

	let { open = $bindable(false), projects, selectedProjectId, showAll, today }: Props = $props();

	let preview = $state<string | null>(null);
	let previewError = $state<string | null>(null);
	let loading = $state(false);
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | null = null;

	let preset = $state<RangePresetId>('all');
	let customFrom = $state('');
	let customTo = $state('');

	const exportScope = $derived(showAll || !selectedProjectId ? 'all' : String(selectedProjectId));

	const scopeLabel = $derived(
		showAll || !selectedProjectId
			? 'All projects'
			: (projects.find((project) => project.id === selectedProjectId)?.name ?? 'Current project')
	);

	const presetLabel = $derived(
		RANGE_PRESETS.find((option) => option.id === preset)?.label ?? 'All time'
	);

	const range = $derived(
		preset === 'custom'
			? { from: customFrom || null, to: customTo || null }
			: resolveRange(preset, today)
	);

	const rangeError = $derived(
		isReversedRange(range) ? 'The start date must come before the end date.' : null
	);

	const rangeHint = $derived.by(() => {
		if (preset === 'all') return 'Every entry ever logged.';
		if (!range.from && !range.to) return 'Pick a start or end date to narrow the export.';
		if (range.from && range.to) {
			return `${formatDateMedium(range.from)} – ${formatDateMedium(range.to)}`;
		}
		return range.from
			? `${formatDateMedium(range.from)} onwards`
			: `Up to ${formatDateMedium(range.to!)}`;
	});

	const exportUrl = $derived.by(() => {
		const params = new URLSearchParams({ project: exportScope });
		if (range.from) params.set('from', range.from);
		if (range.to) params.set('to', range.to);
		return `/export?${params}`;
	});

	const lineCount = $derived(preview ? preview.trimEnd().split('\n').length : 0);

	// Seed the custom inputs from whichever preset was last chosen, so switching to
	// "Custom range" starts somewhere sensible instead of blank. Writes only —
	// reading the custom dates here would make this effect retrigger itself.
	$effect(() => {
		if (preset === 'custom') return;
		const resolved = resolveRange(preset, today);
		customFrom = resolved.from ?? '';
		customTo = resolved.to ?? '';
	});

	// The preview is fetched from the download endpoint rather than rebuilt on the
	// client, so what's shown here is exactly what the file will contain.
	$effect(() => {
		if (!open || rangeError) return;

		const url = exportUrl;
		const controller = new AbortController();

		loading = true;
		preview = null;
		previewError = null;

		// Typing into a date field emits several valid dates on the way to the one
		// the user means, so settle before hitting the server.
		const timer = setTimeout(() => {
			fetch(url, { signal: controller.signal })
				.then(async (response) => {
					if (!response.ok) throw new Error(`Could not build the preview (${response.status})`);
					return response.text();
				})
				.then((text) => {
					preview = text;
					loading = false;
				})
				.catch((error: unknown) => {
					if (controller.signal.aborted) return;
					previewError = error instanceof Error ? error.message : 'Could not build the preview';
					loading = false;
				});
		}, 200);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});

	async function copyPreview() {
		if (!preview) return;

		try {
			await navigator.clipboard.writeText(preview);
			copied = true;
			if (copyTimer) clearTimeout(copyTimer);
			copyTimer = setTimeout(() => {
				copied = false;
				copyTimer = null;
			}, 2000);
		} catch {
			previewError = 'Could not copy to the clipboard';
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Export report</Dialog.Title>
			<Dialog.Description>
				Totals by project, month and weekday for the chosen period, followed by every logged
				entry.
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4">
			<div class="grid gap-3 sm:grid-cols-2">
				<div class="grid gap-1.5">
					<Label>Scope</Label>
					<p class="m-0 flex h-9 items-center rounded-md border border-border/70 bg-muted/30 px-3 text-sm">
						{scopeLabel}
					</p>
				</div>

				<div class="grid gap-1.5">
					<Label for="export-range">Timespan</Label>
					<Select.Root type="single" bind:value={preset}>
						<Select.Trigger id="export-range" class="h-9 w-full">
							{presetLabel}
						</Select.Trigger>
						<Select.Content>
							{#each RANGE_PRESETS as option (option.id)}
								<Select.Item value={option.id}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			{#if preset === 'custom'}
				<div class="grid gap-3 sm:grid-cols-2">
					<div class="grid gap-1.5">
						<Label for="export-from">From</Label>
						<Input id="export-from" type="date" max={customTo || undefined} bind:value={customFrom} class="h-9" />
					</div>
					<div class="grid gap-1.5">
						<Label for="export-to">To</Label>
						<Input id="export-to" type="date" min={customFrom || undefined} bind:value={customTo} class="h-9" />
					</div>
				</div>
			{/if}

			<p
				class="m-0 text-xs {rangeError ? 'text-destructive' : 'text-muted-foreground'}"
				aria-live="polite"
			>
				{rangeError ?? rangeHint}
			</p>

			<div class="grid gap-1.5">
				<div class="flex items-center justify-between gap-2">
					<Label>Preview</Label>
					{#if preview && !rangeError}
						<div class="flex items-center gap-2">
							<span class="font-mono text-[0.62rem] text-muted-foreground tabular-nums">
								{lineCount} lines
							</span>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								class="h-7 gap-1.5 px-2 text-xs"
								onclick={copyPreview}
							>
								{#if copied}
									<CheckIcon class="size-3.5" />
									Copied
								{:else}
									<CopyIcon class="size-3.5" />
									Copy
								{/if}
							</Button>
						</div>
					{/if}
				</div>

				{#if rangeError}
					<div class="export-preview export-preview--status">
						Choose a valid range to see the report.
					</div>
				{:else if loading}
					<div class="export-preview export-preview--status">
						<LoaderIcon class="size-4 animate-spin" />
						Building preview…
					</div>
				{:else if previewError}
					<div class="export-preview export-preview--status export-preview--error">
						{previewError}
					</div>
				{:else if preview}
					<pre class="export-preview">{preview}</pre>
				{/if}
			</div>
		</div>

		<Dialog.Footer class="gap-2 sm:gap-0">
			<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
			{#if rangeError}
				<Button type="button" disabled>
					<DownloadIcon />
					Download .txt
				</Button>
			{:else}
				<Button href={exportUrl} download>
					<DownloadIcon />
					Download .txt
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
