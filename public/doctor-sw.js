// Doctor app service worker: makes the app installable, shows a friendly
// message when the phone is offline, and shows booking alerts.
// Appointment data always comes live from the server, never from a cache.
const OFFLINE = '<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><body style="font-family:system-ui;padding:40px 24px;text-align:center;color:#10292B;background:#F3F6F4"><h2>No internet connection</h2><p>Connect to Wi-Fi or mobile data and open the app again.</p></body>';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html' } })));
});

// New booking alert: notification + number on the app icon.
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: 'New booking', body: e.data && e.data.text() }; }
  const jobs = [self.registration.showNotification(d.title || 'New booking', {
    body: d.body || 'Open the app to see it.',
    icon: '/icons/doctor-192.png',
    badge: '/icons/doctor-badge-96.png',
    tag: d.test ? 'test' : 'booking-' + Date.now(),
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: '/doctor' },
  })];
  if (d.pending > 0 && self.navigator && 'setAppBadge' in self.navigator) jobs.push(self.navigator.setAppBadge(d.pending).catch(() => {}));
  e.waitUntil(Promise.all(jobs));
});

// Tapping the alert opens (or brings forward) the doctor app.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.includes('/doctor') && 'focus' in c) return c.focus();
    return self.clients.openWindow('/doctor');
  }));
});
