/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// Offline navigation fallback
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'raksha-navigation-cache',
    networkTimeoutSeconds: 3
  })
);
registerRoute(navigationRoute);

// Handle Web Push
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Raksha Emergency Notification';
    const options: any = {
      body: data.body || 'Alert update from Raksha',
      icon: '/icon-192.png',
      badge: '/favicon-32.png',
      tag: data.tag || 'raksha-alert',
      requireInteraction: data.requireInteraction ?? true,
      vibrate: data.vibrate || [200, 100, 200, 100, 400],
      data: data.data || { url: '/' },
      actions: data.actions || []
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    const fallbackText = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Raksha Alert', {
        body: fallbackText,
        icon: '/icon-192.png'
      })
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
