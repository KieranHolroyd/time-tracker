<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { motion } from '@humanspeak/svelte-motion';
	import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Settings2Icon from '@lucide/svelte/icons/settings-2';
	import StampIcon from '@lucide/svelte/icons/stamp';
	import EntryList from '$lib/components/entry-list.svelte';
	import HourStamp from '$lib/components/hour-stamp.svelte';
	import LogOptionsDialog from '$lib/components/log-options-dialog.svelte';
	import MotionReveal from '$lib/components/motion-reveal.svelte';
	import ProfileSelector from '$lib/components/profile-selector.svelte';
	import ProjectSidebar from '$lib/components/project-sidebar.svelte';
	import SettingsDialog from '$lib/components/settings-dialog.svelte';
	import WorkTimerPanel from '$lib/components/work-timer.svelte';
	import EarningsHint from '$lib/components/earnings-hint.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { formatDate, formatDuration } from '$lib/format';
	import { buildEarningsSummary, hasBillableRate } from '$lib/earnings';
	import { WorkTimer } from '$lib/hooks/work-timer.svelte';
	import { smooth, spring } from '$lib/motion';

	let { data, form } = $props();

	let justLogged = $state(false);
	let logging = $state(false);
	let createOpen = $state(false);
	let logOptionsOpen = $state(false);
	let settingsOpen = $state(false);

	let pulseTimer: ReturnType<typeof setTimeout> | null = null;

	/** The stamp recoil is a CSS animation, so the class has to detach for a frame
	 *  before it will replay — otherwise a second log in quick succession is silent. */
	function triggerStampPulse() {
		if (pulseTimer) clearTimeout(pulseTimer);
		justLogged = false;
		requestAnimationFrame(() => {
			justLogged = true;
			pulseTimer = setTimeout(() => {
				justLogged = false;
				pulseTimer = null;
			}, 800);
		});
	}

	const selectedProject = $derived(
		data.projects.find((project) => project.id === data.selectedProjectId) ?? null
	);

	const panelKey = $derived(
		data.showAll ? 'all' : (data.selectedProjectId ?? 'none')
	);

	const actionSuffix = $derived(
		data.showAll
			? '&project=all'
			: data.selectedProjectId
				? `&project=${data.selectedProjectId}`
				: ''
	);

	const stats = $derived.by(() => {
		if (data.showAll || !selectedProject) return [];

		const earnings = buildEarningsSummary(data.summary, data.settings, data.today);
		return [
			{ label: 'Today', value: data.summary.today, earnings: earnings.today, accent: true },
			{ label: 'Week', value: data.summary.week, earnings: earnings.week, accent: false },
			{ label: 'Total', value: data.summary.total, earnings: earnings.total, accent: false }
		];
	});

	const showEarnings = $derived(hasBillableRate(data.settings));
	const showStats = $derived(stats.length > 0);

	const entryCountLabel = $derived(
		data.entries.length === 0
			? 'No entries'
			: `${data.entries.length} ${data.entries.length === 1 ? 'entry' : 'entries'}`
	);

	const createError = $derived(
		form?.action === 'createProject' ? (form.message as string | undefined) : undefined
	);

	const createProfileError = $derived(
		form?.action === 'createProfile' ? (form.message as string | undefined) : undefined
	);

	const editProfileError = $derived(
		form?.action === 'updateProfile' ? (form.message as string | undefined) : undefined
	);

	const claimProfileError = $derived(
		form?.action === 'claimProfile' ? (form.message as string | undefined) : undefined
	);

	const editProjectError = $derived(
		form?.action === 'updateProject' ? (form.message as string | undefined) : undefined
	);

	const addHourError = $derived(
		form?.action === 'addHour' ? (form.message as string | undefined) : undefined
	);

	const editEntryError = $derived(
		form?.action === 'updateEntry' ? (form.message as string | undefined) : undefined
	);

	const settingsError = $derived(
		form?.action === 'updateSettings' ? (form.message as string | undefined) : undefined
	);

	const workTimer = new WorkTimer({
		getProfileId: () => data.activeProfileId ?? 0,
		getToday: () => data.today,
		getActionSuffix: () => actionSuffix,
		onLogged: async () => {
			triggerStampPulse();
			await invalidateAll();
		}
	});

	$effect(() => {
		if (data.activeProfileId) {
			return workTimer.init(data.activeProfileId);
		}
	});

	const timerCanStart = $derived(Boolean(data.selectedProjectId && !data.showAll));
	const timerProjectId = $derived(
		workTimer.running && workTimer.snapshot
			? workTimer.snapshot.projectId
			: data.selectedProjectId
	);
	const timerProjectName = $derived(
		workTimer.running && workTimer.snapshot
			? workTimer.snapshot.projectName
			: (selectedProject?.name ?? null)
	);
