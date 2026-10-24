'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { browserClient, isConfigured } from '@/lib/supabase';
import type { Availability, Clinic, Mode, Settings } from '@/lib/types';
import PaymentDetails from './PaymentDetails';
import { addDays, dayLabel, fmtPKR, label12, modeName, pkNowMinutes, pkToday, slotsFor, toMin, waLink } from '@/lib/util';

type Result = { code: string; video_room: string | null; fee: number; day: string; time: string; mode: Mode; clinic: { name: string; address: string } | null };

export default function BookingForm({ settings: s, availability, blocked, clinics, initialMode, initialPayment, initialClinic }:
  { settings: Settings; availability: Availability[]; blocked: string[]; clinics: Clinic[]; initialMode: Mode; initialPayment?: string; initialClinic?: string }) {
  const [mode, setMode] = useState<Mode>(initialMode === 'video' && !s.video_open ? 'clinic' : initialMode);
  // Where the consultation happens: a clinic id, or 'video'.
  const firstClinic = clinics.find(c => c.id === initialClinic)?.id || clinics[0]?.id || 'video';
  const [place, setPlace] = useState<string>(mode === 'video' ? 'video' : firstClinic);
  const where = place === 'video' ? null : place;
  const isVideo = where === null;
  const placeOptions: { id: string; label: string; sub: string }[] = mode === 'video' ? [] : [
    ...clinics.map(c => ({ id: c.id, label: c.name, sub: c.address })),
    ...(mode === 'followup' && s.video_open ? [{ id: 'video', label: 'By video', sub: 'From home' }] : []),
  ];
  const today = pkToday();
  const days = useMemo(() => Array.from({ length: s.booking_days + 1 }, (_, i) => addDays(today, i)), [today, s.booking_days]);
  const dayHasSlots = (d: string) => !blocked.includes(d) && slotsFor(d, where, availability, s.slot_minutes)
    .some(t => d !== today || toMin(t) > pkNowMinutes());
  const [day, setDay] = useState<string>(() => days.find(dayHasSlots) || today);
  const [time, setTime] = useState<string | null>(null);
  const [taken, setTaken] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [bookingFor, setBookingFor] = useState('Myself');
  const [reason, setReason] = useState('');
  const [payment, setPayment] = useState(initialPayment || 'Pay at clinic');
  const [consent, setConsent] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  // Signed-in patients: fill in their details; the booking is saved to their records.
  useEffect(() => {
    if (!isConfigured) return;
    const db = browserClient();
    db.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: p } = await db.from('patients').select('full_name, phone').eq('user_id', data.session.user.id).maybeSingle();
      if (!p) return;
      setAccount(p.full_name);
      setName(n => n || p.full_name); setPhone(x => x || p.phone);
    });
  }, []);

  const fee = mode === 'clinic' ? s.clinic_fee : mode === 'video' ? s.video_fee : s.followup_fee;
  // Only methods the doctor has filled in (in the doctor panel) are offered.
  const online = [
    s.jazzcash && 'JazzCash',
    s.easypaisa && 'Easypaisa',
    (s.bank_account || s.bank_iban) && 'Bank transfer',
  ].filter(Boolean) as string[];
  const payOptions = isVideo
    ? (online.length ? online : ['Pay later'])
    : ['Pay at clinic', ...online];
  const isOnline = ['JazzCash', 'Easypaisa', 'Bank transfer'].includes(payment);

  useEffect(() => {
    if (mode === 'video') setPlace('video');
    else if (place === 'video' && (mode === 'clinic' || !s.video_open)) setPlace(clinics[0]?.id || 'video');
  }, [mode]); // eslint-disable-line
  useEffect(() => { if (!payOptions.includes(payment)) setPayment(payOptions[0]); }, [mode, place]); // eslint-disable-line
  useEffect(() => { if (!dayHasSlots(day)) { const d = days.find(dayHasSlots); if (d) setDay(d); } setTime(null); }, [mode, place]); // eslint-disable-line

  useEffect(() => {
    setTime(null);
    if (!isConfigured) return;
    let live = true;
    setLoadingSlots(true);
    browserClient().rpc('get_taken_slots', { p_day: day }).then(({ data }) => {
      if (!live) return;
      setTaken(((data as string[]) || []).map(t => String(t).slice(0, 5)));
      setLoadingSlots(false);
    });
    return () => { live = false; };
  }, [day]);

  const slots = slotsFor(day, where, availability, s.slot_minutes);
  const isPast = (t: string) => day === today && toMin(t) <= pkNowMinutes();

  const submit = async () => {
    setError('');
    if (!time) return setError('Please pick a time.');
    if (!name.trim() || phone.replace(/\D/g, '').length < 10) return setError('Please enter the patient\'s name and a valid mobile number.');
    if (mode === 'clinic' && !where) return setError('Please choose a clinic.');
    if (isVideo && !consent) return setError('Please confirm the video consultation note.');
    if (isOnline && !receipt) return setError('Please attach the payment receipt in step 4.');
    if (!isConfigured) return setError('The site is not connected to its database yet.');
    setBusy(true);
    let receiptPath: string | null = null;
    if (isOnline && receipt) {
      const ext = receipt.type === 'application/pdf' ? 'pdf' : (receipt.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      receiptPath = `${crypto.randomUUID()}.${ext}`;
      const up = await browserClient().storage.from('receipts').upload(receiptPath, receipt, { contentType: receipt.type });
      if (up.error) { setBusy(false); return setError('The receipt could not be uploaded. Check your internet and try again.'); }
    }
    const { data, error } = await browserClient().rpc('book_appointment', {
      p_mode: mode, p_day: day, p_time: time, p_name: name.trim(), p_phone: phone.trim(),
      p_age: age ? Number(age) : null, p_for: bookingFor, p_reason: reason.trim(), p_payment: payment,
      p_receipt: receiptPath, p_clinic: where,
    });
    setBusy(false);
    if (error) {
      setError(error.message || 'Booking failed. Please try again.');
      const { data: tk } = await browserClient().rpc('get_taken_slots', { p_day: day });
      setTaken(((tk as string[]) || []).map(t => String(t).slice(0, 5)));
      return;
    }
    setResult(data as Result);
    window.scrollTo({ top: 0 });
  };

  if (result) {
    const when = `${dayLabel(result.day, { weekday: 'long', day: 'numeric', month: 'long' })}, ${label12(String(result.time).slice(0, 5))}`;
    const msg = `Assalam o Alaikum, I booked a ${modeName[result.mode].toLowerCase()} (${result.code}) for ${when}${result.clinic ? ' at ' + result.clinic.name : ''}. Name: ${name}.`;
    return (
      <div className="card done">
        <div className="tick">✓</div>
        <h2 style={{ fontSize: '1.7rem' }}>Appointment booked</h2>
        <p className="muted">{modeName[result.mode]} with {s.doctor_name}<br />{when} · {fmtPKR(result.fee)} · {payment}
          {result.clinic && <><br /><b style={{ color: 'var(--ink)' }}>{result.clinic.name}</b>, {result.clinic.address}</>}</p>
        <div className="code" aria-label="Booking code">{result.code}</div>
        {!account && <p className="alert" style={{ fontSize: '.88rem', textAlign: 'start' }}>Create a free <Link href="/patient">patient account</Link> to see all your visits, prescriptions and reports in one place.</p>}
        <p style={{ fontSize: '.92rem' }}>Save this code. Use it with your mobile number on <Link href="/appointment">My appointment</Link> to check status, join the video call or cancel.</p>
        {isOnline && <p className="alert ok">Payment receipt received. The clinic will check it and confirm your booking.</p>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {s.whatsapp && <a className="btn accent" href={waLink(s.whatsapp, msg)} target="_blank" rel="noreferrer">Send confirmation on WhatsApp</a>}
          {result.video_room && <Link className="btn" href={`/consult/${result.video_room}?code=${result.code}`}>Open video room</Link>}
          <Link className="btn ghost" href="/">Back to website</Link>
        </div>
        {result.video_room && <p className="muted" style={{ fontSize: '.85rem' }}>Join the video room at your appointment time from your phone or computer. Allow camera and microphone when asked.</p>}
      </div>
    );
  }

  return (
    <div className="book">
      <div style={{ display: 'grid', gap: 14 }}>
        <section className="card step">
          <h2><span className="n">1</span> Type of consultation</h2>
          <div className="opts">
            <button type="button" className="opt" aria-pressed={mode === 'clinic'} onClick={() => setMode('clinic')}><b>Clinic visit</b><small>{clinics.length > 1 ? `${clinics.length} clinics` : clinics[0]?.name || 'At the clinic'} · {fmtPKR(s.clinic_fee)}</small></button>
            {s.video_open && <button type="button" className="opt" aria-pressed={mode === 'video'} onClick={() => setMode('video')}><b>Video consult</b><small>From home · {fmtPKR(s.video_fee)}</small></button>}
            <button type="button" className="opt" aria-pressed={mode === 'followup'} onClick={() => setMode('followup')}><b>Follow-up</b><small>Existing patients · {fmtPKR(s.followup_fee)}</small></button>
          </div>
          {placeOptions.length > 1 && (
            <>
              <p style={{ fontWeight: 700, fontSize: '.92rem', marginTop: 4 }}>{mode === 'followup' ? 'Where?' : 'Which clinic?'}</p>
              <div className="opts">
                {placeOptions.map(o => (
                  <button key={o.id} type="button" className="opt" aria-pressed={place === o.id} onClick={() => setPlace(o.id)}>
                    <b>{o.label}</b><small>{o.sub}</small>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="card step">
          <h2><span className="n">2</span> Date and time</h2>
          <div className="days" role="group" aria-label="Date">
            {days.map(d => (
              <button key={d} type="button" className="day" aria-pressed={d === day} disabled={!dayHasSlots(d)} onClick={() => setDay(d)}>
                <small>{d === today ? 'Today' : dayLabel(d, { weekday: 'short' })}</small>
                <b>{Number(d.slice(8))}</b>
                <small>{dayLabel(d, { month: 'short' })}</small>
              </button>
            ))}
          </div>
          {slots.length === 0
            ? <p className="muted">No {isVideo ? 'video' : 'clinic'} hours on this day. Pick another date.</p>
            : <div className="slots" role="group" aria-label="Time">
                {slots.map(t => {
                  const off = taken.includes(t) || isPast(t);
                  return <button key={t} type="button" className="slot" disabled={off || loadingSlots} aria-pressed={time === t} onClick={() => setTime(t)}>{label12(t)}</button>;
                })}
              </div>}
        </section>

        <section className="card step">
          <h2><span className="n">3</span> Patient details</h2>
          {account && <p className="alert ok" style={{ fontSize: '.88rem' }}>Signed in as {account}. This booking will be saved to your health records.</p>}
          <div className="grid2">
            <div className="field"><label htmlFor="b-name">Patient name</label><input id="b-name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" maxLength={80} /></div>
            <div className="field"><label htmlFor="b-phone">Mobile (WhatsApp)</label><input id="b-phone" value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="03xx xxxxxxx" maxLength={20} /></div>
            <div className="field"><label htmlFor="b-age">Age</label><input id="b-age" value={age} onChange={e => setAge(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" /></div>
            <div className="field"><label htmlFor="b-for">Booking for</label>
              <select id="b-for" value={bookingFor} onChange={e => setBookingFor(e.target.value)}>
                {['Myself', 'Parent', 'Child', 'Spouse', 'Other'].map(o => <option key={o}>{o}</option>)}
              </select></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label htmlFor="b-reason">Reason for visit (optional)</label><input id="b-reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={500} /></div>
          </div>
        </section>

        <section className="card step">
          <h2><span className="n">4</span> Payment</h2>
          <div className="opts">
            {payOptions.map(p => <button key={p} type="button" className="opt" aria-pressed={payment === p} onClick={() => setPayment(p)}><b>{p}</b></button>)}
          </div>
          {isOnline && <PaymentDetails method={payment} s={s} fee={fee} receipt={receipt} onReceipt={setReceipt} />}
          {payment === 'Pay later' && <p className="muted" style={{ fontSize: '.9rem' }}>The clinic will contact you about payment.</p>}
          {isVideo && (
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '.9rem' }}>
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 5 }} />
              I understand a video consultation is not for emergencies, and I agree to consult by video.
            </label>
          )}
        </section>
      </div>

      <aside className="card summary" aria-label="Summary">
        <b style={{ fontSize: '1.05rem' }}>{s.doctor_name}</b>
        <div className="row"><span>Type</span><span>{modeName[mode]}</span></div>
        <div className="row"><span>Where</span><span style={{ textAlign: 'end' }}>{isVideo ? 'Video call' : clinics.find(c => c.id === where)?.name || '—'}</span></div>
        <div className="row"><span>Date</span><span>{dayLabel(day)}</span></div>
        <div className="row"><span>Time</span><span>{time ? label12(time) : 'Pick a time'}</span></div>
        <div className="row"><span>Payment</span><span>{payment}</span></div>
        <div className="row total"><span>Fee</span><span>{fmtPKR(fee)}</span></div>
        {error && <p className="alert error" role="alert">{error}</p>}
        <button className="btn" onClick={submit} disabled={busy}>{busy ? 'Booking…' : 'Confirm booking'}</button>
        <p className="muted" style={{ fontSize: '.8rem' }}>You can cancel online up to your appointment time from “My appointment”.</p>
      </aside>
    </div>
  );
}
