/*
 * Push-only service worker.
 * No asset caching to avoid stale frontend bundles after deploys.
 */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'Alltura EPP Control',
      body: event.data.text(),
    };
  }

  const title = payload.title || 'Alltura EPP Control';
  const options = {
    body: payload.body || 'Tienes una nueva notificacion.',
    icon: payload.icon || '/logo192.png',
    badge: payload.badge || '/logo192.png',
    data: payload.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetPath = event.notification.data?.url || '/notifications';
  const targetUrl = new URL(targetPath, self.location.origin).toString();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (typeof client.focus === 'function') {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
