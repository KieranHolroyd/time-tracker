export type NotificationSupport = NotificationPermission | 'unsupported';

export type NotificationResult = {
	ok: boolean;
	message: string;
};

type ShowOptions = {
	/** User just clicked — try the page constructor first while we still have a gesture. */
	preferPage?: boolean;
};

const SW_PATH = '/hourmark-sw.js';
const SW_READY_MS = 4_000;
const NOTIFICATION_ICON = '/favicon.ico';
const PRESENCE_TAG_PREFIX = 'hourmark-presence-';

let swRegistration: ServiceWorkerRegistration | null = null;
let swInit: Promise<ServiceWorkerRegistration | null> | null = null;
let pageNotification: Notification | null = null;
let presenceConfirmHandler: (() => void) | null = null;
let messageListenerAttached = false;

export function setPresenceConfirmHandler(handler: (() => void) | null): void {
	presenceConfirmHandler = handler;
}

export function getNotificationSupport(): NotificationSupport {
	if (typeof window === 'undefined' || !('Notification' in window)) {
		return 'unsupported';
	}
	return Notification.permission;
}

function attachMessageListener(): void {
	if (messageListenerAttached || typeof window === 'undefined') return;
	if (!('serviceWorker' in navigator)) return;

	messageListenerAttached = true;
	navigator.serviceWorker.addEventListener('message', (event) => {
		if (event.data?.type === 'hourmark-presence-confirm') {
			presenceConfirmHandler?.();
		}
	});
}

async function waitForActiveWorker(
	reg: ServiceWorkerRegistration,
	timeoutMs = SW_READY_MS
): Promise<ServiceWorkerRegistration | null> {
	if (reg.active) return reg;

	return Promise.race([
		new Promise<ServiceWorkerRegistration | null>((resolve) => {
			const worker = reg.installing ?? reg.waiting;
			if (!worker) {
				void navigator.serviceWorker.ready.then((ready) => resolve(ready)).catch(() => resolve(null));
				return;
			}

			const finish = () => resolve(reg.active ? reg : null);
			worker.addEventListener('statechange', () => {
				if (worker.state === 'activated') finish();
			});
			// Already activated between the read above and addEventListener.
			if (reg.active) finish();
		}),
		new Promise<ServiceWorkerRegistration | null>((resolve) => {
			setTimeout(() => resolve(reg.active ? reg : null), timeoutMs);
		})
	]);
}

/** Register the service worker so background tabs can still raise alerts. */
export async function ensureNotificationsReady(): Promise<ServiceWorkerRegistration | null> {
	if (typeof window === 'undefined' || !('Notification' in window)) return null;

	attachMessageListener();
	if (!('serviceWorker' in navigator)) return null;

	if (swRegistration?.active) return swRegistration;

	swInit ??= (async () => {
		try {
			const reg = await navigator.serviceWorker.register(SW_PATH, {
				scope: '/',
				updateViaCache: 'none'
			});
			await reg.update().catch(() => undefined);
			swRegistration = (await waitForActiveWorker(reg)) ?? reg;
			return swRegistration.active ? swRegistration : null;
		} catch {
			return null;
		} finally {
			swInit = null;
		}
	})();

	return swInit;
}

export async function requestNotificationPermission(): Promise<NotificationSupport> {
	if (!('Notification' in window)) return 'unsupported';

	const current = Notification.permission;
	if (current !== 'default') {
		if (current === 'granted') await ensureNotificationsReady();
		return current;
	}

	try {
		let settled = false;
		const result = await Promise.race([
			new Promise<NotificationPermission>((resolve) => {
				const finish = (value: NotificationPermission) => {
					if (settled) return;
					settled = true;
					resolve(value);
				};

				const returned = Notification.requestPermission(finish);
				if (returned && typeof returned.then === 'function') {
					returned.then(finish).catch(() => {
						const live = Notification.permission;
						finish(live);
					});
				}
			}),
			new Promise<NotificationPermission>((resolve) => {
				setTimeout(() => {
					if (settled) return;
					settled = true;
					resolve(Notification.permission);
				}, 15_000);
			})
		]);

		if (result === 'granted') await ensureNotificationsReady();
		return result;
	} catch {
		return getNotificationSupport();
	}
}

