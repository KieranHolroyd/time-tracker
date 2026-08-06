<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { AnimatePresence, motion } from '@humanspeak/svelte-motion';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Settings2Icon from '@lucide/svelte/icons/settings-2';
	import EntryList from '$lib/components/entry-list.svelte';
	import HourStamp from '$lib/components/hour-stamp.svelte';
	import LogOptionsDialog from '$lib/components/log-options-dialog.svelte';
	import ProjectSidebar from '$lib/components/project-sidebar.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { formatDate, formatHours } from '$lib/format';
	import { fadeUp, smooth } from '$lib/motion';

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

	const createError = $derived(
		form?.action === 'createProject' ? (form.message as string | undefined) : undefined
	);

	const editProjectError = $derived(
		form?.action === 'updateProject' ? (form.message as string | undefined) : undefined
	);

	const addHourError = $derived(
		form?.action === 'addHour' ? (form.message as string | undefined) : undefined
	);
</script>

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
		<header
			class="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-background/70 px-3 backdrop-blur-md"
		>
			<Sidebar.Trigger class="-ml-1" />
			<Separator orientation="vertical" class="mr-1 !h-5" />

			<AnimatePresence mode="wait" initial={false}>
				<motion.div
					key={panelKey}
					class="flex min-w-0 items-center gap-2"
					initial={{ opacity: 0, x: 8 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -8 }}
					transition={smooth}
				>
					{#if selectedProject}
						<span
							class="size-2.5 shrink-0 rounded-full ring-2 ring-(--dot)/25"
							style:--dot={selectedProject.color}
							style:background={selectedProject.color}
						></span>
					{/if}
					<h1 class="font-display truncate text-lg leading-none font-semibold tracking-[-0.02em]">
						{data.showAll ? 'All activity' : (selectedProject?.name ?? 'Hourmark')}
					</h1>
				</motion.div>
			</AnimatePresence>

			<div class="ml-auto flex items-center gap-1.5">
				{#each stats as stat, i (stat.label)}
					<motion.div
						class="rounded-md border border-border/70 bg-card/60 px-2 py-1 text-right {stat.label !==
						'Today'
							? 'hidden sm:block'
							: ''}"
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ ...smooth, delay: i * 0.04 }}
					>
						<div
							class="font-mono text-[0.55rem] tracking-[0.12em] text-muted-foreground uppercase"
						>
							{stat.label}
						</div>
						<div
							class="font-mono text-xs font-semibold tabular-nums {stat.accent
								? 'text-primary'
								: ''}"
						>
							{formatHours(stat.value)}h
						</div>
					</motion.div>
				{/each}
			</div>
		</header>

		<div class="min-h-0 flex-1 overflow-y-auto">
			<div class="mx-auto w-full max-w-3xl p-4 sm:p-6">
				<AnimatePresence mode="wait" initial={false}>
					<motion.div key={panelKey} class="grid gap-5" {...fadeUp} transition={smooth}>
						{#if data.projects.length === 0}
							<div
								class="grid gap-4 rounded-xl border border-border/80 bg-card/80 p-6 text-center shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
							>
								<h2 class="font-display m-0 text-xl tracking-[-0.02em]">
									Create your first project
								</h2>
								<p class="m-0 text-sm text-muted-foreground">
									Then logging an hour is a single click.
								</p>
								<Button class="mx-auto" onclick={() => (createOpen = true)}>
									<PlusIcon />
									New project
								</Button>
							</div>
						{:else}
							<div
								class="rounded-xl border border-border/80 bg-card/80 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
							>
								<form
									method="POST"
									action="?/addHour{actionSuffix}"
									class="flex flex-col items-center gap-4 sm:flex-row sm:items-start"
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

									<div class="grid w-full min-w-0 flex-1 gap-2.5">
										{#if data.showAll}
											<p class="m-0 text-sm text-muted-foreground">
												Pick a project in the sidebar to log time.
											</p>
										{:else if selectedProject}
											<div class="grid gap-0.5">
												<span
													class="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase"
												>
													Logging to
												</span>
												<span class="text-base font-semibold">{selectedProject.name}</span>
												<span class="text-sm text-muted-foreground">
													{formatDate(data.today)} · {formatHours(selectedProject.today_hours)}h
													today
												</span>
											</div>
										{/if}

										<div class="flex flex-wrap gap-2">
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
										</div>

										{#if addHourError}
											<Alert variant="destructive">
												<AlertDescription>{addHourError}</AlertDescription>
											</Alert>
										{/if}
									</div>
								</form>
							</div>

							{#if data.entries.length === 0}
								<motion.p
									class="px-1 text-sm text-muted-foreground"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: 0.1 }}
								>
									Nothing logged yet — hit the stamp to add your first hour.
								</motion.p>
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
