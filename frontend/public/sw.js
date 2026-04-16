/*
 * Legacy service worker cleanup.
 *
 * The app now relies on Vite hashed assets and same-origin /api proxying.
 * Keeping this path allows already-registered clients to receive this script,
 * clear stale caches, and unregister old workers that can cause white screens.
 */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));

      await self.registration.unregister();

      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      await Promise.all(
        clients.map((client) => {
          if (typeof client.navigate === 'function') {
            return client.navigate(client.url);
          }
          return Promise.resolve();
        })
      );
    })()
  );
});
