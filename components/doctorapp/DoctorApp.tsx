'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { browserClient, isConfigured } from '@/lib/supabase';
import type { Appointment, Clinic, Settings } from '@/lib/types';
import { addDays, dayLabel, label12, pkNowMinutes, pkToday, toMin } from '@/lib/util';
import { ToastProvider, useToast } from '../admin/Toast';
import Consult from './Consult';
import { ApptCard, Icon } from './parts';
import PatientsTab from './PatientsTab';

type Tab = 'today' | 'schedule' | 'patients' | 'more';
type Filter = 'all' | 'clinic' | 'video';
export const isVideo = (a: Appointment) => Boolean(a.video_room) && !a.clinic_id;

export default function DoctorApp() {
  const db = browserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isConfigured) { setReady(true); return; }
    db.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []); // eslint-disable-line
  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    db.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle().then(({ data }) => setIsAdmin(Boolean(data)));
  }, [session]); // eslint-disable-line

  let body: React.ReactNode;
  if (!isConfigured) body = <Center><p>Connect the database first (README step 1).</p></Center>;
  else if (!ready || (session && isAdmin === null)) body = <Center><p className="muted">Loading…</p></Center>;
  else if (!session) body = <Login />;
  else if (!isAdmin) body = <Center><p>This login is not a doctor or staff account.</p><button className="btn ghost sm" onClick={() => db.auth.signOut()}>Sign out</button></Center>;
  else body = <Main email={session.user.email || ''} />;
  return <ToastProvider><div className="da">{body}</div></ToastProvider>;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="da-center">{children}</div>;
}

