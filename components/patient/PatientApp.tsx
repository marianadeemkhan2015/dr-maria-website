'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';
import { browserClient, isConfigured } from '@/lib/supabase';
import type { Patient, Report, Visit } from '@/lib/types';
import { dayLabel, fmtPKR, label12, modeName, pkNowMinutes, pkToday, toMin, waLink } from '@/lib/util';
import { VisitReview } from '../AppointmentLookup';

type Tab = 'home' | 'visits' | 'reports' | 'profile';
const STATUS: Record<string, [string, string]> = {
  pending: ['amber', 'Booked'], confirmed: ['green', 'Confirmed'], completed: ['grey', 'Completed'], cancelled: ['red', 'Cancelled'], no_show: ['red', 'Missed'],
};

export default function PatientApp({ doctorName, whatsapp }: { doctorName: string; whatsapp: string }) {
  const db = browserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Patient | null>(null);

  useEffect(() => {
    if (!isConfigured) { setReady(true); return; }
    db.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []); // eslint-disable-line

  // First sign-in creates the profile from the name and mobile given at sign-up.
  useEffect(() => {
    if (!session) { setMe(null); return; }
    const m = session.user.user_metadata || {};
    db.rpc('ensure_patient', { p_name: m.full_name || '', p_phone: m.phone || '' }).then(({ data }: any) => setMe(data as Patient));
  }, [session]); // eslint-disable-line

  if (!isConfigured) return <p className="alert">The site is not connected to its database yet.</p>;
  if (!ready) return <p className="muted">Loading…</p>;
  if (!session) return <AuthBox doctorName={doctorName} />;
  if (!me) return <p className="muted">Opening your records…</p>;
  return <Portal me={me} setMe={setMe} email={session.user.email || ''} doctorName={doctorName} whatsapp={whatsapp} />;
}

/* ---------------- Sign in / create account ---------------- */
function AuthBox({ doctorName }: { doctorName: string }) {
  const db = browserClient();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [f, setF] = useState({ name: '', phone: '', email: '', password: '' });
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF(x => ({ ...x, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null);
    if (mode === 'up') {
      if (!f.name.trim() || f.phone.replace(/\D/g, '').length < 10) return setMsg({ kind: 'error', text: 'Enter your full name and mobile number.' });
      if (f.password.length < 8) return setMsg({ kind: 'error', text: 'Choose a password of at least 8 characters.' });
      setBusy(true);
      const { data, error } = await db.auth.signUp({
        email: f.email.trim(), password: f.password,
        options: { data: { full_name: f.name.trim(), phone: f.phone.trim() }, emailRedirectTo: window.location.origin + '/patient' },
      });
      setBusy(false);
      if (error) return setMsg({ kind: 'error', text: error.message });
      if (!data.session) setMsg({ kind: 'ok', text: 'Account created. Check your email and tap the link to confirm, then sign in.' });
    } else {
      setBusy(true);
      const { error } = await db.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
      setBusy(false);
      if (error) setMsg({ kind: 'error', text: error.message.includes('confirm') ? 'Please confirm your email first (check your inbox).' : 'Email or password is incorrect.' });
    }
  };
  const forgot = async () => {
    if (!f.email) return setMsg({ kind: 'error', text: 'Type your email first, then press “Forgot password”.' });
    await db.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: window.location.origin + '/patient/reset' });
    setMsg({ kind: 'ok', text: 'If this email has an account, a reset link is on its way.' });
  };

  return (
    <div className="pt-auth">
      <div className="pt-auth-intro">
        <p className="eyebrow">Patients of {doctorName}</p>
        <h1>Your health records, in one place</h1>
        <ul>
          <li>See every visit, treatment plan and prescription</li>
          <li>Open your lab reports and diet plans anytime</li>
          <li>Upload your own reports before a consultation</li>
          <li>Join video consults and manage bookings</li>
        </ul>
        <p className="muted" style={{ fontSize: '.88rem' }}>Only you and the doctor’s clinic can see your records.</p>
      </div>
      <form onSubmit={submit} className="card panel">
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'in'} onClick={() => { setMode('in'); setMsg(null); }}>Sign in</button>
          <button type="button" role="tab" aria-selected={mode === 'up'} onClick={() => { setMode('up'); setMsg(null); }}>Create account</button>
        </div>
        {mode === 'up' && <>
          <div className="field"><label htmlFor="pa-name">Full name</label><input id="pa-name" value={f.name} onChange={e => set('name', e.target.value)} autoComplete="name" /></div>
          <div className="field"><label htmlFor="pa-phone">Mobile number (the one you book with)</label><input id="pa-phone" value={f.phone} onChange={e => set('phone', e.target.value)} inputMode="tel" autoComplete="tel" placeholder="03xx xxxxxxx" /></div>
        </>}
        <div className="field"><label htmlFor="pa-email">Email</label><input id="pa-email" type="email" value={f.email} onChange={e => set('email', e.target.value)} autoComplete="email" /></div>
        <div className="field"><label htmlFor="pa-pass">Password</label><input id="pa-pass" type="password" value={f.password} onChange={e => set('password', e.target.value)} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} /></div>
        {msg && <p className={`alert ${msg.kind}`}>{msg.text}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
        {mode === 'in' && <button type="button" className="btn ghost sm" onClick={forgot}>Forgot password</button>}
        <p className="muted" style={{ fontSize: '.85rem' }}>Just want to check one booking? Use <Link href="/appointment">My appointment</Link> with your booking code.</p>
      </form>
    </div>
  );
}

