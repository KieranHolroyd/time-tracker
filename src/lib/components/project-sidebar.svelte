<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import ArchiveIcon from '@lucide/svelte/icons/archive';
	import CheckIcon from '@lucide/svelte/icons/check';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';
	import StampIcon from '@lucide/svelte/icons/stamp';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import ArchiveProjectDialog from '$lib/components/archive-project-dialog.svelte';
	import CreateProjectDialog from '$lib/components/create-project-dialog.svelte';
	import EarningsHint from '$lib/components/earnings-hint.svelte';
	import EditProfileDialog from '$lib/components/edit-profile-dialog.svelte';
	import EditProjectDialog from '$lib/components/edit-project-dialog.svelte';
	import ExportDialog from '$lib/components/export-dialog.svelte';
	import ProfileAvatar from '$lib/components/profile-avatar.svelte';
	import { COLOR_NAMES, PROJECT_COLORS } from '$lib/constants';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as ContextMenu from '$lib/components/ui/context-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { formatDuration } from '$lib/format';
	import { buildOverallEarningsSummary, hasBillableRate } from '$lib/earnings';
	import type { SessionUser } from '$lib/auth/claims';
	import type { Profile, ProfileSettings, ProjectWithStats, Summary } from '$lib/types';

	type Props = {
		projects: ProjectWithStats[];
		selectedProjectId: number | null;
		showAll: boolean;
		overall: Summary;
		settings: ProfileSettings;
		today: string;
		profile: Profile;
		user: SessionUser;
		createOpen?: boolean;
		settingsOpen?: boolean;
		errorMessage?: string;
		editErrorMessage?: string;
		profileErrorMessage?: string;
	};

	let {
		projects,
		selectedProjectId,
		showAll,
		overall,
		settings,
		today,
		profile,
		user,
		createOpen = $bindable(false),
		settingsOpen = $bindable(false),
		errorMessage,
		editErrorMessage,
		profileErrorMessage
	}: Props = $props();

	let editProfileOpen = $state(false);
	let editOpen = $state(false);
	let archiveOpen = $state(false);
	let exportOpen = $state(false);
	let editingProject = $state<ProjectWithStats | null>(null);
	let archivingProject = $state<ProjectWithStats | null>(null);

	const overallEarnings = $derived(buildOverallEarningsSummary(overall, settings, today));
	const showEarnings = $derived(hasBillableRate(settings));

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

	function projectHoursLabel(project: ProjectWithStats): string {
		if (project.today_hours > 0) return formatDuration(project.today_hours);
		return formatDuration(project.total_hours);
	}
</script>

