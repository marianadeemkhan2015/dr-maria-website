'use client';
import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase';
import { VAPID_PUBLIC, keyBytes } from '@/lib/push';
import { useToast } from '../admin/Toast';

type State = 'checking' | 'unsupported' | 'install' | 'off' | 'on' | 'blocked';

const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);

/** Keeps the number on the app icon equal to the bookings still waiting for confirmation. */
export function useIconBadge(count: number) {
  useEffect(() => {
    const n = navigator as any;
    try {
      if (count > 0) n.setAppBadge?.(count)?.catch?.(() => {});
      else n.clearAppBadge?.()?.catch?.(() => {});
    } catch { /* not supported on this phone */ }
  }, [count]);
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration('/doctor')) || navigator.serviceWorker.register('/doctor-sw.js', { scope: '/doctor' });
}

export function useAlerts() {
  const db = browserClient();
  const toast = useToast();
  const [state, setState] = useState<State>('checking');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (isIOS() && !standalone()) return setState('install');
      if (!supported()) return setState('unsupported');
      if (Notification.permission === 'denied') return setState('blocked');
      const sub = await (await registration()).pushManager.getSubscription();
      if (sub && Notification.permission === 'granted') {
        await save(sub); // refresh the saved copy in case it changed
        setState('on');
      } else setState('off');
    })().catch(() => setState('unsupported'));
  }, []); // eslint-disable-line

  const save = async (sub: PushSubscription) => {
    const j = sub.toJSON() as any;
    const { error } = await db.from('push_subscriptions').upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' });
    if (error) throw error;
  };

  const turnOn = async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState(perm === 'denied' ? 'blocked' : 'off'); return; }
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) as any });
      await save(sub);
      setState('on');
      toast('Booking alerts are on for this phone');
    } catch (e: any) {
      toast('Could not turn on alerts: ' + (e?.message || 'try again'));
    } finally { setBusy(false); }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const sub = await (await registration()).pushManager.getSubscription();
      if (sub) { await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
      setState('off');
      toast('Booking alerts are off for this phone');
    } finally { setBusy(false); }
  };

  const test = async () => {
    setBusy(true);
    try {
      const sub = await (await registration()).pushManager.getSubscription();
      const { data } = await db.auth.getSession();
      if (!sub || !data.session) return toast('Turn on alerts first');
      const r = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ sub: sub.toJSON() }),
      });
      const j = await r.json().catch(() => ({}));
      toast(r.ok && j.sent ? 'Test alert sent. It should pop up in a few seconds.' : 'Test failed: ' + (j.error || 'check the setup'));
    } finally { setBusy(false); }
  };

  return { state, busy, turnOn, turnOff, test };
}

/** Small banner on the Today screen until alerts are switched on. */
export function AlertsBanner({ a }: { a: ReturnType<typeof useAlerts> }) {
  if (a.state === 'off') return (
    <div className="da-alert-banner">
      <span>🔔 Get an alert on this phone for every new booking, even when the app is closed.</span>
      <button className="btn sm" onClick={a.turnOn} disabled={a.busy}>{a.busy ? 'Please wait…' : 'Turn on'}</button>
    </div>
  );
  if (a.state === 'install') return (
    <div className="da-alert-banner"><span>🔔 To get booking alerts on iPhone, first add this app to your Home Screen (Share → Add to Home Screen), then open it from the icon.</span></div>
  );
  return null;
}

/** Row in the More tab. */
export function AlertsSettings({ a }: { a: ReturnType<typeof useAlerts> }) {
  const label: Record<State, string> = {
    checking: 'Checking…', on: 'On for this phone', off: 'Off', blocked: 'Blocked in phone settings',
    install: 'Add the app to your Home Screen first', unsupported: 'Not supported in this browser',
  };
  return (
    <div className="da-help" style={{ display: 'grid', gap: 10 }}>
      <b>Booking alerts</b>
      <p className="muted" style={{ margin: 0 }}>{label[a.state]}</p>
      {a.state === 'blocked' && <p className="muted" style={{ margin: 0, fontSize: '.9rem' }}>Open your phone’s Settings → Apps (or Notifications) → this app or your browser → allow notifications, then reopen the app.</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {a.state === 'off' && <button className="btn sm" onClick={a.turnOn} disabled={a.busy}>Turn on alerts</button>}
        {a.state === 'on' && <>
          <button className="btn sm" onClick={a.test} disabled={a.busy}>Send test alert</button>
          <button className="btn ghost sm" onClick={a.turnOff} disabled={a.busy}>Turn off</button>
        </>}
      </div>
    </div>
  );
}