</script>

{#if data.needsProfile}
	<ProfileSelector
		profiles={data.unclaimedProfiles}
		user={data.user!}
		createErrorMessage={createProfileError}
		claimErrorMessage={claimProfileError}
	/>
{:else if data.profile && data.user}
	<Sidebar.Provider style="--sidebar-width: 15rem;" class="h-svh overflow-hidden">
		<ProjectSidebar
			projects={data.projects}
			selectedProjectId={data.selectedProjectId}
			showAll={data.showAll}
			overall={data.overall}
			settings={data.settings}
			today={data.today}
			profile={data.profile}
			user={data.user}
			bind:createOpen
			bind:settingsOpen
			errorMessage={createError}
			editErrorMessage={editProjectError}
			profileErrorMessage={editProfileError}
		/>

		<Sidebar.Inset class="min-w-0 overflow-hidden bg-transparent">
			<motion.header
				class="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-background/80 px-3 backdrop-blur-xl"
				initial={{ opacity: 0, y: -4 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ ...smooth, delay: 0.04 }}
			>
				<motion.div
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ ...spring, delay: 0.06 }}
				>
					<Sidebar.Trigger class="-ml-1" />
				</motion.div>
				<Separator orientation="vertical" class="mr-1 !h-5" />

				{#key panelKey}
					<motion.div
						class="flex min-w-0 flex-1 items-center gap-2.5"
						initial={{ opacity: 0, x: 6 }}
						animate={{ opacity: 1, x: 0 }}
						transition={smooth}
					>
						{#if data.showAll}
							<span class="shrink-0 text-muted-foreground">
								<LayersIcon class="size-4" />
							</span>
						{/if}

						<div class="grid min-w-0 gap-0.5">
							<h1
								class="font-display truncate text-base leading-none font-semibold tracking-[-0.02em] sm:text-lg"
							>
								{data.showAll ? 'All activity' : (selectedProject?.name ?? 'Hourmark')}
							</h1>
							<span
								class="truncate font-mono text-[0.55rem] tracking-[0.14em] text-muted-foreground uppercase"
							>
								{entryCountLabel}
							</span>
						</div>
					</motion.div>
				{/key}

				{#if showStats}
					<div class="ml-auto flex shrink-0 items-center">
						<div class="stat-strip">
							{#each stats as stat (stat.label)}
								<div class="stat-strip__cell {stat.label !== 'Today' ? 'hidden sm:grid' : ''}">
									<span class="stat-strip__label">{stat.label}</span>
									<span class="stat-strip__value {stat.accent ? 'text-primary' : ''}">
										{#key stat.value}
											<span class="value-tick">{formatDuration(stat.value)}</span>
										{/key}
									</span>
									{#if showEarnings && stat.earnings != null}
										<span class="stat-strip__sub">
											{#key stat.earnings}
												<span class="value-tick">
													<EarningsHint
														amount={stat.earnings}
														currency={data.settings.currency}
													/>
												</span>
											{/key}
										</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</motion.header>

			<div class="min-h-0 flex-1 overflow-y-auto">
				<div class="mx-auto w-full max-w-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
					<div class="grid gap-5">
						{#if data.projects.length === 0}
							<div class="panel panel-enter grid justify-items-center gap-3 px-6 py-10 text-center">
								<MotionReveal index={0}>
									<span
										class="grid size-12 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20"
									>
										<FolderPlusIcon class="size-5" />
									</span>
								</MotionReveal>
								<MotionReveal index={1}>
									<h2 class="font-display m-0 text-xl tracking-[-0.02em]">
										Create your first project
									</h2>
								</MotionReveal>
								<MotionReveal index={2}>
									<p class="m-0 max-w-xs text-sm text-muted-foreground">
										Projects hold your hours and notes. Once you have one, logging time is a single
										click.
									</p>
								</MotionReveal>
								<MotionReveal index={3} hover>
									<Button onclick={() => (createOpen = true)}>
										<PlusIcon />
										New project
									</Button>
								</MotionReveal>
							</div>
						{:else}
							<!-- Deliberately not keyed or JS-animated: the log control must not depend
							     on an animation completing in order to be visible. -->
							<div
								class="panel panel--accent panel-enter p-4 sm:p-5"
								style={`--panel-accent: ${selectedProject?.color ?? 'var(--brass)'}; --enter-delay: 0.04s`}
							>
								<form
									method="POST"
									action="?/addHour{actionSuffix}"
									class="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5"
									use:enhance={() => {
										logging = true;
										return async ({ result, update }) => {
											logging = false;
											await update();
											if (result.type === 'success') {
												triggerStampPulse();
												await invalidateAll();
											}
										};
									}}
								>
									<input type="hidden" name="projectId" value={data.selectedProjectId ?? ''} />

									<HourStamp
										pulse={justLogged}
										disabled={!data.selectedProjectId || logging || workTimer.running}
									/>

									<div class="grid w-full min-w-0 flex-1 gap-3">
										{#if data.showAll}
											<div class="grid gap-1">
												<span
													class="font-mono text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase"
												>
													No project selected
												</span>
												<p class="m-0 text-sm text-muted-foreground">
													Pick a project in the sidebar to log time.
												</p>
											</div>
										{:else if selectedProject}
											<div class="flex flex-wrap items-center gap-2">
												<span
													class="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[0.68rem] text-muted-foreground"
												>
													{formatDate(data.today)}
												</span>
											</div>
										{/if}

										<div class="flex flex-wrap gap-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												class="h-9 w-full sm:h-7 sm:w-auto"
												disabled={!data.selectedProjectId || workTimer.running}
												onclick={() => (logOptionsOpen = true)}
											>
												<Settings2Icon />
												Custom entry
											</Button>
										</div>

										<WorkTimerPanel
											timer={workTimer}
											projectId={timerProjectId}
											projectName={timerProjectName}
											canStart={timerCanStart}
										/>

										{#if addHourError}
											<Alert variant="destructive">
												<AlertDescription>{addHourError}</AlertDescription>
											</Alert>
										{/if}
									</div>
								</form>
							</div>

							{#if data.entries.length === 0}
								<div
									class="panel-enter grid justify-items-center gap-2 rounded-lg border border-dashed border-border/80 px-6 py-8 text-center"
									style="--enter-delay: 0.1s"
								>
									<span class="text-muted-foreground/70">
										<StampIcon class="size-5" />
									</span>
									<p class="m-0 text-sm font-medium">Nothing logged yet</p>
									<p class="m-0 text-sm text-muted-foreground">
										Hit the stamp to add your first hour.
									</p>
								</div>
							{:else}
								<EntryList
									entries={data.entries}
									today={data.today}
									showProject={data.showAll}
									{actionSuffix}
									editErrorMessage={editEntryError}
									hourlyRate={data.settings.hourly_rate}
									currency={data.settings.currency}
								/>
							{/if}
						{/if}
					</div>
				</div>
			</div>
		</Sidebar.Inset>
	</Sidebar.Provider>

	<LogOptionsDialog
		bind:open={logOptionsOpen}
		projectId={data.selectedProjectId}
		projectName={selectedProject?.name}
		today={data.today}
		{actionSuffix}
		errorMessage={addHourError}
	/>

	<SettingsDialog
		bind:open={settingsOpen}
		settings={data.settings}
		summary={data.summary}
		overall={data.overall}
		today={data.today}
		errorMessage={settingsError}
	/>
{/if}