<Sidebar.Root collapsible="icon">
	<Sidebar.Header class="px-3 py-3 group-data-[collapsible=icon]:px-1.5">
		<div class="flex items-center gap-2.5">
			<span
				class="grid size-7 shrink-0 place-items-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/25"
			>
				<StampIcon class="size-3.5" />
			</span>
			<div class="grid min-w-0 gap-0.5 group-data-[collapsible=icon]:hidden">
				<span class="font-display truncate text-base leading-none font-bold tracking-[-0.03em]">
					Hourmark
				</span>
				<span
					class="font-mono text-[0.52rem] tracking-[0.16em] text-muted-foreground uppercase"
				>
					Time ledger
				</span>
			</div>
		</div>
	</Sidebar.Header>

	<Sidebar.Separator class="mx-0 opacity-60" />

	<Sidebar.Content class="gap-0 px-1">
		<Sidebar.Group class="py-1.5">
			<Sidebar.GroupLabel class="px-2 font-mono text-[0.62rem] tracking-[0.14em] uppercase">
				Projects
			</Sidebar.GroupLabel>
			<Sidebar.GroupAction title="New project" onclick={() => (createOpen = true)}>
				<PlusIcon />
				<span class="sr-only">New project</span>
			</Sidebar.GroupAction>

			<Sidebar.GroupContent>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton isActive={showAll} tooltipContent="All activity">
							{#snippet child({ props })}
								<a href="?project=all" data-sveltekit-noscroll {...props}>
									<LayersIcon class="opacity-70" />
									<span class="flex-1 truncate">All activity</span>
									<span class="sidebar-project-hours">{formatDuration(overall.total)}</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>

					{#each projects as project (project.id)}
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
													class="sidebar-project-dot"
													class:sidebar-project-dot--active={!showAll &&
														project.id === selectedProjectId}
													style={`--dot: ${project.color}`}
												></span>
												<span class="flex-1 truncate">{project.name}</span>
												<span
													class="sidebar-project-hours {project.today_hours > 0
														? 'sidebar-project-hours--today'
														: ''}"
													title={project.today_hours > 0
														? `${formatDuration(project.total_hours)} total`
														: undefined}
												>
													{#key projectHoursLabel(project)}
														<span class="value-tick">{projectHoursLabel(project)}</span>
													{/key}
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

									<ContextMenu.Item variant="destructive" onclick={() => openArchive(project)}>
										<ArchiveIcon />
										Archive project
									</ContextMenu.Item>
								</ContextMenu.Content>
							</ContextMenu.Root>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>

				{#if projects.length === 0}
					<div class="px-2 py-2.5 group-data-[collapsible=icon]:hidden">
						<p class="mb-2 text-xs text-muted-foreground">No projects yet.</p>
						<Button size="sm" class="h-8 w-full" onclick={() => (createOpen = true)}>
							<PlusIcon />
							New project
						</Button>
					</div>
				{/if}
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>

	<Sidebar.Footer class="sidebar-footer group-data-[collapsible=icon]:hidden">
		<div class="sidebar-footer__panel">
			<div class="sidebar-footer__stats">
				<div class="sidebar-footer__stat">
					<span class="sidebar-footer__stat-label">All today</span>
					<span class="sidebar-footer__stat-value sidebar-footer__stat-value--accent">
						{#key overall.today}
							<span class="value-tick">{formatDuration(overall.today)}</span>
						{/key}
					</span>
					{#if showEarnings && overallEarnings.today != null}
						<EarningsHint
							amount={overallEarnings.today}
							currency={settings.currency}
							class="text-[0.65rem] text-primary/75"
						/>
					{/if}
				</div>
				<div class="sidebar-footer__stat">
					<span class="sidebar-footer__stat-label">All week</span>
					<span class="sidebar-footer__stat-value">
						{#key overall.week}
							<span class="value-tick">{formatDuration(overall.week)}</span>
						{/key}
					</span>
					{#if showEarnings && overallEarnings.week != null}
						<EarningsHint
							amount={overallEarnings.week}
							currency={settings.currency}
							class="text-[0.65rem] text-muted-foreground"
						/>
					{/if}
				</div>
			</div>

			{#if showEarnings && overallEarnings.weekProgress}
				<div class="sidebar-footer__goal">
					<div class="sidebar-footer__goal-header">
						<span>Week goal</span>
						<span>{Math.round(overallEarnings.weekProgress.percent)}%</span>
					</div>
					<div class="settings-preview__progress-track">
						<div
							class="settings-preview__progress-fill"
							style={`width: ${overallEarnings.weekProgress.percent}%`}
						></div>
					</div>
				</div>
			{/if}

			<button
				type="button"
				class="sidebar-account"
				onclick={() => (editProfileOpen = true)}
				title="Edit your profile"
			>
				<ProfileAvatar {profile} size="sm" />
				<span class="sidebar-account__text">
					<span class="sidebar-account__name">{profile.name}</span>
					<span class="sidebar-account__meta">
						{user.username ?? user.name}{user.role ? ` · ${user.role}` : ''}
					</span>
				</span>
				<PencilIcon />
			</button>

			<div class="sidebar-footer__actions">
				<button type="button" class="sidebar-footer__action" onclick={() => (settingsOpen = true)}>
					<SlidersHorizontalIcon />
					Settings
				</button>
				<button type="button" class="sidebar-footer__action" onclick={() => (exportOpen = true)}>
					<DownloadIcon />
					Export notes
				</button>
				<!-- A plain POST to the endpoint, so signing out is not something a
				     stray link or a prefetch can do on the user's behalf. -->
				<form method="POST" action="/auth/logout">
					<button type="submit" class="sidebar-footer__action sidebar-footer__action--muted">
						<LogOutIcon />
						Sign out
					</button>
				</form>
			</div>
		</div>
	</Sidebar.Footer>

	<Sidebar.Rail />
</Sidebar.Root>

<EditProfileDialog bind:open={editProfileOpen} {profile} errorMessage={profileErrorMessage} />
<CreateProjectDialog bind:open={createOpen} {errorMessage} />
<EditProjectDialog bind:open={editOpen} project={editingProject} errorMessage={editErrorMessage} />
<ArchiveProjectDialog
	bind:open={archiveOpen}
	project={archivingProject}
	{selectedProjectId}
/>
<ExportDialog bind:open={exportOpen} {projects} {selectedProjectId} {showAll} {today} />
