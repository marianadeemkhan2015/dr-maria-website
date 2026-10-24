// Doctor app service worker: makes the app installable and shows a friendly
// message when the phone is offline. Appointment data always comes live from
// the server, never from a cache.
const OFFLINE = '<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><body style="font-family:system-ui;padding:40px 24px;text-align:center;color:#10292B;background:#F3F6F4"><h2>No internet connection</h2><p>Connect to Wi-Fi or mobile data and open the app again.</p></body>';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html' } })));
});
