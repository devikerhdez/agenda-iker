/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

// Precache assets injected by Vite-PWA (replaces the old cache list)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data: { title: string; body: string } = { title: 'Recordatorio', body: '' };
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Recordatorio', body: event.data.text() };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    body: data.body,
    icon: '/assets/Logo_app_agenda.png',
    badge: '/assets/Logo_app_agenda.png',
    tag: 'recordatorio',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: '/' }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ─── Notification Click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url ?? '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) => c.url === url && 'focus' in c);
        if (existing) return (existing as WindowClient).focus();
        return self.clients.openWindow(url);
      })
  );
});
