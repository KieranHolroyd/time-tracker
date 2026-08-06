<script lang="ts">
	import { AnimatePresence, motion } from '@humanspeak/svelte-motion';
	import MessageSquarePlusIcon from '@lucide/svelte/icons/message-square-plus';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import DeleteEntryDialog from '$lib/components/delete-entry-dialog.svelte';
	import EditEntryDialog from '$lib/components/edit-entry-dialog.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { dayLabel, formatHours } from '$lib/format';
	import { fadeUp, slideIn, smooth, spring } from '$lib/motion';
	import type { TimeEntry } from '$lib/types';

	type Props = {
		entries: TimeEntry[];
		today: string;
		showProject?: boolean;
		actionSuffix?: string;
	};

	let { entries, today, showProject = false, actionSuffix = '' }: Props = $props();

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

	function openEdit(entry: TimeEntry) {
		activeEntry = entry;
		editOpen = true;
	}

	function openDelete(entry: TimeEntry) {
		activeEntry = entry;
		deleteOpen = true;
	}
</script>

<div class="grid gap-4">
	<AnimatePresence>
		{#each groups as group (group.date)}
			<motion.section key={group.date} {...fadeUp} transition={smooth} layout>
				<div
					class="sticky top-0 z-10 mb-0.5 flex items-baseline justify-between gap-3 rounded-md bg-background/70 px-2 py-1 backdrop-blur-sm"
				>
					<span class="font-mono text-[0.68rem] tracking-[0.14em] text-muted-foreground uppercase">
						{dayLabel(group.date, today)}
					</span>
					<span class="font-mono text-xs text-muted-foreground tabular-nums">
						{formatHours(group.total)}h
					</span>
				</div>

				<ul class="m-0 list-none overflow-hidden rounded-lg border border-border/70 bg-card/50 p-0">
					<AnimatePresence>
						{#each group.items as entry (entry.id)}
							<motion.li
								key={entry.id}
								{...slideIn}
								transition={spring}
								layout
								class="group/entry flex items-start gap-3 border-b border-border/50 px-2.5 py-2 last:border-b-0"
							>
								<span
									class="w-9 shrink-0 pt-0.5 text-right font-mono text-sm font-semibold text-primary tabular-nums"
								>
									{formatHours(entry.hours)}h
								</span>

								<div class="min-w-0 flex-1">
									{#if showProject}
										<div class="flex items-center gap-1.5 text-sm font-medium">
											<span
												class="size-2 shrink-0 rounded-full"
												style:background={entry.project_color}
											></span>
											<span class="truncate">{entry.project_name}</span>
										</div>
									{/if}

									{#if entry.comment}
										<p class="m-0 text-sm leading-snug whitespace-pre-wrap text-foreground/80">
											{entry.comment}
										</p>
									{:else if !showProject}
										<p class="m-0 text-sm text-muted-foreground/60 italic">No note</p>
									{/if}
								</div>

								<div
									class="flex shrink-0 gap-0.5 opacity-100 transition-opacity focus-within:opacity-100 sm:opacity-0 sm:group-hover/entry:opacity-100"
								>
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										title={entry.comment ? 'Edit note' : 'Add note'}
										onclick={() => openEdit(entry)}
									>
										{#if entry.comment}
											<PencilIcon />
										{:else}
											<MessageSquarePlusIcon />
										{/if}
										<span class="sr-only">{entry.comment ? 'Edit note' : 'Add note'}</span>
									</Button>

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
								</div>
							</motion.li>
						{/each}
					</AnimatePresence>
				</ul>
			</motion.section>
		{/each}
	</AnimatePresence>
</div>

<EditEntryDialog bind:open={editOpen} entry={activeEntry} {actionSuffix} />
<DeleteEntryDialog bind:open={deleteOpen} entry={activeEntry} {actionSuffix} />
