import { untrack } from 'svelte';
import { browser } from '$app/environment';
import { deserialize } from '$app/forms';
import {
	TIMER_CHECK_INTERVAL_MS,
	TIMER_CHECK_RETRY_MS,
	TIMER_CHECK_TIMEOUT_MS
} from '$lib/constants';
import { formatDuration, formatElapsed, msOnPresenceTimeout, msToLogParts } from '$lib/format';
import {
	closePresenceNotifications,
	ensureNotificationsReady,
	getNotificationSupport,
	requestNotificationPermission,
	setPresenceConfirmHandler,
	showPresenceNotification,
	showTimeoutNotification,
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
	#notificationShown = false;
	#permissionStatus: PermissionStatus | null = null;
	#onPermissionChange = () => {
		this.#permission = getNotificationSupport();
	};

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

	/** True when check-ins are paused because nothing can reach the user. */
	get checksPaused() {
		return this.#permission === 'denied' || this.#permission === 'unsupported';
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
			void ensureNotificationsReady();
			setPresenceConfirmHandler(() => this.confirmPresence());
			this.#watchPermission();
			this.#restore(profileId);
			this.#tickId = setInterval(() => this.#onTick(), 1000);

			// Returning to the tab is the moment a deferred check can finally be
			// raised, and background tabs have their timers throttled, so re-evaluate.
			const onVisibility = () => {
				if (document.visibilityState === 'visible') {
					this.#onTick();
				} else if (this.#snapshot?.awaitingCheck && !this.#notificationShown) {
					void this.#raiseCheck();
				}
			};
			document.addEventListener('visibilitychange', onVisibility);

			return () => {
				document.removeEventListener('visibilitychange', onVisibility);
				setPresenceConfirmHandler(null);
				this.destroy();
			};
		});
	}

	destroy() {
		if (this.#tickId) clearInterval(this.#tickId);
		this.#clearScheduledChecks();
		void closePresenceNotifications();
		this.#notificationShown = false;
		this.#permissionStatus?.removeEventListener('change', this.#onPermissionChange);
		this.#permissionStatus = null;
	}

	async start(projectId: number, projectName: string) {
		this.#error = null;

		// Taken before the permission prompt, which can sit on screen for a while —
		// the clock should run from the moment the user pressed start.
		const startedAt = Date.now();

		this.#permission = await requestNotificationPermission();

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
		void closePresenceNotifications();
		this.#notificationShown = false;
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

			this.#deadlineId = setTimeout(() => void this.#handleTimeout(), remaining);
			void this.#raiseCheck();
		} else {
			this.#scheduleNextCheck();
		}

		this.#onTick();
	}

	/**
	 * Permission can be changed in browser settings while the page is open, which
	 * fires no Notification-level event. Without this the UI keeps warning about
	 * blocked notifications after the user has allowed them.
	 */
	#watchPermission() {
		if (!navigator.permissions?.query) return;

		navigator.permissions
			.query({ name: 'notifications' as PermissionName })
			.then((status) => {
				this.#permissionStatus = status;
				status.addEventListener('change', this.#onPermissionChange);
			})
			.catch(() => {
				// Firefox historically rejected this query; the polling in #raiseCheck
				// keeps the value fresh enough without it.
			});
	}

	#persist() {
		if (this.#snapshot) {
			saveTimer(this.#snapshot);
		} else {
			clearTimerStorage();
		}
	}

	/**
	 * Backstop for the scheduled timeouts, which browsers throttle heavily (or
	 * freeze outright) in background tabs. Comparing against wall-clock deadlines
	 * means a late tick still resolves to the right outcome.
	 */
	#onTick() {
		this.#now = Date.now();
		const snapshot = this.#snapshot;
		if (!snapshot) return;

		if (snapshot.awaitingCheck && snapshot.checkDeadlineAt) {
			if (this.#now >= snapshot.checkDeadlineAt) {
				void this.#handleTimeout();
			}
			return;
		}

		if (this.#now >= snapshot.nextCheckAt) {
			this.#triggerCheck();
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

		this.#clearScheduledChecks();
		void this.#beginCheck();
	}

	async #beginCheck() {
		if (!this.#snapshot || this.#snapshot.awaitingCheck) return;

		const delivered = await this.#raiseCheck();
		if (!this.#snapshot || this.#snapshot.awaitingCheck) return;

		if (!delivered) {
			// The alert went nowhere, so starting the countdown would discard the
			// user's session without them ever being asked. Defer and try again.
			this.#snapshot = {
				...this.#snapshot,
				nextCheckAt: Date.now() + TIMER_CHECK_RETRY_MS
			};
			this.#persist();
			this.#scheduleNextCheck();
			return;
		}

		this.#snapshot = {
			...this.#snapshot,
			awaitingCheck: true,
			checkDeadlineAt: Date.now() + TIMER_CHECK_TIMEOUT_MS
		};
		this.#persist();

		this.#deadlineId = setTimeout(() => void this.#handleTimeout(), TIMER_CHECK_TIMEOUT_MS);
	}

	/** Puts the check in front of the user. False when it could not be delivered. */
	async #raiseCheck(): Promise<boolean> {
		if (!this.#snapshot) return false;

		this.#permission = getNotificationSupport();
		const notificationShown = await showPresenceNotification(this.#snapshot.projectName);
		this.#notificationShown = notificationShown;

		// An on-screen page counts: the panel shows the same prompt and countdown,
		// so the user can answer even with notifications turned off.
		return notificationShown || document.visibilityState === 'visible';
	}

	async #handleTimeout() {
		if (!this.#snapshot) return;

		const ms = msOnPresenceTimeout(this.#snapshot.startedAt);
		const projectName = this.#snapshot.projectName;
		const { hours, minutes } = msToLogParts(ms);

		await this.#finish(ms, `Timer session (no response)`);

		if (ms > 0) {
			this.#error = `Timer stopped — no response to the check-in for ${projectName}.`;
			// They missed the check, so they are likely still away from the page.
			showTimeoutNotification(projectName, formatDuration(hours + minutes / 60));
		}
	}

	async #finish(ms: number, comment: string) {
		if (!this.#snapshot) return;

		const { projectId } = this.#snapshot;
		this.#clearScheduledChecks();
		void closePresenceNotifications();
		this.#notificationShown = false;
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