/* ---------------- Signed-in portal ---------------- */
function Portal({ me, setMe, email, doctorName, whatsapp }: { me: Patient; setMe: (p: Patient) => void; email: string; doctorName: string; whatsapp: string }) {
  const db = browserClient();
  const [tab, setTab] = useState<Tab>('home');
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    const [h, r] = await Promise.all([db.rpc('my_history'), db.from('reports').select('*').order('created_at', { ascending: false })]);
    setVisits(((h.data as Visit[]) || []));
    setReports((r.data || []) as Report[]);
  }, []); // eslint-disable-line
  useEffect(() => { load(); }, [load]);
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2800); };

  const today = pkToday();
  const isUpcoming = (v: Visit) => ['pending', 'confirmed'].includes(v.status) && (v.day > today || (v.day === today && toMin(String(v.time).slice(0, 5)) >= pkNowMinutes() - 60));
  const upcoming = (visits || []).filter(isUpcoming).sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
  const past = (visits || []).filter(v => !isUpcoming(v));

  const openFile = async (r: Report) => {
    const tabw = window.open('', '_blank');
    const { data, error } = await db.storage.from('reports').createSignedUrl(r.file_path, 600);
    if (error || !data) { tabw?.close(); return say('Could not open the file. Please try again.'); }
    if (tabw) tabw.location.href = data.signedUrl; else window.location.href = data.signedUrl;
  };

  const TABS: [Tab, string][] = [['home', 'Overview'], ['visits', `Visits${visits ? ` (${visits.length})` : ''}`], ['reports', `Reports & files${reports.length ? ` (${reports.length})` : ''}`], ['profile', 'My health profile']];

  return (
    <div className="pt">
      <div className="pt-head">
        <div>
          <p className="eyebrow">My health records</p>
          <h1>Assalam o Alaikum, {me.full_name.split(' ')[0]}</h1>
          <p className="muted">{email} · {me.phone}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/book" className="btn">Book appointment</Link>
          <button className="btn ghost" onClick={() => db.auth.signOut()}>Sign out</button>
        </div>
      </div>
      <nav className="pt-tabs" aria-label="My records">
        {TABS.map(([k, l]) => <button key={k} aria-current={tab === k} onClick={() => setTab(k)}>{l}</button>)}
      </nav>

      {visits === null ? <p className="muted">Loading your records…</p> : <>
        {tab === 'home' && (
          <div className="pt-grid">
            <section className="card panel">
              <h2>Upcoming appointments</h2>
              {upcoming.length === 0
                ? <p className="muted">No upcoming appointments. <Link href="/book">Book one</Link>.</p>
                : upcoming.map(v => <UpcomingCard key={v.id} v={v} onChanged={() => { load(); say('Appointment cancelled'); }} whatsapp={whatsapp} />)}
            </section>
            <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
              <section className="card panel">
                <h2>Latest from your doctor</h2>
                {(() => {
                  const v = past.find(x => x.treatment || x.prescription);
                  if (!v) return <p className="muted">After your consultation, the treatment plan and prescription will appear here.</p>;
                  return <>
                    <p className="muted" style={{ fontSize: '.88rem' }}>{dayLabel(v.day, { day: 'numeric', month: 'long', year: 'numeric' })} · {modeName[v.mode]}</p>
                    {v.treatment && <div className="pt-note"><b>Treatment plan</b><p>{v.treatment}</p></div>}
                    {v.prescription && <div className="pt-note rx"><b>Prescription / diet plan</b><p>{v.prescription}</p></div>}
                    <button className="btn ghost sm" style={{ justifySelf: 'start' }} onClick={() => setTab('visits')}>All visits →</button>
                  </>;
                })()}
              </section>
              <LinkBookings phone={me.phone} onLinked={n => { load(); say(n ? `${n} past booking${n > 1 ? 's' : ''} added to your records` : 'No new bookings found'); }} />
            </div>
          </div>
        )}

        {tab === 'visits' && (
          <section className="card panel">
            <h2>Visit history</h2>
            {past.length === 0 && <p className="muted">No past visits yet. Bookings made while signed in appear here; add older ones from the Overview tab.</p>}
            {past.map(v => (
              <article key={v.id} className="visit">
                <div className="visit-date"><b>{Number(v.day.slice(8))}</b><span>{dayLabel(v.day, { month: 'short', year: 'numeric' })}</span></div>
                <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <b>{modeName[v.mode]}</b>
                    <span className={`pill ${STATUS[v.status]?.[0]}`}>{STATUS[v.status]?.[1]}</span>
                    <span className="muted" style={{ fontSize: '.86rem' }}>{label12(String(v.time).slice(0, 5))} · {v.clinic_name || (v.video_room ? 'Video call' : '')}{v.booking_for && v.booking_for !== 'Myself' ? ` · for ${v.patient_name}` : ''}</span>
                  </div>
                  {v.reason && <p className="muted" style={{ fontSize: '.9rem' }}>Reason: {v.reason}</p>}
                  {v.treatment && <div className="pt-note"><b>Treatment plan</b><p>{v.treatment}</p></div>}
                  {v.prescription && <div className="pt-note rx"><b>Prescription / diet plan</b><p>{v.prescription}</p></div>}
                  {reports.filter(r => r.appointment_id === v.id).map(r => (
                    <button key={r.id} className="file" onClick={() => openFile(r)}><FileIcon /> {r.title}</button>
                  ))}
                  {v.status === 'completed' && (v.reviewed
                    ? <p className="muted" style={{ fontSize: '.85rem' }}>✓ You reviewed this visit</p>
                    : <details><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>Rate this visit</summary>
                        <VisitReview code={v.code} phone={v.phone} onDone={() => { load(); say('Thank you for your review'); }} /></details>)}
                </div>
              </article>
            ))}
          </section>
        )}

        {tab === 'reports' && <Reports reports={reports} visits={visits} me={me} openFile={openFile} reload={load} say={say} />}
        {tab === 'profile' && <Profile me={me} setMe={setMe} say={say} />}
      </>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function FileIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></svg>;
}

function UpcomingCard({ v, onChanged, whatsapp }: { v: Visit; onChanged: () => void; whatsapp: string }) {
  const db = browserClient();
  const [sure, setSure] = useState(false);
  const cancel = async () => {
    const { data } = await db.rpc('cancel_appointment', { p_code: v.code, p_phone: v.phone });
    if (data) onChanged();
  };
  return (
    <div className="list-item">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <b>{dayLabel(v.day, { weekday: 'long', day: 'numeric', month: 'long' })}, {label12(String(v.time).slice(0, 5))}</b>
        <span className={`pill ${STATUS[v.status][0]}`}>{STATUS[v.status][1]}</span>
      </div>
      <p className="muted" style={{ fontSize: '.9rem' }}>{modeName[v.mode]} · {v.clinic_name ? `${v.clinic_name}, ${v.clinic_address}` : 'Video call'} · {fmtPKR(v.fee)} · <span className="mono">{v.code}</span></p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {v.video_room && <Link className="btn sm accent" href={`/consult/${v.video_room}?code=${v.code}`}>Join video call</Link>}
        {v.clinic_map && <a className="btn sm ghost" href={v.clinic_map} target="_blank" rel="noreferrer">Map</a>}
        {whatsapp && <a className="btn sm ghost" href={waLink(whatsapp, `About my appointment ${v.code}`)} target="_blank" rel="noreferrer">Message clinic</a>}
        {!sure ? <button className="btn sm ghost" onClick={() => setSure(true)}>Cancel</button>
          : <><button className="btn sm danger" onClick={cancel}>Yes, cancel</button><button className="btn sm ghost" onClick={() => setSure(false)}>Keep</button></>}
      </div>
    </div>
  );
}

function LinkBookings({ phone, onLinked }: { phone: string; onLinked: (n: number) => void }) {
  const db = browserClient();
  const [code, setCode] = useState('');
  const [ph, setPh] = useState(phone);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    const { data, error } = await db.rpc('link_bookings', { p_code: code, p_phone: ph });
    setBusy(false);
    if (error) return setErr(error.message);
    setCode(''); onLinked(Number(data) || 0);
  };
  return (
    <form onSubmit={go} className="card panel">
      <h2>Add past bookings</h2>
      <p className="muted" style={{ fontSize: '.9rem' }}>Booked before you had an account? Enter one booking code and the mobile number you used. All your bookings with that number are added.</p>
      <div className="grid2">
        <div className="field"><label htmlFor="lk-code">Booking code</label><input id="lk-code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="TB-XXXXXX" /></div>
        <div className="field"><label htmlFor="lk-phone">Mobile number</label><input id="lk-phone" value={ph} onChange={e => setPh(e.target.value)} inputMode="tel" /></div>
      </div>
      {err && <p className="alert error">{err}</p>}
      <div><button className="btn sm" disabled={busy || !code}>{busy ? 'Checking…' : 'Add to my records'}</button></div>
    </form>
  );
}