function wirePageNotification(notification: Notification): boolean {
	pageNotification = notification;
	notification.onclick = () => {
		window.focus();
		notification.close();
		pageNotification = null;
		presenceConfirmHandler?.();
	};
	return true;
}

function tryPageNotification(title: string, body: string, tag: string): boolean {
	try {
		return wirePageNotification(new Notification(title, { body, icon: NOTIFICATION_ICON, tag }));
	} catch {
		try {
			return wirePageNotification(new Notification(title, { body }));
		} catch {
			return false;
		}
	}
}

async function tryServiceWorkerNotification(
	title: string,
	body: string,
	tag: string,
	data: Record<string, unknown>
): Promise<boolean> {
	const reg = (await ensureNotificationsReady()) ?? swRegistration;
	if (!reg?.active) return false;

	try {
		await reg.showNotification(title, {
			body,
			icon: NOTIFICATION_ICON,
			tag,
			requireInteraction: true,
			data
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * Raise a presence check. Returns true when a system notification was shown —
 * false when only the in-app prompt can reach the user.
 */
export async function showPresenceNotification(
	projectName: string,
	options: ShowOptions = {}
): Promise<boolean> {
	if (getNotificationSupport() !== 'granted') return false;

	const title = 'Still tracking?';
	const body = `Confirm you're still working on ${projectName}.`;
	const tag = `${PRESENCE_TAG_PREFIX}${Date.now()}`;
	const data = { type: 'hourmark-presence-confirm', url: location.origin + '/' };

	await closePresenceNotifications();

	if (options.preferPage) {
		if (tryPageNotification(title, body, tag)) return true;
		return tryServiceWorkerNotification(title, body, tag, data);
	}

	if (await tryServiceWorkerNotification(title, body, tag, data)) return true;
	return tryPageNotification(title, body, tag);
}

/** Dev helper — always reports what happened instead of failing silently. */
export async function testNotification(projectName: string): Promise<NotificationResult> {
	if (!('Notification' in window)) {
		return { ok: false, message: 'This browser does not support notifications.' };
	}

	const permission = await requestNotificationPermission();
	if (permission === 'denied') {
		return {
			ok: false,
			message:
				'Notifications are blocked for this site. Allow them in your browser settings, then try again.'
		};
	}
	if (permission !== 'granted') {
		return { ok: false, message: 'Notification permission was not granted.' };
	}

	const shown = await showPresenceNotification(projectName, { preferPage: true });
	if (shown) {
		return {
			ok: true,
			message:
				'Notification sent. On macOS it may land in Notification Center rather than as a banner while this tab is focused.'
		};
	}

	return {
		ok: false,
		message: 'Permission is granted but the notification could not be shown. Check system notification settings for your browser.'
	};
}

export async function showTimeoutNotification(projectName: string, logged: string): Promise<void> {
	if (getNotificationSupport() !== 'granted') return;

	const title = 'Timer stopped';
	const body = `No response for ${projectName}. Logged ${logged}.`;
	const tag = `hourmark-timer-stopped-${Date.now()}`;
	const data = { type: 'hourmark-timer-stopped', url: location.origin + '/' };

	if (await tryServiceWorkerNotification(title, body, tag, data)) return;
	tryPageNotification(title, body, tag);
}

export async function closePresenceNotifications(): Promise<void> {
	pageNotification?.close();
	pageNotification = null;

	if (!swRegistration?.active) return;

	try {
		const notifications = await swRegistration.getNotifications();
		for (const notification of notifications) {
			if (notification.tag.startsWith(PRESENCE_TAG_PREFIX)) {
				notification.close();
			}
		}
	} catch {
		// Nothing to close.
	}
}

/** @deprecated Use closePresenceNotifications */
export function closePresenceNotification(notification: Notification | null): void {
	notification?.close();
}
