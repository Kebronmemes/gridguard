self.addEventListener('push', (event) => {
  const data = event.data?.json() || {
    title: 'GridGuard Ethiopia',
    body: 'Power outage detected in your area.',
    icon: '/logo.png',
    url: '/map'
  };

  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'gridguard-alert',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/map'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
