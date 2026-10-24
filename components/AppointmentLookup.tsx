'use client';
import { useState } from 'react';
import Link from 'next/link';
import { browserClient, isConfigured } from '@/lib/supabase';
import { dayLabel, fmtPKR, label12, modeName, waLink } from '@/lib/util';

type Appt = { code: string; mode: 'clinic' | 'video' | 'followup'; day: string; time: string; status: string; patient_name: string; video_room: string | null; prescription: string | null; fee: number; payment_method: string | null; paid: boolean; clinic_name: string | null; clinic_address: string | null; clinic_map: string | null; reviewed: boolean };
const statusText: Record<string, [string, string]> = {
  pending: ['amber', 'Booked, awaiting confirmation'], confirmed: ['green', 'Confirmed'], completed: ['grey', 'Completed'],
  cancelled: ['red', 'Cancelled'], no_show: ['red', 'Missed'],
};

export default function AppointmentLookup({ whatsapp }: { whatsapp: string }) {
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [appt, setAppt] = useState<Appt | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const find = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(''); setAppt(null); setConfirmCancel(false);
    if (!isConfigured) return setError('The site is not connected to its database yet.');
    setBusy(true);
    const { data, error } = await browserClient().rpc('get_appointment', { p_code: code, p_phone: phone });
    setBusy(false);
    if (error || !data) return setError('No appointment found. Check the booking code and the mobile number used when booking.');
    setAppt(data as Appt);
  };

  const cancel = async () => {
    setBusy(true);
    const { data } = await browserClient().rpc('cancel_appointment', { p_code: code, p_phone: phone });
    setBusy(false);
    if (data) await find(); else setError('This appointment can no longer be cancelled online. Please contact the clinic.');
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <form onSubmit={find} className="card" style={{ padding: 18, display: 'grid', gap: 12 }}>
        <div className="grid2">
          <div className="field"><label htmlFor="l-code">Booking code</label><input id="l-code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="TB-XXXXXX" /></div>
          <div className="field"><label htmlFor="l-phone">Mobile number</label><input id="l-phone" value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" placeholder="03xx xxxxxxx" /></div>
        </div>
        <div><button className="btn" disabled={busy || !code || !phone}>{busy ? 'Checking…' : 'Find my appointment'}</button></div>
      </form>
      {error && <p className="alert error" role="alert">{error}</p>}
      {appt && (
        <div className="card" style={{ padding: 20, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <b className="mono" style={{ fontSize: '1rem' }}>{appt.code}</b>
            <span className={`pill ${statusText[appt.status]?.[0] || 'grey'}`}>{statusText[appt.status]?.[1] || appt.status}</span>
          </div>
          <p><b>{appt.patient_name}</b> · {modeName[appt.mode]}<br />
            {dayLabel(appt.day, { weekday: 'long', day: 'numeric', month: 'long' })}, {label12(String(appt.time).slice(0, 5))} · {fmtPKR(appt.fee)}
            {appt.clinic_name && <><br /><b>{appt.clinic_name}</b>{appt.clinic_address && `, ${appt.clinic_address}`}
              {appt.clinic_map && <> · <a href={appt.clinic_map} target="_blank" rel="noreferrer">Map</a></>}</>}</p>
          {appt.payment_method && appt.payment_method !== 'Pay at clinic' && (
            <p><span className={`pill ${appt.paid ? 'green' : 'amber'}`}>{appt.paid ? 'Payment received' : 'Receipt sent, being checked'}</span> <span className="muted">{appt.payment_method}</span></p>
          )}
          {appt.prescription && (
            <div className="alert ok" style={{ whiteSpace: 'pre-wrap' }}><b>Doctor’s advice / prescription</b><br />{appt.prescription}</div>
          )}
          {appt.status === 'completed' && (appt.reviewed
            ? <p className="alert ok">Thank you for your review.</p>
            : <VisitReview code={code} phone={phone} onDone={() => setAppt({ ...appt, reviewed: true })} />)}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {appt.video_room && ['pending', 'confirmed'].includes(appt.status) && <Link className="btn" href={`/consult/${appt.video_room}?code=${appt.code}`}>Join video call</Link>}
            {whatsapp && <a className="btn ghost" href={waLink(whatsapp, `About my appointment ${appt.code}`)} target="_blank" rel="noreferrer">Message clinic</a>}
            {['pending', 'confirmed'].includes(appt.status) && !confirmCancel && <button className="btn ghost" onClick={() => setConfirmCancel(true)}>Cancel appointment</button>}
          </div>
          {confirmCancel && (
            <div className="alert" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              Cancel this appointment? The time will be given to another patient.
              <button className="btn danger sm" onClick={cancel} disabled={busy}>Yes, cancel</button>
              <button className="btn ghost sm" onClick={() => setConfirmCancel(false)}>Keep it</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function VisitReview({ code, phone, onDone }: { code: string; phone: string; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setErr('');
    if (body.trim().length < 10) return setErr('Please write a sentence or two.');
    setBusy(true);
    const { error } = await browserClient().rpc('submit_review', { p_code: code, p_phone: phone, p_rating: rating, p_body: body.trim() });
    setBusy(false);
    if (error) return setErr(error.message);
    onDone();
  };
  return (
    <div className="list-item" style={{ background: 'var(--surface-2)' }}>
      <b>How was your consultation?</b>
      <div role="radiogroup" aria-label="Rating" style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => setRating(n)} style={{ border: 0, background: 'none', fontSize: '1.7rem', lineHeight: 1, color: n <= rating ? 'var(--accent)' : 'var(--line)', padding: 2 }}>★</button>
        ))}
      </div>
      <div className="field"><label htmlFor="vr-body">Your review (shown with your first name and a “Verified patient” badge after the doctor approves it)</label>
        <textarea id="vr-body" value={body} onChange={e => setBody(e.target.value)} maxLength={1000} /></div>
      {err && <p className="alert error">{err}</p>}
      <div><button className="btn sm" onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Send review'}</button></div>
    </div>
  );
}
