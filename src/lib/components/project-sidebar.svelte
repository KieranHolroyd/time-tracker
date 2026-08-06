<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { AnimatePresence, motion } from '@humanspeak/svelte-motion';
	import ArchiveIcon from '@lucide/svelte/icons/archive';
	import CheckIcon from '@lucide/svelte/icons/check';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ArchiveProjectDialog from '$lib/components/archive-project-dialog.svelte';
	import CreateProjectDialog from '$lib/components/create-project-dialog.svelte';
	import EditProjectDialog from '$lib/components/edit-project-dialog.svelte';
	import ExportDialog from '$lib/components/export-dialog.svelte';
	import StampIcon from '@lucide/svelte/icons/stamp';
	import { COLOR_NAMES, PROJECT_COLORS } from '$lib/constants';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as ContextMenu from '$lib/components/ui/context-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { formatDuration } from '$lib/format';
	import { fadeUpSubtle, hoverSubtle, slideIn, smooth, spring, stagger, tapSubtle } from '$lib/motion';
	import type { ProjectWithStats, Summary } from '$lib/types';

	type Props = {
		projects: ProjectWithStats[];
		selectedProjectId: number | null;
		showAll: boolean;
		overall: Summary;
		createOpen?: boolean;
		errorMessage?: string;
		editErrorMessage?: string;
	};

	let {
		projects,
		selectedProjectId,
		showAll,
		overall,
		createOpen = $bindable(false),
		errorMessage,
		editErrorMessage
	}: Props = $props();

	let editOpen = $state(false);
	let archiveOpen = $state(false);
	let exportOpen = $state(false);
	let editingProject = $state<ProjectWithStats | null>(null);
	let archivingProject = $state<ProjectWithStats | null>(null);

	function openEdit(project: ProjectWithStats) {
		editingProject = project;
		editOpen = true;
	}

	function openArchive(project: ProjectWithStats) {
		archivingProject = project;
		archiveOpen = true;
	}

	async function onProjectUpdated() {
		await invalidateAll();
	}
</script>

