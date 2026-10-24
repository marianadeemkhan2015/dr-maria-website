'use client';
import { useCallback, useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase';
import type { Appointment, Clinic, Mode } from '@/lib/types';
import { addDays, dayLabel, fmtPKR, label12, modeName, pkToday, waLink } from '@/lib/util';
import { useToast } from './Toast';
import VisitFiles from './VisitFiles';

type View = 'today' | 'upcoming' | 'past' | 'cancelled';
const STATUS: Record<Appointment['status'], [string, string]> = {
  pending: ['amber', 'New'], confirmed: ['green', 'Confirmed'], completed: ['grey', 'Done'], cancelled: ['red', 'Cancelled'], no_show: ['red', 'No-show'],
};

export default function Appointments() {
  const db = browserClient();
  const toast = useToast();
  const [view, setView] = useState<View>('today');
  const [rows, setRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({ today: 0, week: 0, newCount: 0, month: 0 });
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const today = pkToday();

  const [clinics, setClinics] = useState<Clinic[]>([]);
  useEffect(() => { db.from('clinics').select('*').order('sort').then(({ data }: any) => setClinics(data || [])); }, []); // eslint-disable-line
  const clinicName = (id: string | null) => (id ? clinics.find(c => c.id === id)?.name : null);

  const load = useCallback(async () => {
    let q = db.from('appointments').select('*');
    if (view === 'today') q = q.eq('day', today).neq('status', 'cancelled').order('time');
    if (view === 'upcoming') q = q.gt('day', today).neq('status', 'cancelled').order('day').order('time').limit(300);
    if (view === 'past') q = q.lt('day', today).neq('status', 'cancelled').order('day', { ascending: false }).order('time', { ascending: false }).limit(200);
    if (view === 'cancelled') q = q.eq('status', 'cancelled').order('day', { ascending: false }).limit(200);
    const { data } = await q;
    setRows((data || []) as Appointment[]);
    setLoading(false);

    const monthStart = today.slice(0, 8) + '01';
    const [t, w, n, m] = await Promise.all([
      db.from('appointments').select('id', { count: 'exact', head: true }).eq('day', today).neq('status', 'cancelled'),
      db.from('appointments').select('id', { count: 'exact', head: true }).gte('day', today).lte('day', addDays(today, 7)).neq('status', 'cancelled'),
      db.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'pending').gte('day', today),
      db.from('appointments').select('fee').eq('status', 'completed').gte('day', monthStart),
    ]);
    setKpi({
      today: t.count || 0, week: w.count || 0, newCount: n.count || 0,
      month: ((m.data || []) as { fee: number }[]).reduce((a, r) => a + (r.fee || 0), 0),
    });
  }, [view, today]); // eslint-disable-line

  useEffect(() => { setLoading(true); load(); }, [load]);

  // New bookings appear live while the panel is open.
  useEffect(() => {
    const ch = db.channel('appts').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (p: any) => {
      if (p.eventType === 'INSERT') toast(`New booking: ${p.new.patient_name}, ${dayLabel(p.new.day)} ${label12(String(p.new.time).slice(0, 5))}`);
      load();
    }).subscribe();
    return () => { db.removeChannel(ch); };
  }, [load]); // eslint-disable-line

  const viewReceipt = async (path: string) => {
    const tab = window.open('', '_blank');
    const { data, error } = await db.storage.from('receipts').createSignedUrl(path, 600);
    if (error || !data) { tab?.close(); return toast('Could not open the receipt.'); }
    if (tab) tab.location.href = data.signedUrl; else window.location.href = data.signedUrl;
  };

  const update = async (id: string, patch: Partial<Appointment>, msg: string) => {
    const { error } = await db.from('appointments').update(patch).eq('id', id);
    if (error) toast('Could not save: ' + error.message); else { toast(msg); load(); }
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="kpis">
        <div className="card kpi"><small>Today</small><b>{kpi.today}</b></div>
        <div className="card kpi"><small>Next 7 days</small><b>{kpi.week}</b></div>
        <div className="card kpi"><small>New, to confirm</small><b>{kpi.newCount}</b></div>
        <div className="card kpi"><small>Completed this month</small><b>{fmtPKR(kpi.month)}</b></div>
      </div>
      <section className="card panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <h2>Appointments</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['today', 'upcoming', 'past', 'cancelled'] as View[]).map(v => (
              <button key={v} className={`btn sm ${view === v ? '' : 'ghost'}`} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
            ))}
            <button className="btn sm accent" onClick={() => setAdding(a => !a)}>+ Add walk-in</button>
          </div>
        </div>
        {adding && <AddAppointment clinics={clinics} onDone={() => { setAdding(false); load(); }} />}
        {loading ? <p className="muted">Loading…</p> : rows.length === 0 ? <p className="muted">No appointments here yet.</p> : (
          <div>
            {rows.map(a => (
              <div key={a.id} className="appt">
                <div className="when">
                  {view !== 'today' && <div>{dayLabel(a.day)}</div>}
                  <b>{label12(String(a.time).slice(0, 5))}</b>
                  <div><span className={`pill ${STATUS[a.status][0]}`}>{STATUS[a.status][1]}</span></div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <b>{a.patient_name}</b>{a.age ? `, ${a.age}` : ''} {a.patient_user_id && <span className="pill" style={{ marginInlineStart: 6 }} title="This patient has an account and sees their records">Account</span>} <span className="muted">· {modeName[a.mode]}{clinicName(a.clinic_id) ? ` at ${clinicName(a.clinic_id)}` : a.video_room ? ' by video' : ''} · {a.booking_for || ''}</span>
                  <div className="muted" style={{ fontSize: '.88rem' }}>
                    <span className="mono">{a.phone}</span> · {a.code} · {fmtPKR(a.fee)} · {a.payment_method || '—'}
                  </div>
                  {(a.receipt_path || a.paid) && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                      <span className={`pill ${a.paid ? 'green' : 'amber'}`}>{a.paid ? 'Paid ✓' : 'Receipt to check'}</span>
                      {a.receipt_path && <button className="btn ghost sm" onClick={() => viewReceipt(a.receipt_path!)}>View receipt</button>}
                      {a.paid
                        ? <button className="btn ghost sm" onClick={() => update(a.id, { paid: false }, 'Marked unpaid')}>Undo paid</button>
                        : <button className="btn sm" onClick={() => update(a.id, { paid: true, ...(a.status === 'pending' ? { status: 'confirmed' } : {}) }, 'Payment verified')}>Mark paid</button>}
                    </div>
                  )}
                  {a.reason && <div style={{ fontSize: '.9rem' }}>“{a.reason}”</div>}
                  {open === a.id && <Notes a={a} onSaved={load} />}
                </div>
                <div className="actions">
                  {a.status === 'pending' && <button className="btn sm" onClick={() => update(a.id, { status: 'confirmed' }, 'Confirmed')}>Confirm</button>}
                  {a.video_room && ['pending', 'confirmed'].includes(a.status) && <a className="btn sm accent" href={`/consult/${a.video_room}?doctor=1&code=${a.code}`} target="_blank" rel="noreferrer">Start video</a>}
                  <a className="btn sm ghost" href={waLink(a.phone, `Assalam o Alaikum ${a.patient_name}, this is regarding your appointment ${a.code} on ${dayLabel(a.day)} at ${label12(String(a.time).slice(0, 5))}.`)} target="_blank" rel="noreferrer">WhatsApp</a>
                  <button className="btn sm ghost" onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? 'Close notes' : 'Notes / Rx'}</button>
                  {['pending', 'confirmed'].includes(a.status) && <>
                    <button className="btn sm ghost" onClick={() => update(a.id, { status: 'completed' }, 'Marked done')}>Done</button>
                    <button className="btn sm ghost" onClick={() => update(a.id, { status: 'no_show' }, 'Marked no-show')}>No-show</button>
                    <button className="btn sm ghost" onClick={() => update(a.id, { status: 'cancelled' }, 'Cancelled, slot is free again')}>Cancel</button>
                  </>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Notes({ a, onSaved }: { a: Appointment; onSaved: () => void }) {
  const db = browserClient();
  const toast = useToast();
  const [notes, setNotes] = useState(a.notes || '');
  const [rx, setRx] = useState(a.prescription || '');
  const [tx, setTx] = useState(a.treatment || '');
  const save = async (share: boolean) => {
    const { error } = await db.from('appointments').update({ notes, prescription: rx, treatment: tx || null }).eq('id', a.id);
    if (error) return toast('Could not save: ' + error.message);
    toast(share ? 'Saved. WhatsApp opened with the advice.' : 'Saved');
    if (share && rx) window.open(waLink(a.phone, `${a.patient_name}, advice from your consultation (${a.code}):\n\n${rx}`), '_blank');
    onSaved();
  };
  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
      <div className="field"><label htmlFor={`n-${a.id}`}>Private notes (only you see these)</label><textarea id={`n-${a.id}`} value={notes} onChange={e => setNotes(e.target.value)} /></div>
      <div className="field"><label htmlFor={`tx-${a.id}`}>Diagnosis / treatment plan (the patient can see this)</label><textarea id={`tx-${a.id}`} value={tx} onChange={e => setTx(e.target.value)} placeholder="e.g. Type 2 diabetes, HbA1c 7.6%. Low-carb desi diet, review in 2 weeks." style={{ minHeight: 70 }} /></div>
      <div className="field"><label htmlFor={`rx-${a.id}`}>Prescription / diet plan (the patient can see this)</label><textarea id={`rx-${a.id}`} value={rx} onChange={e => setRx(e.target.value)} placeholder={'Breakfast: 1 egg + 1 brown roti\nWalk 20 min after dinner\nFollow-up in 2 weeks'} /></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn sm" onClick={() => save(false)}>Save</button>
        <button className="btn sm accent" onClick={() => save(true)} disabled={!rx}>Save and send on WhatsApp</button>
      </div>
      <VisitFiles appointmentId={a.id} />
    </div>
  );
}

function AddAppointment({ onDone, clinics }: { onDone: () => void; clinics: Clinic[] }) {
  const db = browserClient();
  const toast = useToast();
  const [f, setF] = useState({ patient_name: '', phone: '', mode: 'clinic' as Mode, clinic_id: clinics[0]?.id || '', day: pkToday(), time: '17:00', reason: '', fee: '' });
  const set = (k: string, v: string) => setF(x => ({ ...x, [k]: v }));
  const save = async () => {
    if (!f.patient_name || !f.phone) return toast('Name and phone are required.');
    const code = 'TB-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const { error } = await db.from('appointments').insert({
      code, patient_name: f.patient_name, phone: f.phone, mode: f.mode, day: f.day, time: f.time,
      reason: f.reason || null, fee: f.fee ? Number(f.fee) : null, status: 'confirmed', payment_method: 'Pay at clinic',
      clinic_id: f.mode === 'video' ? null : f.clinic_id || null,
      video_room: f.mode === 'video' ? 'dr-' + crypto.randomUUID().replace(/-/g, '').slice(0, 18) : null,
    });
    if (error) toast(error.message.includes('appointments_slot_unique') ? 'That time is already booked.' : 'Could not save: ' + error.message);
    else { toast('Added'); onDone(); }
  };
  return (
    <div className="list-item">
      <div className="grid2">
        <div className="field"><label htmlFor="w-name">Patient name</label><input id="w-name" value={f.patient_name} onChange={e => set('patient_name', e.target.value)} /></div>
        <div className="field"><label htmlFor="w-phone">Mobile</label><input id="w-phone" value={f.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div className="field"><label htmlFor="w-mode">Type</label><select id="w-mode" value={f.mode} onChange={e => set('mode', e.target.value)}><option value="clinic">Clinic visit</option><option value="video">Video consult</option><option value="followup">Follow-up</option></select></div>
        {f.mode !== 'video' && clinics.length > 0 && <div className="field"><label htmlFor="w-clinic">Clinic</label><select id="w-clinic" value={f.clinic_id} onChange={e => set('clinic_id', e.target.value)}>{clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
        <div className="field"><label htmlFor="w-fee">Fee (PKR)</label><input id="w-fee" value={f.fee} onChange={e => set('fee', e.target.value.replace(/\D/g, ''))} inputMode="numeric" /></div>
        <div className="field"><label htmlFor="w-day">Date</label><input id="w-day" type="date" value={f.day} onChange={e => set('day', e.target.value)} /></div>
        <div className="field"><label htmlFor="w-time">Time</label><input id="w-time" type="time" value={f.time} onChange={e => set('time', e.target.value)} /></div>
      </div>
      <div className="field"><label htmlFor="w-reason">Reason</label><input id="w-reason" value={f.reason} onChange={e => set('reason', e.target.value)} /></div>
      <div><button className="btn sm" onClick={save}>Save appointment</button></div>
    </div>
  );
}