function Reports({ reports, visits, me, openFile, reload, say }: { reports: Report[]; visits: Visit[]; me: Patient; openFile: (r: Report) => void; reload: () => void; say: (m: string) => void }) {
  const db = browserClient();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<string | null>(null);
  const visitOf = (id: string | null) => visits.find(v => v.id === id);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return say('Choose a file first.');
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) return say('Use a photo (JPG, PNG) or a PDF.');
    if (file.size > 10 * 1024 * 1024) return say('The file must be under 10 MB.');
    setBusy(true);
    const ext = file.type === 'application/pdf' ? 'pdf' : (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const path = `${me.user_id}/${crypto.randomUUID()}.${ext}`;
    const up = await db.storage.from('reports').upload(path, file, { contentType: file.type });
    if (up.error) { setBusy(false); return say('Upload failed. Please try again.'); }
    const { error } = await db.from('reports').insert({ patient_user_id: me.user_id, title: title.trim() || file.name, file_path: path, uploaded_by: 'patient' });
    setBusy(false);
    if (error) return say('Could not save: ' + error.message);
    setTitle(''); setFile(null); reload(); say('Report uploaded. Your doctor can see it.');
  };
  const remove = async (r: Report) => {
    await db.from('reports').delete().eq('id', r.id);
    await db.storage.from('reports').remove([r.file_path]);
    setDel(null); reload();
  };

  return (
    <div className="pt-grid">
      <section className="card panel">
        <h2>Reports &amp; files</h2>
        {reports.length === 0 && <p className="muted">No files yet. Lab reports and diet plans from your doctor appear here, and you can upload your own.</p>}
        {reports.map(r => {
          const v = visitOf(r.appointment_id);
          return (
            <div key={r.id} className="report">
              <span className="report-ic"><FileIcon /></span>
              <div style={{ minWidth: 0 }}>
                <b style={{ overflowWrap: 'anywhere' }}>{r.title}</b>
                <div className="muted" style={{ fontSize: '.82rem' }}>
                  {r.uploaded_by === 'doctor' ? 'From your doctor' : 'Uploaded by you'} · {dayLabel(r.created_at.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}
                  {v && ` · visit on ${dayLabel(v.day)}`}
                </div>
                {r.note && <p style={{ fontSize: '.88rem' }}>{r.note}</p>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button className="btn sm ghost" onClick={() => openFile(r)}>Open</button>
                {r.uploaded_by === 'patient' && (del === r.id
                  ? <button className="btn sm danger" onClick={() => remove(r)}>Delete</button>
                  : <button className="btn sm ghost" onClick={() => setDel(r.id)} aria-label="Delete file">✕</button>)}
              </div>
            </div>
          );
        })}
      </section>
      <form onSubmit={upload} className="card panel" style={{ alignSelf: 'start' }}>
        <h2>Upload a report</h2>
        <p className="muted" style={{ fontSize: '.9rem' }}>Add lab results or old prescriptions before your consultation so the doctor can see them.</p>
        <div className="field"><label htmlFor="up-title">What is it?</label><input id="up-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. HbA1c test, October" /></div>
        <label className="receipt-drop" htmlFor="up-file">
          <b>{file ? file.name : 'Choose photo or PDF'}</b><span className="muted">JPG, PNG or PDF, up to 10 MB</span>
        </label>
        <input id="up-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={e => setFile(e.target.files?.[0] || null)} />
        <button className="btn" disabled={busy || !file}>{busy ? 'Uploading…' : 'Upload'}</button>
      </form>
    </div>
  );
}

function Profile({ me, setMe, say }: { me: Patient; setMe: (p: Patient) => void; say: (m: string) => void }) {
  const db = browserClient();
  const [f, setF] = useState<Patient>(me);
  const [pw, setPw] = useState('');
  const set = (k: keyof Patient, v: string) => setF(x => ({ ...x, [k]: v || null } as Patient));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.full_name?.trim()) return say('Your name is required.');
    const body = { full_name: f.full_name, phone: f.phone || '', dob: f.dob || null, gender: f.gender, blood_group: f.blood_group, allergies: f.allergies, conditions: f.conditions, medicines: f.medicines };
    const { error } = await db.from('patients').update(body).eq('user_id', me.user_id);
    if (error) return say('Could not save: ' + error.message);
    setMe({ ...me, ...body } as Patient); say('Saved. Your doctor sees the updated profile.');
  };
  const changePw = async () => {
    if (pw.length < 8) return say('Use at least 8 characters.');
    const { error } = await db.auth.updateUser({ password: pw });
    if (error) say(error.message); else { setPw(''); say('Password changed'); }
  };
  return (
    <div className="pt-grid">
      <form onSubmit={save} className="card panel">
        <h2>My health profile</h2>
        <p className="muted" style={{ fontSize: '.9rem' }}>Helps your doctor prepare for your consultation.</p>
        <div className="grid2">
          <div className="field"><label htmlFor="pf-name">Full name</label><input id="pf-name" value={f.full_name || ''} onChange={e => set('full_name', e.target.value)} /></div>
          <div className="field"><label htmlFor="pf-phone">Mobile</label><input id="pf-phone" value={f.phone || ''} onChange={e => set('phone', e.target.value)} inputMode="tel" /></div>
          <div className="field"><label htmlFor="pf-dob">Date of birth</label><input id="pf-dob" type="date" value={f.dob || ''} onChange={e => set('dob', e.target.value)} /></div>
          <div className="field"><label htmlFor="pf-gender">Gender</label>
            <select id="pf-gender" value={f.gender || ''} onChange={e => set('gender', e.target.value)}><option value="">—</option><option>Female</option><option>Male</option><option>Other</option></select></div>
          <div className="field"><label htmlFor="pf-blood">Blood group</label>
            <select id="pf-blood" value={f.blood_group || ''} onChange={e => set('blood_group', e.target.value)}><option value="">Don’t know</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b}>{b}</option>)}</select></div>
        </div>
        <div className="field"><label htmlFor="pf-cond">Health conditions</label><textarea id="pf-cond" value={f.conditions || ''} onChange={e => set('conditions', e.target.value)} placeholder="e.g. Type 2 diabetes since 2019, high blood pressure" style={{ minHeight: 70 }} /></div>
        <div className="field"><label htmlFor="pf-med">Current medicines</label><textarea id="pf-med" value={f.medicines || ''} onChange={e => set('medicines', e.target.value)} placeholder="e.g. Metformin 500 mg twice a day" style={{ minHeight: 70 }} /></div>
        <div className="field"><label htmlFor="pf-all">Allergies</label><input id="pf-all" value={f.allergies || ''} onChange={e => set('allergies', e.target.value)} placeholder="e.g. Penicillin, peanuts" /></div>
        <div><button className="btn">Save profile</button></div>
      </form>
      <section className="card panel" style={{ alignSelf: 'start' }}>
        <h2>Password</h2>
        <div className="field"><label htmlFor="pf-pw">New password</label><input id="pf-pw" type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" /></div>
        <div><button className="btn sm" type="button" onClick={changePw}>Change password</button></div>
      </section>
    </div>
  );
}
