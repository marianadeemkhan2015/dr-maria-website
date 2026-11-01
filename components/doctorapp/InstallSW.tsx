'use client';
import { useEffect, useState } from 'react';

type Kind = 'android' | 'android-menu' | 'ios' | null;

/**
 * Registers the service worker that makes the doctor app installable, and on a phone
 * (when the app is not installed yet) shows an "Install app" bar.
 */
export default function InstallSW() {
  const [kind, setKind] = useState<Kind>(null);
  const [prompt, setPrompt] = useState<any>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/doctor-sw.js', { scope: '/doctor' }).catch(() => {});
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    let hidden = false;
    try { hidden = localStorage.getItem('da-install-hidden') === '1'; } catch { /* private mode */ }
    if (standalone || hidden) return;
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) { setKind('ios'); return; }
    if (!/Android/i.test(ua)) return;                       // computers: no bar
    setKind('android-menu');                                  // until the browser offers its own install prompt
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e); setKind('android'); };
    const onInstalled = () => setKind(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  if (!kind) return null;
  const hide = () => { try { localStorage.setItem('da-install-hidden', '1'); } catch { /* ignore */ } setKind(null); };
  const install = async () => { prompt?.prompt(); const r = await prompt?.userChoice; if (r?.outcome === 'accepted') setKind(null); };

  return (
    <div className="da-install" role="region" aria-label="Install the doctor app">
      <img src="/icons/doctor-192.png" alt="" width={40} height={40} />
      <div>
        <b>Install the Dr. Maria app</b>
        {kind === 'android' && <span>Opens full screen, with booking alerts.</span>}
        {kind === 'android-menu' && <span>Tap the menu <b>⋮</b> → <b>Install app</b> (or Add to Home screen).</span>}
        {kind === 'ios' && <span>In Safari tap <b>Share</b> <span aria-hidden>⬆︎</span> → <b>Add to Home Screen</b>.</span>}
      </div>
      {kind === 'android' && <button className="btn sm" onClick={install}>Install</button>}
      <button className="da-install-x" onClick={hide} aria-label="Hide">×</button>
    </div>
  );
}
