self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();

	const data = event.notification.data ?? {};

	event.waitUntil(
		(async () => {
			const clients = await self.clients.matchAll({
				type: 'window',
				includeUncontrolled: true
			});

			for (const client of clients) {
				client.postMessage({ type: data.type ?? 'hourmark-presence-confirm' });
				await client.focus();
				return;
			}

			if (data.url) {
				await self.clients.openWindow(data.url);
			}
		})()
	);
});
