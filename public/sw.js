/*
 * Leapio service worker: only for push notifications to parents.
 *
 * No fetch handler on purpose: the app keeps loading straight from the
 * network, exactly as before this file existed. The payload comes from the
 * edge function send-push-notifications: { title, body, url, tag }.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take open tabs under control, so a tap on a notification can steer them.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Leapio', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag,
      lang: 'nl-BE',
      data: { url: data.url || '/app' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Only ever open a page of Leapio itself.
  const target = new URL((event.notification.data && event.notification.data.url) || '/app', self.location.origin);
  const url = target.origin === self.location.origin ? target.href : self.location.origin + '/app';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        await client.focus();
        if ('navigate' in client) {
          try {
            await client.navigate(url);
            return;
          } catch {
            // Not controlled by this worker yet: open a fresh window instead.
          }
        }
        break;
      }
      await self.clients.openWindow(url);
    }),
  );
});
