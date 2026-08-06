export type NotificationSupport = NotificationPermission | 'unsupported';

export function getNotificationSupport(): NotificationSupport {
	if (typeof window === 'undefined' || !('Notification' in window)) {
		return 'unsupported';
	}
	return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationSupport> {
	const support = getNotificationSupport();
	if (support === 'unsupported' || support === 'granted' || support === 'denied') {
		return support;
	}
	return Notification.requestPermission();
}

export function showPresenceNotification(
	projectName: string,
	onConfirm: () => void
): Notification | null {
	if (getNotificationSupport() !== 'granted') return null;

	const notification = new Notification('Still tracking?', {
		body: `Confirm you're still working on ${projectName}.`,
		tag: 'hourmark-presence-check',
		requireInteraction: true
	});

	notification.onclick = () => {
		onConfirm();
		notification.close();
		window.focus();
	};

	return notification;
}

export function closePresenceNotification(notification: Notification | null): void {
	notification?.close();
}
