'use client';
import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase';
import type { Appointment, Patient } from '@/lib/types';
import { dayLabel, fmtPKR, label12, modeName, waLink } from '@/lib/util';
import { useToast } from '../admin/Toast';
import VisitFiles from '../admin/VisitFiles';
import { Icon, STATUS } from './parts';

const QUICK = ['Follow-up in 2 weeks', 'Walk 20 minutes after dinner', 'Drink 8–10 glasses of water', 'No sugar in tea', 'Dinner by 8 PM', 'Repeat lab tests before next visit'];

/** One appointment, full screen: patient, history, video, notes, prescription, files. */
export default function Consult({ a, clinicName, close, reload }: { a: Appointment; clinicName: string | null; close: () => void; reload: () => void }) {
  const db = browserClient();
  const toast = useToast();
  const video = Boolean(a.video_room) && !a.clinic_id;
  const [profile, setProfile] = useState<Patient | null>(null);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [tx, setTx] = useState(a.treatment || '');
  const [rx, setRx] = useState(a.prescription || '');
  const [notes, setNotes] = useState(a.notes || '');
  const [saving, setSaving] = useState(false);
  const [sure, setSure] = useState<string | null>(null);
  const dirty = tx !== (a.treatment || '') || rx !== (a.prescription || '') || notes !== (a.notes || '');

  useEffect(() => {
    (async () => {
      const [byPhone, byAccount, prof] = await Promise.all([
        db.from('appointments').select('*').eq('phone', a.phone).order('day', { ascending: false }).limit(20),
        a.patient_user_id ? db.from('appointments').select('*').eq('patient_user_id', a.patient_user_id).order('day', { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
        a.patient_user_id ? db.from('patients').select('*').eq('user_id', a.patient_user_id).maybeSingle() : Promise.resolve({ data: null }),
      ]) as any[];
      const seen = new Set<string>();
      const all = [...(byPhone.data || []), ...(byAccount.data || [])]
        .filter((x: Appointment) => x.id !== a.id && x.status === 'completed' && !seen.has(x.id) && seen.add(x.id))
        .sort((p: Appointment, q: Appointment) => q.day.localeCompare(p.day));
      setHistory(all);
      setProfile(prof.data);
    })();
  }, [a.id]); // eslint-disable-line

  const base = (process.env.NEXT_PUBLIC_VIDEO_BASE_URL || 'https://meet.jit.si').replace(/\/$/, '');
  const startVideo = async () => {
    window.open(`${base}/${a.video_room}#userInfo.displayName=${encodeURIComponent('"Doctor"')}&config.prejoinConfig.enabled=false`, '_blank');
    if (a.status === 'pending') await setStatus('confirmed', 'Confirmed');
  };
  const setStatus = async (status: Appointment['status'], msg: string, extra: Partial<Appointment> = {}) => {
    const { error } = await db.from('appointments').update({ status, ...extra }).eq('id', a.id);
    if (error) return toast('Could not save: ' + error.message);
    toast(msg); setSure(null); reload();
  };
  const save = async (finish: boolean, share = false) => {
    setSaving(true);
    const patch: Partial<Appointment> = { treatment: tx.trim() || null, prescription: rx.trim() || null, notes: notes.trim() || null };
    if (finish) patch.status = 'completed';
    const { error } = await db.from('appointments').update(patch).eq('id', a.id);
    setSaving(false);
    if (error) return toast('Could not save: ' + error.message);
    if (share && rx.trim()) window.open(waLink(a.phone, `${a.patient_name}, advice from your consultation with the doctor (${a.code}):\n\n${tx ? tx + '\n\n' : ''}${rx}`), '_blank');
    toast(finish ? 'Consultation finished. The patient can see the plan.' : 'Saved');
    reload();
    if (finish) close();
  };
  const viewReceipt = async () => {
    const tab = window.open('', '_blank');
    const { data } = await db.storage.from('receipts').createSignedUrl(a.receipt_path!, 600);
    if (!data) { tab?.close(); return toast('Could not open the receipt.'); }
    if (tab) tab.location.href = data.signedUrl; else window.location.href = data.signedUrl;
  };
  const addQuick = (q: string) => setRx(x => (x.trim() ? x.replace(/\s*$/, '\n') : '') + q);
  const ageText = a.age ? `${a.age} yrs` : profile?.dob ? `${new Date().getFullYear() - Number(profile.dob.slice(0, 4))} yrs` : '';

  return (
    <div className="da-consult">
      <header className="da-ctop">
        <button className="da-icon" onClick={close} aria-label="Back"><Icon name="back" /></button>
        <div style={{ minWidth: 0 }}>
          <b>{a.patient_name}</b>
          <small>{dayLabel(a.day)} · {label12(String(a.time).slice(0, 5))}</small>
        </div>
        <span className={`pill ${STATUS[a.status][0]}`}>{STATUS[a.status][1]}</span>
      </header>

      <main className="da-body">
        <section className={`da-hero ${video ? 'video' : ''}`}>
          <div className="da-hero-row">
            <Icon name={video ? 'video' : 'clinic'} />
            <span><b>{video ? 'Video consultation' : `In person · ${clinicName || 'Clinic'}`}</b><small>{modeName[a.mode]} · {fmtPKR(a.fee)} · {a.payment_method || '—'}</small></span>
          </div>
          {video && ['pending', 'confirmed'].includes(a.status) && <button className="btn accent da-big" onClick={startVideo}><Icon name="video" /> Start video call</button>}
          <div className="da-actions">
            <a className="btn ghost sm" href={`tel:${a.phone.replace(/[^\d+]/g, '')}`}><Icon name="phone" /> Call</a>
            <a className="btn ghost sm" href={waLink(a.phone)} target="_blank" rel="noreferrer"><Icon name="chat" /> WhatsApp</a>
            {a.status === 'pending' && <button className="btn sm" onClick={() => setStatus('confirmed', 'Confirmed')}>Confirm</button>}
          </div>
        </section>

        <section className="da-sec">
          <h3>Patient</h3>
          <dl className="da-facts">
            <div><dt>Mobile</dt><dd className="mono">{a.phone}</dd></div>
            {ageText && <div><dt>Age</dt><dd>{ageText}</dd></div>}
            {a.booking_for && a.booking_for !== 'Myself' && <div><dt>Booked by</dt><dd>{a.booking_for}</dd></div>}
            {profile?.gender && <div><dt>Gender</dt><dd>{profile.gender}</dd></div>}
            {profile?.blood_group && <div><dt>Blood group</dt><dd>{profile.blood_group}</dd></div>}
          </dl>
          {a.reason && <p><span className="muted">Reason: </span>{a.reason}</p>}
          {profile?.allergies && <p className="alert error"><b>Allergies:</b> {profile.allergies}</p>}
          {profile?.conditions && <p><span className="muted">Conditions: </span>{profile.conditions}</p>}
          {profile?.medicines && <p><span className="muted">Medicines: </span>{profile.medicines}</p>}
          {(a.receipt_path || a.paid) && (
            <div className="da-actions">
              <span className={`pill ${a.paid ? 'green' : 'amber'}`}>{a.paid ? 'Paid ✓' : 'Receipt to check'}</span>
              {a.receipt_path && <button className="btn ghost sm" onClick={viewReceipt}>View receipt</button>}
              {!a.paid && <button className="btn sm" onClick={() => setStatus(a.status === 'pending' ? 'confirmed' : a.status, 'Payment verified', { paid: true })}>Mark paid</button>}
            </div>
          )}
        </section>

        {history.length > 0 && (
          <section className="da-sec">
            <h3>Previous visits <span className="muted">· {history.length}</span></h3>
            {history.slice(0, 4).map(h => (
              <details key={h.id} className="da-prev">
                <summary><b>{dayLabel(h.day, { day: 'numeric', month: 'short', year: 'numeric' })}</b> <span className="muted">· {modeName[h.mode]}</span></summary>
                {h.treatment && <p><span className="muted">Treatment: </span>{h.treatment}</p>}
                {h.prescription && <p style={{ whiteSpace: 'pre-wrap' }}><span className="muted">Prescription: </span>{h.prescription}</p>}
                {h.notes && <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>Notes: {h.notes}</p>}
              </details>
            ))}
          </section>
        )}

        <section className="da-sec">
          <h3>Consultation</h3>
          <div className="field"><label htmlFor="c-tx">Diagnosis / treatment plan <span className="muted">(patient sees)</span></label>
            <textarea id="c-tx" value={tx} onChange={e => setTx(e.target.value)} placeholder="e.g. Type 2 diabetes, HbA1c 7.6%. Low-carb desi diet." /></div>
          <div className="field"><label htmlFor="c-rx">Prescription / diet plan <span className="muted">(patient sees)</span></label>
            <textarea id="c-rx" value={rx} onChange={e => setRx(e.target.value)} style={{ minHeight: 120 }} placeholder={'Breakfast: 1 egg + 1 brown roti\nWalk 20 min after dinner'} /></div>
          <div className="da-chips">{QUICK.map(q => <button key={q} type="button" onClick={() => addQuick(q)}>+ {q}</button>)}</div>
          <div className="field"><label htmlFor="c-notes">Private notes <span className="muted">(only you)</span></label>
            <textarea id="c-notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: 70 }} /></div>
        </section>

        <section className="da-sec">
          <h3>Reports &amp; files</h3>
          <p className="muted" style={{ fontSize: '.85rem' }}>Take a photo of a report or attach a PDF. The patient sees it in their account.</p>
          <VisitFiles appointmentId={a.id} compact />
        </section>

        {['pending', 'confirmed'].includes(a.status) && (
          <section className="da-sec">
            {sure === 'no_show'
              ? <div className="da-actions"><span>Mark as no-show?</span><button className="btn danger sm" onClick={() => setStatus('no_show', 'Marked no-show')}>Yes</button><button className="btn ghost sm" onClick={() => setSure(null)}>No</button></div>
              : sure === 'cancel'
                ? <div className="da-actions"><span>Cancel this appointment?</span><button className="btn danger sm" onClick={() => setStatus('cancelled', 'Cancelled. The slot is free again.')}>Yes, cancel</button><button className="btn ghost sm" onClick={() => setSure(null)}>No</button></div>
                : <div className="da-actions"><button className="btn ghost sm" onClick={() => setSure('no_show')}>No-show</button><button className="btn ghost sm" onClick={() => setSure('cancel')}>Cancel appointment</button></div>}
          </section>
        )}
      </main>

      <footer className="da-savebar">
        <button className="btn ghost" onClick={() => save(false)} disabled={saving || !dirty}>{dirty ? 'Save' : 'Saved'}</button>
        <button className="btn ghost" onClick={() => save(false, true)} disabled={saving || !rx.trim()}><Icon name="chat" /> Send</button>
        {a.status !== 'completed' && <button className="btn" onClick={() => save(true)} disabled={saving}>Finish</button>}
      </footer>
    </div>
  );
}
