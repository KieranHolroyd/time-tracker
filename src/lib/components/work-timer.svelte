<script lang="ts">
	import { AnimatePresence, motion } from '@humanspeak/svelte-motion';
	import CircleStopIcon from '@lucide/svelte/icons/circle-stop';
	import PlayIcon from '@lucide/svelte/icons/play';
	import TimerIcon from '@lucide/svelte/icons/timer';
	import type { WorkTimer } from '$lib/hooks/work-timer.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { smooth, tapPress } from '$lib/motion';

	type Props = {
		timer: WorkTimer;
		projectId: number | null;
		projectName: string | null;
		canStart: boolean;
	};

	let { timer, projectId, projectName, canStart }: Props = $props();
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
				Checks in every 15 min with a 30s browser notification.
			</p>
		</div>
	{/if}

	{#if timer.error}
		<p class="work-timer__error">{timer.error}</p>
	{/if}

	{#if timer.permission === 'denied'}
		<p class="work-timer__hint work-timer__hint--warn">
			Notifications blocked — enable them to keep the timer running past check-ins.
		</p>
	{/if}
</div>
