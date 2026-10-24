'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';
import { browserClient, isConfigured } from '@/lib/supabase';
import Appointments from './Appointments';
import Profile from './Profile';
import Booking from './Booking';
import Hours from './Hours';
import Reviews from './Reviews';
import ListEditor from './ListEditor';
import Articles from './Articles';
import Services from './Services';
import Events from './Events';
import Clinics from './Clinics';
import Gallery from './Gallery';
import Patients from './Patients';
import FooterSettings from './FooterSettings';
import { ToastProvider } from './Toast';

const TABS = [
  ['appointments', 'Appointments'],
  ['patients', 'Patients'],
  ['profile', 'Profile & bio'],
  ['booking', 'Fees & booking'],
  ['clinics', 'Clinics'],
  ['hours', 'Hours & days off'],
  ['services', 'Services'],
  ['events', 'Events & videos'],
  ['articles', 'Articles'],
  ['reviews', 'Reviews'],
  ['gallery', 'Achievements & photos'],
  ['footer', 'Footer & contact'],
] as const;
type Tab = typeof TABS[number][0];

export default function AdminApp() {
  const db = browserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('appointments');

  useEffect(() => {
    if (!isConfigured) { setReady(true); return; }
    db.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    db.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [session]); // eslint-disable-line

  if (!isConfigured) return <Shell><p className="alert">Connect Supabase first (README step 2), then come back to this page.</p></Shell>;
  if (!ready) return <Shell><p className="muted">Loading…</p></Shell>;
  if (!session) return <Shell><Login /></Shell>;
  if (isAdmin === null) return <Shell><p className="muted">Checking access…</p></Shell>;
  if (!isAdmin) return (
    <Shell>
      <div className="card panel" style={{ maxWidth: 640 }}>
        <h2>This account can’t edit the website yet</h2>
        <p>Run this once in Supabase → SQL Editor to give this login access:</p>
        <pre className="mono" style={{ whiteSpace: 'pre-wrap', background: 'var(--surface-2)', padding: 12, borderRadius: 10 }}>{`insert into admins (user_id, note) values ('${session.user.id}', '${session.user.email}');`}</pre>
        <div><button className="btn ghost sm" onClick={() => db.auth.signOut()}>Sign out</button></div>
      </div>
    </Shell>
  );

  return (
    <ToastProvider>
      <Shell email={session.user.email} onSignOut={() => db.auth.signOut()}>
        <div className="admin">
          <nav className="card anav" aria-label="Doctor panel">
            {TABS.map(([k, label]) => <button key={k} aria-current={tab === k} onClick={() => setTab(k)}>{label}</button>)}
          </nav>
          <div style={{ minWidth: 0 }}>
            {tab === 'appointments' && <Appointments />}
            {tab === 'profile' && <Profile />}
            {tab === 'booking' && <Booking />}
            {tab === 'hours' && <Hours />}
            {tab === 'services' && <Services />}
            {tab === 'events' && <Events />}
            {tab === 'articles' && <Articles />}
            {tab === 'reviews' && <Reviews />}
            {tab === 'clinics' && <Clinics />}
            {tab === 'gallery' && <Gallery />}
            {tab === 'patients' && <Patients />}
            {tab === 'footer' && <FooterSettings />}
          </div>
        </div>
      </Shell>
    </ToastProvider>
  );
}

function Shell({ children, email, onSignOut }: { children: React.ReactNode; email?: string; onSignOut?: () => void }) {
  return (
    <>
      <header className="header">
        <div className="wrap">
          <span className="brand">Doctor panel</span>
          <Link href="/" className="btn ghost sm" target="_blank">View website ↗</Link>
          <Link href="/doctor" className="btn ghost sm">Doctor app</Link>
          {email && <span className="muted" style={{ fontSize: '.85rem' }}>{email}</span>}
          {onSignOut && <button className="btn ghost sm" onClick={onSignOut}>Sign out</button>}
        </div>
      </header>
      <main className="wrap" style={{ paddingTop: 8 }}>{children}</main>
    </>
  );
}

function Login() {
  const db = browserClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const { error } = await db.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMsg({ kind: 'error', text: 'Email or password is incorrect.' });
  };
  const reset = async () => {
    if (!email) return setMsg({ kind: 'error', text: 'Type your email first, then press “Forgot password”.' });
    await db.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/admin/reset' });
    setMsg({ kind: 'ok', text: 'If this email has an account, a reset link is on its way.' });
  };

  return (
    <form onSubmit={signIn} className="card panel" style={{ maxWidth: 420, margin: '48px auto' }}>
      <h2>Sign in</h2>
      <div className="field"><label htmlFor="a-email">Email</label><input id="a-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" /></div>
      <div className="field"><label htmlFor="a-pass">Password</label><input id="a-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></div>
      {msg && <p className={`alert ${msg.kind}`}>{msg.text}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <button type="button" className="btn ghost sm" onClick={reset}>Forgot password</button>
    </form>
  );
}