function Login() {
  const db = browserClient();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) setErr('Email or password is incorrect.');
  };
  return (
    <form className="da-login" onSubmit={go}>
      <div className="da-logo"><Icon name="steth" /></div>
      <h1>Doctor app</h1>
      <p className="muted">Sign in with your doctor panel login.</p>
      <div className="field"><label htmlFor="da-email">Email</label><input id="da-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" /></div>
      <div className="field"><label htmlFor="da-pw">Password</label><input id="da-pw" type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" /></div>
      {err && <p className="alert error">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

function Main({ email }: { email: string }) {
  const db = browserClient();
  const toast = useToast();
  const today = pkToday();
  const [tab, setTab] = useState<Tab>('today');
  const [day, setDay] = useState(today);
  const [filter, setFilter] = useState<Filter>('all');
  const [rows, setRows] = useState<Appointment[] | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [now, setNow] = useState(pkNowMinutes());

  const load = useCallback(async () => {
    const { data } = await db.from('appointments').select('*').gte('day', addDays(today, -1)).lte('day', addDays(today, 21)).order('day').order('time');
    setRows((data || []) as Appointment[]);
  }, [today]); // eslint-disable-line

  useEffect(() => {
    load();
    db.from('clinics').select('*').order('sort').then(({ data }: any) => setClinics(data || []));
    db.from('settings').select('*').eq('id', 1).single().then(({ data }: any) => setSettings(data));
    const t = setInterval(() => setNow(pkNowMinutes()), 60000);
    return () => clearInterval(t);
  }, [load]); // eslint-disable-line

  // New bookings and changes arrive live.
  useEffect(() => {
    const ch = db.channel('doctor-app').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (p: any) => {
      if (p.eventType === 'INSERT') {
        toast(`New booking: ${p.new.patient_name}, ${dayLabel(p.new.day)} ${label12(String(p.new.time).slice(0, 5))}`);
        try { navigator.vibrate?.(200); } catch { /* not supported */ }
      }
      load();
    }).subscribe();
    return () => { db.removeChannel(ch); };
  }, [load]); // eslint-disable-line

  const clinicName = (id: string | null) => clinics.find(c => c.id === id)?.name || null;
  const active = (rows || []).filter(a => a.status !== 'cancelled');
  const pass = (a: Appointment) => filter === 'all' || (filter === 'video' ? isVideo(a) : !isVideo(a));
  const dayRows = active.filter(a => a.day === day && pass(a));
  const todays = active.filter(a => a.day === today);
  const nextUp = todays.filter(a => ['pending', 'confirmed'].includes(a.status) && toMin(String(a.time).slice(0, 5)) >= now - 30)
    .sort((a, b) => a.time.localeCompare(b.time))[0];
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);
  const open = (rows || []).find(a => a.id === openId) || null;
  const toCheck = active.filter(a => a.receipt_path && !a.paid).length;
  const hour = Math.floor(now / 60);

  const toggle = async (k: 'video_open' | 'booking_open') => {
    if (!settings) return;
    const v = !settings[k];
    const { error } = await db.from('settings').update({ [k]: v }).eq('id', 1);
    if (error) return toast('Could not save');
    setSettings({ ...settings, [k]: v });
    toast(k === 'video_open' ? (v ? 'Video consults switched on' : 'Video consults paused') : (v ? 'Online booking open' : 'Online booking closed'));
  };

  if (open) return <Consult a={open} clinicName={clinicName(open.clinic_id)} close={() => setOpenId(null)} reload={load} />;

  return (
    <>
      <header className="da-top">
        <div>
          <small className="muted">{dayLabel(today, { weekday: 'long', day: 'numeric', month: 'long' })}</small>
          <h1>{hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}</h1>
        </div>
        {settings && (
          <button className={`da-online ${settings.video_open ? 'on' : ''}`} onClick={() => toggle('video_open')} aria-pressed={settings.video_open}>
            <span /> {settings.video_open ? 'Video on' : 'Video off'}
          </button>
        )}
      </header>

      <main className="da-body">
        {rows === null ? <p className="muted">Loading appointments…</p> : <>
          {tab === 'today' && <>
            <div className="da-kpis">
              <div><b>{todays.length}</b><span>Today</span></div>
              <div><b>{todays.filter(a => !isVideo(a)).length}</b><span>In person</span></div>
              <div><b>{todays.filter(isVideo).length}</b><span>Video</span></div>
              <div className={toCheck ? 'warn' : ''}><b>{active.filter(a => a.status === 'pending').length}</b><span>To confirm</span></div>
            </div>

            {nextUp && day === today && (
              <button className={`da-next ${isVideo(nextUp) ? 'video' : ''}`} onClick={() => setOpenId(nextUp.id)}>
                <small>Next · {label12(String(nextUp.time).slice(0, 5))}</small>
                <b>{nextUp.patient_name}</b>
                <span>{isVideo(nextUp) ? 'Video consult' : clinicName(nextUp.clinic_id) || 'Clinic'}{nextUp.reason ? ` · ${nextUp.reason}` : ''}</span>
                <em>{isVideo(nextUp) ? 'Open & start video →' : 'Open consultation →'}</em>
              </button>
            )}

            <div className="da-days" role="tablist" aria-label="Day">
              {days.map(d => {
                const n = active.filter(a => a.day === d).length;
                return (
                  <button key={d} role="tab" aria-selected={d === day} onClick={() => setDay(d)}>
                    <small>{d === today ? 'Today' : dayLabel(d, { weekday: 'short' })}</small>
                    <b>{Number(d.slice(8))}</b>
                    <i>{n ? n : ''}</i>
                  </button>
                );
              })}
            </div>

            <div className="seg da-filter">
              {([['all', 'All'], ['clinic', 'In person'], ['video', 'Video']] as [Filter, string][]).map(([k, l]) => (
                <button key={k} type="button" aria-selected={filter === k} onClick={() => setFilter(k)}>{l}</button>
              ))}
            </div>

            {dayRows.length === 0
              ? <div className="da-empty">No {filter === 'video' ? 'video ' : filter === 'clinic' ? 'in-person ' : ''}appointments {day === today ? 'today' : `on ${dayLabel(day)}`}.</div>
              : <div className="da-list">{dayRows.map(a => <ApptCard key={a.id} a={a} clinicName={clinicName(a.clinic_id)} past={a.day === today && toMin(String(a.time).slice(0, 5)) < now - 30} onOpen={() => setOpenId(a.id)} />)}</div>}
          </>}

          {tab === 'schedule' && <>
            <h2 className="da-h2">Next 3 weeks</h2>
            {days.concat(Array.from({ length: 7 }, (_, i) => addDays(today, 14 + i))).map(d => {
              const list = active.filter(a => a.day === d && pass(a));
              if (!list.length) return null;
              return (
                <section key={d} className="da-group">
                  <h3>{d === today ? 'Today' : d === addDays(today, 1) ? 'Tomorrow' : dayLabel(d, { weekday: 'long', day: 'numeric', month: 'short' })}
                    <span className="muted"> · {list.length}</span></h3>
                  <div className="da-list">{list.map(a => <ApptCard key={a.id} a={a} clinicName={clinicName(a.clinic_id)} onOpen={() => setOpenId(a.id)} />)}</div>
                </section>
              );
            })}
            {!active.some(a => a.day >= today) && <div className="da-empty">No upcoming appointments.</div>}
          </>}

          {tab === 'patients' && <PatientsTab clinics={clinics} />}

          {tab === 'more' && settings && (
            <div style={{ display: 'grid', gap: 12 }}>
              <h2 className="da-h2">Settings</h2>
              <label className="toggle">Video consults<input type="checkbox" className="switch" checked={settings.video_open} onChange={() => toggle('video_open')} /></label>
              <label className="toggle">Accept online bookings<input type="checkbox" className="switch" checked={settings.booking_open} onChange={() => toggle('booking_open')} /></label>
              <a className="da-row" href="/admin">Full doctor panel<span>Profile, fees, hours, articles, reviews →</span></a>
              <a className="da-row" href="/" target="_blank" rel="noreferrer">View my website<span>→</span></a>
              <div className="da-row" style={{ cursor: 'default' }}>Signed in<span>{email}</span></div>
              <button className="btn ghost" onClick={() => db.auth.signOut()}>Sign out</button>
              <InstallHelp />
            </div>
          )}
        </>}
      </main>

      <nav className="da-tabs" aria-label="Doctor app">
        {([['today', 'Today', 'today'], ['schedule', 'Schedule', 'cal'], ['patients', 'Patients', 'users'], ['more', 'More', 'more']] as [Tab, string, string][]).map(([k, l, ic]) => (
          <button key={k} aria-current={tab === k} onClick={() => setTab(k)}>
            <Icon name={ic} />{l}{k === 'today' && toCheck > 0 && <i className="da-badge">{toCheck}</i>}
          </button>
        ))}
      </nav>
    </>
  );
}

function InstallHelp() {
  return (
    <div className="da-help">
      <b>Put this app on your phone</b>
      <p><b>Android (Chrome):</b> menu ⋮ → <i>Install app</i> or <i>Add to Home screen</i>.</p>
      <p><b>iPhone (Safari):</b> Share button → <i>Add to Home Screen</i>.</p>
      <p className="muted">It opens full screen like any other app and stays signed in.</p>
    </div>
  );
}
