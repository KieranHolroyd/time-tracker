<script lang="ts">
	import { dev } from '$app/environment';
	import { AnimatePresence, motion } from '@humanspeak/svelte-motion';
	import CircleStopIcon from '@lucide/svelte/icons/circle-stop';
	import PlayIcon from '@lucide/svelte/icons/play';
	import TimerIcon from '@lucide/svelte/icons/timer';
	import type { WorkTimer } from '$lib/hooks/work-timer.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { TIMER_CHECK_INTERVAL_MS } from '$lib/constants';
	import { formatInterval } from '$lib/format';
	import { testNotification as runNotificationTest } from '$lib/notifications';
	import { smooth, tapPress } from '$lib/motion';

	type Props = {
		timer: WorkTimer;
		projectId: number | null;
		projectName: string | null;
		canStart: boolean;
	};

	let { timer, projectId, projectName, canStart }: Props = $props();

	let testStatus = $state<{ ok: boolean; message: string } | null>(null);
	let testing = $state(false);

	// Derived from the constants so the copy can't drift from the real schedule,
	// which matters most in development where the interval drops to seconds.
	const intervalLabel = formatInterval(TIMER_CHECK_INTERVAL_MS);

	async function testNotification() {
		testing = true;
		testStatus = null;
		try {
			testStatus = await runNotificationTest(projectName ?? 'your project');
		} finally {
			testing = false;
		}
	}
</script>

<div class="work-timer">
	{#if timer.running && timer.snapshot}
		<div class="work-timer__running">
			<div class="work-timer__status">
				<span class="work-timer__pulse" aria-hidden="true"></span>
				<div class="grid min-w-0 gap-0.5">
					<span class="work-timer__label">Tracking</span>
					<span class="work-timer__project truncate">{timer.snapshot.projectName}</span>
				</div>
				<span class="work-timer__elapsed" aria-live="polite">{timer.elapsedLabel}</span>
			</div>

			<AnimatePresence initial={false}>
				{#if timer.awaitingCheck}
					<motion.div
						class="work-timer__check"
						initial={{ opacity: 0, y: -4, height: 0 }}
						animate={{ opacity: 1, y: 0, height: 'auto' }}
						exit={{ opacity: 0, y: -4, height: 0 }}
						transition={smooth}
					>
						<p class="work-timer__check-text">
							Still there? Confirm within
							<span class="work-timer__check-countdown">{timer.checkSecondsLeft}s</span>
						</p>
						<motion.div class="w-full sm:w-auto" whileTap={tapPress}>
							<Button
								type="button"
								size="sm"
								class="h-9 w-full sm:h-7 sm:w-auto"
								onclick={() => timer.confirmPresence()}
							>
								I'm still here
							</Button>
						</motion.div>
					</motion.div>
				{/if}
			</AnimatePresence>

			<div class="work-timer__actions">
				<Button
					type="button"
					variant="outline"
					size="sm"
					class="h-9 w-full sm:h-7 sm:w-auto"
					disabled={timer.logging}
					onclick={() => timer.stopManual()}
				>
					<CircleStopIcon />
					{timer.logging ? 'Logging…' : 'Stop & log'}
				</Button>
			</div>
		</div>
	{:else}
		<div class="work-timer__idle">
			<Button
				type="button"
				variant="outline"
				size="sm"
				class="h-9 w-full sm:h-7 sm:w-auto"
				disabled={!canStart || !projectId || timer.logging}
				onclick={() => {
					if (projectId && projectName) {
						void timer.start(projectId, projectName);
					}
				}}
			>
				<PlayIcon />
				Start now
			</Button>
			<p class="work-timer__hint">
				<TimerIcon class="size-3.5 shrink-0" />
				Checks in every {intervalLabel}. Minimize or switch tabs to see the notification.
			</p>
			{#if dev}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-7 w-full text-xs"
					disabled={testing}
					onclick={() => void testNotification()}
				>
					{testing ? 'Sending…' : 'Test notification'}
				</Button>
				{#if testStatus}
					<p
						class="work-timer__hint m-0 {testStatus.ok
							? 'text-primary'
							: 'work-timer__hint--warn'}"
						aria-live="polite"
					>
						{testStatus.message}
					</p>
				{/if}
			{/if}
		</div>
	{/if}

	{#if timer.error}
		<p class="work-timer__error">{timer.error}</p>
	{/if}

	{#if timer.checksPaused}
		<p class="work-timer__hint work-timer__hint--warn">
			{timer.permission === 'denied'
				? 'Notifications blocked'
				: 'Notifications unavailable'} — check-ins only run while this page is open.
		</p>
	{/if}
</div>