<Sidebar.Root collapsible="icon">
	<Sidebar.Header class="px-3 py-3.5 group-data-[collapsible=icon]:px-1.5">
		<motion.div
			class="flex items-center gap-2.5"
			initial={{ opacity: 0, x: -6 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ ...smooth, delay: 0.02 }}
		>
			<span
				class="grid size-7 shrink-0 place-items-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/25"
			>
				<StampIcon class="size-3.5" />
			</span>
			<div class="grid min-w-0 gap-0.5 group-data-[collapsible=icon]:hidden">
				<span
					class="font-display truncate text-lg leading-none font-bold tracking-[-0.03em]"
				>
					Hourmark
				</span>
				<span
					class="font-mono text-[0.55rem] tracking-[0.18em] text-muted-foreground uppercase"
				>
					Time ledger
				</span>
			</div>
		</motion.div>
	</Sidebar.Header>

	<Sidebar.Separator class="mx-0" />

	<Sidebar.Content class="gap-0">
		<Sidebar.Group class="py-2">
			<Sidebar.GroupLabel class="font-mono text-[0.65rem] tracking-[0.14em] uppercase">
				Projects
			</Sidebar.GroupLabel>
			<Sidebar.GroupAction title="New project" onclick={() => (createOpen = true)}>
				<PlusIcon />
				<span class="sr-only">New project</span>
			</Sidebar.GroupAction>

			<Sidebar.GroupContent class="mt-1">
				<Sidebar.Menu>
					<motion.div
						initial={{ opacity: 0, x: -4 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ ...smooth, delay: 0.04 }}
					>
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={showAll} tooltipContent="All activity">
								{#snippet child({ props })}
									<a href="?project=all" data-sveltekit-noscroll {...props}>
										<LayersIcon class="text-muted-foreground" />
										<span class="flex-1 truncate">All activity</span>
										<motion.span
											class="font-mono text-xs text-muted-foreground tabular-nums"
											key={overall.total}
											initial={{ opacity: 0.5 }}
											animate={{ opacity: 1 }}
											transition={smooth}
										>
											{formatDuration(overall.total)}
										</motion.span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					</motion.div>

					<AnimatePresence>
						{#each projects as project, i (project.id)}
							<motion.div
								key={project.id}
								{...slideIn}
								transition={{ ...spring, delay: stagger(i + 1, 0.03) }}
								layout
								class="w-full"
								whileHover={{ x: 2 }}
							>
								<Sidebar.MenuItem>
									<ContextMenu.Root>
										<ContextMenu.Trigger class="w-full">
											<Sidebar.MenuButton
												isActive={!showAll && project.id === selectedProjectId}
												tooltipContent={project.name}
												class="w-full"
											>
												{#snippet child({ props })}
													<a href="?project={project.id}" data-sveltekit-noscroll {...props}>
														<motion.span
															class="size-2.5 shrink-0 rounded-full ring-2 ring-(--dot)/25"
															style={`--dot: ${project.color}; background: ${project.color}`}
															animate={
																!showAll && project.id === selectedProjectId
																	? { scale: [1, 1.15, 1] }
																	: { scale: 1 }
															}
															transition={{ duration: 0.35, ease: 'easeOut' }}
														></motion.span>
														<span class="flex-1 truncate">{project.name}</span>
														<span
															class="font-mono text-xs tabular-nums {project.today_hours > 0
																? 'text-primary'
																: 'text-muted-foreground'}"
														>
															{formatDuration(project.total_hours)}
														</span>
													</a>
												{/snippet}
											</Sidebar.MenuButton>
										</ContextMenu.Trigger>

										<ContextMenu.Content class="w-48">
											<ContextMenu.Item onclick={() => openEdit(project)}>
												<PencilIcon />
												Edit name…
											</ContextMenu.Item>

											<ContextMenu.Sub>
												<ContextMenu.SubTrigger>
													<PaletteIcon />
													Change colour
												</ContextMenu.SubTrigger>
												<ContextMenu.SubContent class="w-40">
													{#each PROJECT_COLORS as swatch (swatch)}
														<form
															id="project-{project.id}-color-{swatch}"
															method="POST"
															action="?/updateProject"
															class="contents"
															use:enhance={() => {
																return async ({ result, update }) => {
																	if (result.type === 'success') {
																		await onProjectUpdated();
																		return;
																	}
																	await update();
																};
															}}
														>
															<input type="hidden" name="id" value={project.id} />
															<input type="hidden" name="name" value={project.name} />
															<input type="hidden" name="color" value={swatch} />
															<ContextMenu.Item
																class="gap-2"
																onSelect={(event) => {
																	event.preventDefault();
																	(
																		document.getElementById(
																			`project-${project.id}-color-${swatch}`
																		) as HTMLFormElement | null
																	)?.requestSubmit();
																}}
															>
																<span
																	class="size-3.5 shrink-0 rounded-full ring-1 ring-border"
																	style:background={swatch}
																></span>
																<span class="truncate text-xs">{COLOR_NAMES[swatch]}</span>
																{#if project.color === swatch}
																	<CheckIcon class="ml-auto size-3.5 text-muted-foreground" />
																{/if}
															</ContextMenu.Item>
														</form>
													{/each}
												</ContextMenu.SubContent>
											</ContextMenu.Sub>

											<ContextMenu.Separator />

											<ContextMenu.Item
												variant="destructive"
												onclick={() => openArchive(project)}
											>
												<ArchiveIcon />
												Archive project
											</ContextMenu.Item>
										</ContextMenu.Content>
									</ContextMenu.Root>
								</Sidebar.MenuItem>
							</motion.div>
						{/each}
					</AnimatePresence>
				</Sidebar.Menu>

				{#if projects.length === 0}
					<motion.div
						class="px-2 py-3 group-data-[collapsible=icon]:hidden"
						{...fadeUpSubtle}
						transition={{ ...smooth, delay: 0.1 }}
					>
						<p class="mb-2 text-xs text-muted-foreground">No projects yet.</p>
						<motion.div whileHover={hoverSubtle} whileTap={tapSubtle}>
							<Button size="sm" class="w-full" onclick={() => (createOpen = true)}>
								<PlusIcon />
								New project
							</Button>
						</motion.div>
					</motion.div>
				{/if}
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>

	<Sidebar.Footer class="gap-2.5 group-data-[collapsible=icon]:hidden">
		<motion.div
			class="grid grid-cols-2 overflow-hidden rounded-lg border border-border/80 bg-card/40"
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ ...smooth, delay: 0.1 }}
		>
			<div class="grid gap-0.5 border-r border-border/60 px-2.5 py-2">
				<span class="font-mono text-[0.55rem] tracking-[0.14em] text-muted-foreground uppercase">
					Today
				</span>
				<motion.span
					class="font-mono text-sm font-semibold text-primary tabular-nums"
					key={overall.today}
					initial={{ opacity: 0.6, y: 2 }}
					animate={{ opacity: 1, y: 0 }}
					transition={smooth}
				>
					{formatDuration(overall.today)}
				</motion.span>
			</div>
			<div class="grid gap-0.5 px-2.5 py-2">
				<span class="font-mono text-[0.55rem] tracking-[0.14em] text-muted-foreground uppercase">
					Week
				</span>
				<motion.span
					class="font-mono text-sm font-semibold tabular-nums"
					key={overall.week}
					initial={{ opacity: 0.6, y: 2 }}
					animate={{ opacity: 1, y: 0 }}
					transition={smooth}
				>
					{formatDuration(overall.week)}
				</motion.span>
			</div>
		</motion.div>

		<motion.div
			initial={{ opacity: 0, y: 4 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ ...smooth, delay: 0.14 }}
			whileHover={hoverSubtle}
			whileTap={tapSubtle}
		>
			<Button
				variant="ghost"
				size="sm"
				class="w-full justify-start gap-2 px-2 text-muted-foreground hover:text-foreground"
				onclick={() => (exportOpen = true)}
			>
				<DownloadIcon />
				Export notes
			</Button>
		</motion.div>

		<form method="POST" action="?/switchProfile" class="w-full">
			<Button type="submit" variant="ghost" size="sm" class="w-full text-muted-foreground">
				Switch user
			</Button>
		</form>
	</Sidebar.Footer>

	<Sidebar.Rail />
</Sidebar.Root>

<CreateProjectDialog bind:open={createOpen} {errorMessage} />
<EditProjectDialog bind:open={editOpen} project={editingProject} errorMessage={editErrorMessage} />
<ArchiveProjectDialog
	bind:open={archiveOpen}
	project={archivingProject}
	{selectedProjectId}
/>
<ExportDialog
	bind:open={exportOpen}
	{projects}
	{selectedProjectId}
	{showAll}
/>
