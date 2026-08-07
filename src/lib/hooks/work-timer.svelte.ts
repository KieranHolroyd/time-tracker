import { untrack } from 'svelte';
import { browser } from '$app/environment';
import { deserialize } from '$app/forms';
import {
	TIMER_CHECK_INTERVAL_MS,
	TIMER_CHECK_TIMEOUT_MS
} from '$lib/constants';
import { formatElapsed, msOnPresenceTimeout, msToLogParts } from '$lib/format';
import {
	closePresenceNotification,
	getNotificationSupport,
	requestNotificationPermission,
	showPresenceNotification,
	type NotificationSupport
} from '$lib/notifications';
import {
	clearTimerStorage,
	loadTimer,
	saveTimer,
	type StoredTimer
} from '$lib/timer-storage';

type WorkTimerOptions = {
	getProfileId: () => number;
	getToday: () => string;
	getActionSuffix: () => string;
	onLogged: () => Promise<void>;
};

export class WorkTimer {
	#snapshot = $state<StoredTimer | null>(null);
	#now = $state(Date.now());
	#permission = $state<NotificationSupport>('default');
	#error = $state<string | null>(null);
	#logging = $state(false);

	#tickId: ReturnType<typeof setInterval> | null = null;
	#checkId: ReturnType<typeof setTimeout> | null = null;
	#deadlineId: ReturnType<typeof setTimeout> | null = null;
	#activeNotification: Notification | null = null;

	#options: WorkTimerOptions;

	constructor(options: WorkTimerOptions) {
		this.#options = options;
	}

	get running() {
		return this.#snapshot !== null;
	}

	get snapshot() {
		return this.#snapshot;
	}

	get elapsedMs() {
		return this.#snapshot ? this.#now - this.#snapshot.startedAt : 0;
	}

	get elapsedLabel() {
		return formatElapsed(this.elapsedMs);
	}

	get awaitingCheck() {
		return this.#snapshot?.awaitingCheck ?? false;
	}

