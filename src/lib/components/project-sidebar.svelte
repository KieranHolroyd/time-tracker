<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { AnimatePresence, motion } from '@humanspeak/svelte-motion';
	import ArchiveIcon from '@lucide/svelte/icons/archive';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ArchiveProjectDialog from '$lib/components/archive-project-dialog.svelte';
	import CreateProjectDialog from '$lib/components/create-project-dialog.svelte';
	import EditProjectDialog from '$lib/components/edit-project-dialog.svelte';
	import { PROJECT_COLORS } from '$lib/constants';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as ContextMenu from '$lib/components/ui/context-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { formatHours } from '$lib/format';
	import { fadeUp, slideIn, smooth, spring } from '$lib/motion';
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
	<Sidebar.Header class="gap-0.5 px-3 py-3 group-data-[collapsible=icon]:px-1.5">
		<motion.span
			class="font-display truncate text-xl leading-none font-bold tracking-[-0.03em] group-data-[collapsible=icon]:hidden"
			initial={{ opacity: 0, x: -6 }}
			animate={{ opacity: 1, x: 0 }}
			transition={smooth}
		>
			Hourmark
		</motion.span>
		<span
			class="font-mono text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase group-data-[collapsible=icon]:hidden"
		>
			Time ledger
		</span>
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
					<Sidebar.MenuItem>
						<Sidebar.MenuButton isActive={showAll} tooltipContent="All activity">
							{#snippet child({ props })}
								<a href="?project=all" data-sveltekit-noscroll {...props}>
									<LayersIcon class="text-muted-foreground" />
									<span class="flex-1 truncate">All activity</span>
									<span class="font-mono text-xs text-muted-foreground tabular-nums">
										{formatHours(overall.total)}h
									</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>

					<AnimatePresence>
						{#each projects as project (project.id)}
							<motion.div key={project.id} {...slideIn} transition={spring} layout class="w-full">
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
														<span
															class="size-2.5 shrink-0 rounded-full ring-2 ring-(--dot)/25"
															style:--dot={project.color}
															style:background={project.color}
														></span>
														<span class="flex-1 truncate">{project.name}</span>
														<span
															class="font-mono text-xs tabular-nums {project.today_hours > 0
																? 'text-primary'
																: 'text-muted-foreground'}"
														>
															{formatHours(project.total_hours)}h
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
												<ContextMenu.SubContent class="w-44">
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
																	class="size-3 shrink-0 rounded-full ring-1 ring-border"
																	style:background={swatch}
																></span>
																<span class="truncate font-mono text-xs">{swatch}</span>
																{#if project.color === swatch}
																	<span class="ml-auto text-xs text-muted-foreground">Current</span>
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
						{...fadeUp}
						transition={smooth}
					>
						<p class="mb-2 text-xs text-muted-foreground">No projects yet.</p>
						<Button size="sm" class="w-full" onclick={() => (createOpen = true)}>
							<PlusIcon />
							New project
						</Button>
					</motion.div>
				{/if}
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>

	<Sidebar.Footer class="group-data-[collapsible=icon]:hidden">
		<motion.div
			class="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border"
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ ...smooth, delay: 0.08 }}
		>
			<div class="grid gap-0.5 bg-sidebar px-2.5 py-2">
				<span class="font-mono text-[0.6rem] tracking-[0.12em] text-muted-foreground uppercase">
					Today
				</span>
				<span class="font-mono text-sm font-semibold text-primary tabular-nums">
					{formatHours(overall.today)}h
				</span>
			</div>
			<div class="grid gap-0.5 bg-sidebar px-2.5 py-2">
				<span class="font-mono text-[0.6rem] tracking-[0.12em] text-muted-foreground uppercase">
					Week
				</span>
				<span class="font-mono text-sm font-semibold tabular-nums">
					{formatHours(overall.week)}h
				</span>
			</div>
		</motion.div>
	</Sidebar.Footer>

	<Sidebar.Rail />
</Sidebar.Root>

<CreateProjectDialog bind:open={createOpen} {errorMessage} />
<EditProjectDialog
	bind:open={editOpen}
	project={editingProject}
	errorMessage={editErrorMessage}
/>
<ArchiveProjectDialog
	bind:open={archiveOpen}
	project={archivingProject}
	{selectedProjectId}
/>
