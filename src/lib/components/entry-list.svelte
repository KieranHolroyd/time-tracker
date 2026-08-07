<script lang="ts">
	import { AnimatePresence, motion } from '@humanspeak/svelte-motion';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import DeleteEntryDialog from '$lib/components/delete-entry-dialog.svelte';
	import EditEntryDialog from '$lib/components/edit-entry-dialog.svelte';
	import EarningsHint from '$lib/components/earnings-hint.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { billableAmount } from '$lib/earnings';
	import { dayLabel, formatDuration } from '$lib/format';
	import { fadeUpSubtle, listItem, smooth, spring, stagger, tapSubtle } from '$lib/motion';
	import type { TimeEntry } from '$lib/types';

	type Props = {
		entries: TimeEntry[];
		today: string;
		showProject?: boolean;
		actionSuffix?: string;
		editErrorMessage?: string;
		hourlyRate?: number | null;
		currency?: string;
	};

	let {
		entries,
		today,
		showProject = false,
		actionSuffix = '',
		editErrorMessage,
		hourlyRate = null,
		currency = 'GBP'
	}: Props = $props();

	let editOpen = $state(false);
	let deleteOpen = $state(false);
	let activeEntry = $state<TimeEntry | null>(null);

	type DayGroup = { date: string; total: number; items: TimeEntry[] };

	const groups = $derived.by(() => {
		const byDate = new Map<string, DayGroup>();
		for (const entry of entries) {
			let group = byDate.get(entry.worked_on);
			if (!group) {
				group = { date: entry.worked_on, total: 0, items: [] };
				byDate.set(entry.worked_on, group);
			}
			group.total += entry.hours;
			group.items.push(entry);
		}
		return [...byDate.values()];
	});

	function isToday(date: string) {
		return date === today;
	}

	function openEdit(entry: TimeEntry) {
		activeEntry = entry;
		editOpen = true;
	}

	function openDelete(entry: TimeEntry) {
		activeEntry = entry;
		deleteOpen = true;
	}

	$effect(() => {
		if (editErrorMessage && activeEntry) {
			editOpen = true;
		}
	});
</script>

<div class="grid gap-4">
	<AnimatePresence>
		{#each groups as group, groupIndex (group.date)}
			<motion.section
				key={group.date}
				{...fadeUpSubtle}
				transition={{ ...smooth, delay: stagger(groupIndex, 0.04) }}
				layout
			>
				<motion.div
					class="sticky top-0 z-10 mb-1.5 flex items-center gap-3 bg-background/80 py-1.5 backdrop-blur-md"
					initial={{ opacity: 0, x: -4 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ ...smooth, delay: stagger(groupIndex, 0.04) + 0.02 }}
				>
					<span
						class="font-mono text-[0.68rem] font-medium tracking-[0.16em] uppercase {isToday(
							group.date
						)
							? 'text-primary'
							: 'text-muted-foreground'}"
					>
						{dayLabel(group.date, today)}
					</span>
					<span class="h-px flex-1 bg-border"></span>
					<motion.span
						class="font-mono text-xs text-muted-foreground tabular-nums"
						key={group.total}
						initial={{ opacity: 0.5, y: 2 }}
						animate={{ opacity: 1, y: 0 }}
						transition={smooth}
					>
						{formatDuration(group.total)}
						{#if billableAmount(group.total, hourlyRate) != null}
							<span class="text-muted-foreground/70">
								· <EarningsHint
									amount={billableAmount(group.total, hourlyRate)}
									{currency}
									class="text-[0.68rem]"
								/>
							</span>
						{/if}
					</motion.span>
				</motion.div>

				<ul class="panel m-0 list-none overflow-hidden p-0">
					<AnimatePresence>
						{#each group.items as entry, entryIndex (entry.id)}
							<motion.li
								key={entry.id}
								{...listItem}
								transition={{
									...spring,
									delay: stagger(groupIndex * 3 + entryIndex, 0.025)
								}}
								layout
								whileHover={{ backgroundColor: 'oklch(0.93 0.02 85 / 3.5%)' }}
								class="group/entry relative flex items-center gap-3 border-b border-border/50 py-2.5 pr-2 pl-3.5 last:border-b-0"
							>
								<span
									class="absolute inset-y-1.5 left-0 w-[3px] rounded-full opacity-70 transition-opacity group-hover/entry:opacity-100"
									style={`background: ${entry.project_color}`}
									aria-hidden="true"
								></span>

								<motion.span
									class="shrink-0 rounded-md bg-primary/10 px-1.5 py-1 text-center font-mono text-sm leading-none font-semibold text-primary tabular-nums"
									initial={{ opacity: 0, scale: 0.95 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ ...spring, delay: stagger(entryIndex, 0.02) }}
								>
									<span class="grid gap-0.5">
										<span>{formatDuration(entry.hours)}</span>
										{#if billableAmount(entry.hours, hourlyRate) != null}
											<EarningsHint
												amount={billableAmount(entry.hours, hourlyRate)}
												{currency}
												class="text-[0.62rem] font-medium text-primary/75"
											/>
										{/if}
									</span>
								</motion.span>

								<div class="grid min-w-0 flex-1 gap-0.5">
									{#if showProject}
										<span
											class="truncate text-[0.7rem] font-medium tracking-wide text-muted-foreground"
										>
											{entry.project_name}
										</span>
									{/if}

									{#if entry.comment}
										<p class="m-0 text-sm leading-snug whitespace-pre-wrap text-foreground/85">
											{entry.comment}
										</p>
									{:else if !showProject}
										<p class="m-0 text-sm text-muted-foreground/50 italic">No note</p>
									{/if}
								</div>

								<motion.div
									class="flex shrink-0 gap-0.5 opacity-100 sm:opacity-0 sm:group-hover/entry:opacity-100 sm:group-focus-within/entry:opacity-100"
									initial={{ opacity: 0, x: 4 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ ...smooth, delay: 0.08 }}
								>
									<motion.div whileTap={tapSubtle}>
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											title="Edit entry"
											onclick={() => openEdit(entry)}
										>
											<PencilIcon />
											<span class="sr-only">Edit entry</span>
										</Button>
									</motion.div>

									<motion.div whileTap={tapSubtle}>
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											title="Delete entry"
											class="hover:text-destructive"
											onclick={() => openDelete(entry)}
										>
											<Trash2Icon />
											<span class="sr-only">Delete entry</span>
										</Button>
									</motion.div>
								</motion.div>
							</motion.li>
						{/each}
					</AnimatePresence>
				</ul>
			</motion.section>
		{/each}
	</AnimatePresence>
</div>

<EditEntryDialog
	bind:open={editOpen}
	entry={activeEntry}
	{actionSuffix}
	errorMessage={editErrorMessage}
/>
<DeleteEntryDialog bind:open={deleteOpen} entry={activeEntry} {actionSuffix} />
