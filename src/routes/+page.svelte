<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { AnimatePresence, motion } from '@humanspeak/svelte-motion';
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
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { formatDate, formatHours } from '$lib/format';
	import { cardEnter, fadeIn, slideInRight, smooth, spring, stagger } from '$lib/motion';

	let { data, form } = $props();

	let justLogged = $state(false);
	let logging = $state(false);
	let createOpen = $state(false);
	let logOptionsOpen = $state(false);

	$effect(() => {
		if (form?.ok && form.action === 'addHour') {
			justLogged = true;
			const timer = setTimeout(() => (justLogged = false), 1200);
			return () => clearTimeout(timer);
		}
	});

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

	const stats = $derived([
		{ label: 'Today', value: data.summary.today, accent: true },
		{ label: 'Week', value: data.summary.week, accent: false },
		{ label: 'Total', value: data.summary.total, accent: false }
	]);

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

	const editProjectError = $derived(
		form?.action === 'updateProject' ? (form.message as string | undefined) : undefined
	);

	const addHourError = $derived(
		form?.action === 'addHour' ? (form.message as string | undefined) : undefined
	);
</script>

{#if data.needsProfile}
	<ProfileSelector profiles={data.profiles} errorMessage={createProfileError} />
{:else if data.activeProfileId}
	<Sidebar.Provider style="--sidebar-width: 15rem;" class="h-svh overflow-hidden">
		<ProjectSidebar
			projects={data.projects}
			selectedProjectId={data.selectedProjectId}
			showAll={data.showAll}
			overall={data.overall}
			bind:createOpen
			errorMessage={createError}
			editErrorMessage={editProjectError}
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

				<AnimatePresence mode="wait" initial={false}>
					<motion.div
						key={panelKey}
						class="flex min-w-0 items-center gap-2.5"
						{...slideInRight}
						transition={smooth}
					>
						<AnimatePresence mode="wait" initial={false}>
							{#if selectedProject}
								<motion.span
									key={selectedProject.id}
									class="size-2.5 shrink-0 rounded-full ring-2 ring-(--dot)/25"
									style={`--dot: ${selectedProject.color}; background: ${selectedProject.color}`}
									initial={{ opacity: 0, scale: 0 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0 }}
									transition={spring}
								></motion.span>
							{:else if data.showAll}
								<motion.span
									key="all"
									class="shrink-0 text-muted-foreground"
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.8 }}
									transition={spring}
								>
									<LayersIcon class="size-4" />
								</motion.span>
							{/if}
						</AnimatePresence>

						<div class="grid min-w-0 gap-0.5">
							<h1
								class="font-display truncate text-lg leading-none font-semibold tracking-[-0.02em]"
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
				</AnimatePresence>

				<div class="ml-auto flex items-center">
					<AnimatePresence mode="wait" initial={false}>
						<motion.div key={panelKey} class="stat-strip" {...fadeIn} transition={smooth}>
							{#each stats as stat, i (stat.label)}
								<motion.div
									class="stat-strip__cell {stat.label !== 'Today' ? 'hidden sm:grid' : ''}"
									initial={{ opacity: 0, y: 4 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ ...spring, delay: stagger(i, 0.04) }}
								>
									<span class="stat-strip__label">{stat.label}</span>
									<motion.span
										class="stat-strip__value {stat.accent ? 'text-primary' : ''}"
										key={stat.value}
										initial={{ opacity: 0.6, y: 2 }}
										animate={{ opacity: 1, y: 0 }}
										transition={smooth}
									>
										{formatHours(stat.value)}h
									</motion.span>
								</motion.div>
							{/each}
						</motion.div>
					</AnimatePresence>
				</div>
			</motion.header>

			<div class="min-h-0 flex-1 overflow-y-auto">
				<div class="mx-auto w-full max-w-3xl p-4 sm:p-6">
					<AnimatePresence mode="wait" initial={false}>
						<motion.div key={panelKey} class="grid gap-5" {...cardEnter} transition={smooth}>
							{#if data.projects.length === 0}
								<motion.div
									class="panel grid justify-items-center gap-3 px-6 py-10 text-center"
									initial={{ opacity: 0, y: 8, scale: 0.99 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									transition={{ ...spring, delay: 0.06 }}
								>
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
											Projects hold your hours and notes. Once you have one, logging time is a
											single click.
										</p>
									</MotionReveal>
									<MotionReveal index={3} hover>
										<Button onclick={() => (createOpen = true)}>
											<PlusIcon />
											New project
										</Button>
									</MotionReveal>
								</motion.div>
							{:else}
								<motion.div
									class="panel panel--accent p-5"
									style={`--panel-accent: ${selectedProject?.color ?? 'var(--brass)'}`}
									initial={{ opacity: 0, y: 6, scale: 0.995 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									transition={{ ...smooth, delay: 0.05 }}
								>
									<form
										method="POST"
										action="?/addHour{actionSuffix}"
										class="flex flex-col items-center gap-5 sm:flex-row sm:items-center"
										use:enhance={() => {
											logging = true;
											return async ({ result, update }) => {
												logging = false;
												await update();
												if (result.type === 'success') {
													justLogged = true;
													setTimeout(() => (justLogged = false), 1200);
													await invalidateAll();
												}
											};
										}}
									>
										<input type="hidden" name="projectId" value={data.selectedProjectId ?? ''} />

										<HourStamp
											pulse={justLogged}
											disabled={!data.selectedProjectId || logging}
										/>

										<div class="grid w-full min-w-0 flex-1 gap-3">
											<AnimatePresence mode="wait" initial={false}>
												{#if data.showAll}
													<motion.div
														key="all"
														class="grid gap-1"
														{...fadeIn}
														transition={smooth}
													>
														<span
															class="font-mono text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase"
														>
															No project selected
														</span>
														<p class="m-0 text-sm text-muted-foreground">
															Pick a project in the sidebar to log time.
														</p>
													</motion.div>
												{:else if selectedProject}
													<motion.div
														key={selectedProject.id}
														class="grid gap-1.5"
														initial={{ opacity: 0, x: 4 }}
														animate={{ opacity: 1, x: 0 }}
														exit={{ opacity: 0, x: -4 }}
														transition={smooth}
													>
														<span
															class="font-mono text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase"
														>
															Logging to
														</span>
														<span
															class="font-display truncate text-xl leading-none font-semibold tracking-[-0.02em]"
														>
															{selectedProject.name}
														</span>
														<div class="flex flex-wrap items-center gap-1.5">
															<span
																class="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[0.68rem] text-muted-foreground"
															>
																{formatDate(data.today)}
															</span>
															<span
																class="rounded-md px-1.5 py-0.5 font-mono text-[0.68rem] tabular-nums {selectedProject.today_hours >
																0
																	? 'bg-primary/12 text-primary'
																	: 'bg-muted/60 text-muted-foreground'}"
															>
																{formatHours(selectedProject.today_hours)}h today
															</span>
														</div>
													</motion.div>
												{/if}
											</AnimatePresence>

											<motion.div
												class="flex flex-wrap gap-2"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												transition={{ ...smooth, delay: 0.1 }}
											>
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={!data.selectedProjectId}
													onclick={() => (logOptionsOpen = true)}
												>
													<Settings2Icon />
													Custom entry
												</Button>
											</motion.div>

											<AnimatePresence initial={false}>
												{#if addHourError}
													<motion.div
														initial={{ opacity: 0, y: -4, height: 0 }}
														animate={{ opacity: 1, y: 0, height: 'auto' }}
														exit={{ opacity: 0, y: -4, height: 0 }}
														transition={smooth}
													>
														<Alert variant="destructive">
															<AlertDescription>{addHourError}</AlertDescription>
														</Alert>
													</motion.div>
												{/if}
											</AnimatePresence>
										</div>
									</form>
								</motion.div>

								{#if data.entries.length === 0}
									<motion.div
										class="grid justify-items-center gap-2 rounded-lg border border-dashed border-border/80 px-6 py-8 text-center"
										initial={{ opacity: 0, y: 4 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ ...smooth, delay: 0.12 }}
									>
										<span class="text-muted-foreground/70">
											<StampIcon class="size-5" />
										</span>
										<p class="m-0 text-sm font-medium">Nothing logged yet</p>
										<p class="m-0 text-sm text-muted-foreground">
											Hit the stamp to add your first hour.
										</p>
									</motion.div>
								{:else}
									<EntryList
										entries={data.entries}
										today={data.today}
										showProject={data.showAll}
										{actionSuffix}
									/>
								{/if}
							{/if}
						</motion.div>
					</AnimatePresence>
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
{/if}