	get checkSecondsLeft() {
		if (!this.#snapshot?.checkDeadlineAt) return 0;
		return Math.max(0, Math.ceil((this.#snapshot.checkDeadlineAt - this.#now) / 1000));
	}

	get permission() {
		return this.#permission;
	}

	get error() {
		return this.#error;
	}

	get logging() {
		return this.#logging;
	}

	/**
	 * Callers are expected to run this from an `$effect`. Restoring a session both
	 * writes and reads `#snapshot`, so the setup is untracked to keep it from
	 * registering as a dependency of that effect and re-triggering itself.
	 */
	init(profileId: number) {
		if (!browser) return;

		return untrack(() => {
			this.#permission = getNotificationSupport();
			this.#restore(profileId);
			this.#tickId = setInterval(() => this.#onTick(), 1000);

			const onVisibility = () => {
				if (document.visibilityState === 'visible') {
					this.#onTick(true);
				}
			};
			document.addEventListener('visibilitychange', onVisibility);

			return () => {
				document.removeEventListener('visibilitychange', onVisibility);
				this.destroy();
			};
		});
	}

	destroy() {
		if (this.#tickId) clearInterval(this.#tickId);
		this.#clearScheduledChecks();
		closePresenceNotification(this.#activeNotification);
		this.#activeNotification = null;
	}

	async start(projectId: number, projectName: string) {
		this.#error = null;

		const permission = await requestNotificationPermission();
		this.#permission = permission;

		const startedAt = Date.now();
		this.#snapshot = {
			profileId: this.#options.getProfileId(),
			projectId,
			projectName,
			startedAt,
			nextCheckAt: startedAt + TIMER_CHECK_INTERVAL_MS,
			awaitingCheck: false,
			checkDeadlineAt: null
		};
		this.#persist();
		this.#scheduleNextCheck();
	}

	async stopManual() {
		if (!this.#snapshot) return;

		const ms = this.elapsedMs;
		await this.#finish(ms, 'Timer session');
	}

	confirmPresence() {
		if (!this.#snapshot?.awaitingCheck) return;

		this.#snapshot = {
			...this.#snapshot,
			awaitingCheck: false,
			checkDeadlineAt: null,
			nextCheckAt: Date.now() + TIMER_CHECK_INTERVAL_MS
		};
		this.#persist();
		closePresenceNotification(this.#activeNotification);
		this.#activeNotification = null;
		this.#clearDeadline();
		this.#scheduleNextCheck();
	}

	#restore(profileId: number) {
		const stored = loadTimer(profileId);
		if (!stored) return;

		this.#snapshot = stored;

		if (stored.awaitingCheck && stored.checkDeadlineAt) {
			const remaining = stored.checkDeadlineAt - Date.now();
			if (remaining <= 0) {
				void this.#handleTimeout();
				return;
			}

			this.#activeNotification = showPresenceNotification(
				stored.projectName,
				() => this.confirmPresence()
			);
			this.#deadlineId = setTimeout(() => this.#handleTimeout(), remaining);
		} else {
			this.#scheduleNextCheck();
		}

		this.#onTick(true);
	}

	#persist() {
		if (this.#snapshot) {
			saveTimer(this.#snapshot);
		} else {
			clearTimerStorage();
		}
	}

	#onTick(force = false) {
		this.#now = Date.now();
		if (!this.#snapshot) return;

		if (this.#snapshot.awaitingCheck && this.#snapshot.checkDeadlineAt) {
			if (this.#now >= this.#snapshot.checkDeadlineAt) {
				void this.#handleTimeout();
				return;
			}
		} else if (force || this.#now >= this.#snapshot.nextCheckAt) {
			if (!this.#snapshot.awaitingCheck && this.#now >= this.#snapshot.nextCheckAt) {
				this.#triggerCheck();
			}
		}
	}

	#scheduleNextCheck() {
		this.#clearScheduledChecks(false);

		if (!this.#snapshot || this.#snapshot.awaitingCheck) return;

		const delay = Math.max(0, this.#snapshot.nextCheckAt - Date.now());
		this.#checkId = setTimeout(() => this.#triggerCheck(), delay);
	}

	#triggerCheck() {
		if (!this.#snapshot || this.#snapshot.awaitingCheck) return;

		const deadline = Date.now() + TIMER_CHECK_TIMEOUT_MS;
		this.#snapshot = {
			...this.#snapshot,
			awaitingCheck: true,
			checkDeadlineAt: deadline
		};
		this.#persist();

		closePresenceNotification(this.#activeNotification);
		this.#activeNotification = showPresenceNotification(
			this.#snapshot.projectName,
			() => this.confirmPresence()
		);

		this.#deadlineId = setTimeout(() => this.#handleTimeout(), TIMER_CHECK_TIMEOUT_MS);
	}

	async #handleTimeout() {
		if (!this.#snapshot) return;

		const ms = msOnPresenceTimeout(this.#snapshot.startedAt);
		const projectName = this.#snapshot.projectName;
		await this.#finish(ms, `Timer session (no response)`);

		if (ms > 0) {
			this.#error = `Timer stopped — no response to the check-in for ${projectName}.`;
		}
	}

	async #finish(ms: number, comment: string) {
		if (!this.#snapshot) return;

		const { projectId } = this.#snapshot;
		this.#clearScheduledChecks();
		closePresenceNotification(this.#activeNotification);
		this.#activeNotification = null;
		this.#snapshot = null;
		this.#persist();

		if (ms <= 0) return;

		this.#logging = true;
		try {
			await this.#logDuration(projectId, ms, comment);
			await this.#options.onLogged();
		} catch (error) {
			this.#error = error instanceof Error ? error.message : 'Could not log timer session';
		} finally {
			this.#logging = false;
		}
	}

	async #logDuration(projectId: number, ms: number, comment: string) {
		const { hours, minutes } = msToLogParts(ms);
		const form = new FormData();
		form.set('projectId', String(projectId));
		form.set('durationHours', String(hours));
		form.set('durationMinutes', String(minutes));
		form.set('workedOn', this.#options.getToday());
		form.set('comment', comment);

		const response = await fetch(`?/addHour${this.#options.getActionSuffix()}`, {
			method: 'POST',
			body: form
		});

		const result = deserialize(await response.text());
		if (result.type === 'failure') {
			const data = result.data as { message?: string } | undefined;
			throw new Error(data?.message ?? 'Could not log timer session');
		}
		if (result.type === 'error') {
			throw new Error(result.error.message);
		}
	}

	#clearDeadline() {
		if (this.#deadlineId) clearTimeout(this.#deadlineId);
		this.#deadlineId = null;
	}

	#clearScheduledChecks(clearDeadline = true) {
		if (this.#checkId) clearTimeout(this.#checkId);
		this.#checkId = null;
		if (clearDeadline) this.#clearDeadline();
	}
}
