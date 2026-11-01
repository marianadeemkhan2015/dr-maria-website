'use client';
import { useEffect, useMemo, useState } from 'react';
import { browserClient } from '@/lib/supabase';
import type { Availability } from '@/lib/types';
import { addDays, dayLabel, label12, pkNowMinutes, pkToday, slotsFor, toMin, waLink } from '@/lib/util';

type Props = {
  clinicId: string | null;           // null = video hours
  day: string; time: string;         // current date and time
  who: 'doctor' | 'patient';
  onSave: (day: string, time: string) => Promise<string | null>;   // returns an error message, or null when saved
  onClose: () => void;
  /** Doctor only: after moving, offer a WhatsApp message to the patient. */
  tell?: { phone: string; name: string; code: string };
};

/** Pick a new date and time for an existing appointment. Patients see only free times inside the doctor's hours; the doctor can also type any time. */
export default function Reschedule({ clinicId, day: curDay, time: curTime, who, onSave, onClose, tell }: Props) {
  const db = browserClient();
  const today = pkToday();
  const [avail, setAvail] = useState<Availability[] | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [slotMin, setSlotMin] = useState(30);
  const [window_, setWindow] = useState(21);
  const [day, setDay] = useState<string>(curDay >= today ? curDay : today);
  const [time, setTime] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [taken, setTaken] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ day: string; time: string } | null>(null);

  useEffect(() => {
    Promise.all([
      db.from('availability').select('*'),
      db.from('blocked_dates').select('day').gte('day', today),
      db.from('settings').select('slot_minutes, booking_days').eq('id', 1).single(),
    ]).then(([a, b, s]: any[]) => {
      setAvail((a.data || []) as Availability[]);
      setBlocked(((b.data || []) as { day: string }[]).map(x => x.day));
      if (s.data) { setSlotMin(s.data.slot_minutes); setWindow(s.data.booking_days); }
    });
  }, []); // eslint-disable-line

  const days = useMemo(() => Array.from({ length: (who === 'patient' ? window_ : 60) + 1 }, (_, i) => addDays(today, i)), [who, window_, today]);
  const slotsOf = (d: string) => (avail ? slotsFor(d, clinicId, avail, slotMin) : []);
  const usable = (d: string) => !blocked.includes(d) && slotsOf(d).some(t => d !== today || toMin(t) > pkNowMinutes());

  // Start on the first day that has free times.
  useEffect(() => {
    if (!avail || who !== 'patient' || usable(day)) return;
    const d = days.find(usable); if (d) setDay(d);
  }, [avail]); // eslint-disable-line

  useEffect(() => {
    setTime(null); setCustom('');
    let live = true;
    db.rpc('get_taken_slots', { p_day: day }).then(({ data }) => { if (live) setTaken(((data as string[]) || []).map(t => String(t).slice(0, 5))); });
    return () => { live = false; };
  }, [day]); // eslint-disable-line

  const slots = slotsOf(day);
  const isCurrent = (t: string) => day === curDay && t === String(curTime).slice(0, 5);
  const off = (t: string) => taken.includes(t) || (day === today && toMin(t) <= pkNowMinutes());
  const chosen = custom || time;

  const save = async () => {
    setErr('');
    if (!chosen) return setErr('Please pick a time.');
    if (day === curDay && chosen === String(curTime).slice(0, 5)) return setErr('That is the current time. Pick a different one.');
    setBusy(true);
    const e = await onSave(day, chosen);
    setBusy(false);
    if (e) return setErr(e);
    if (tell) setDone({ day, time: chosen }); else onClose();
  };

  if (done && tell) {
    const msg = `Assalam o Alaikum ${tell.name}, your appointment ${tell.code} has been moved to ${dayLabel(done.day, { weekday: 'long', day: 'numeric', month: 'long' })} at ${label12(done.time)}. Please reply if this time does not suit you.`;
    return (
      <div className="resched">
        <p className="alert ok">Moved to <b>{dayLabel(done.day, { weekday: 'long', day: 'numeric', month: 'short' })}, {label12(done.time)}</b>.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a className="btn sm accent" href={waLink(tell.phone, msg)} target="_blank" rel="noreferrer">Tell the patient on WhatsApp</a>
          <button className="btn sm ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="resched">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <b>Choose a new date and time</b>
        <span className="muted" style={{ fontSize: '.85rem' }}>Now: {dayLabel(curDay)}, {label12(String(curTime).slice(0, 5))}</span>
      </div>
      {avail === null ? <p className="muted">Loading times…</p> : <>
        <div className="days" role="group" aria-label="New date">
          {days.map(d => (
            <button key={d} type="button" className="day" aria-pressed={d === day} disabled={who === 'patient' && !usable(d)} onClick={() => setDay(d)}>
              <small>{d === today ? 'Today' : dayLabel(d, { weekday: 'short' })}</small>
              <b>{Number(d.slice(8))}</b>
              <small>{dayLabel(d, { month: 'short' })}</small>
            </button>
          ))}
        </div>
        {who === 'doctor' && blocked.includes(day) && <p className="alert" style={{ fontSize: '.88rem' }}>This date is marked as a day off.</p>}
        {slots.length === 0
          ? <p className="muted">{clinicId ? 'No clinic hours' : 'No video hours'} on this day{who === 'doctor' ? ' — type a time below.' : '. Pick another date.'}</p>
          : <div className="slots" role="group" aria-label="New time">
              {slots.map(t => (
                <button key={t} type="button" className="slot" disabled={off(t) || isCurrent(t)} aria-pressed={!custom && time === t} onClick={() => { setTime(t); setCustom(''); }}>{label12(t)}</button>
              ))}
            </div>}
        {who === 'doctor' && (
          <div className="field" style={{ maxWidth: 220 }}>
            <label htmlFor="rs-custom">Or any other time</label>
            <input id="rs-custom" type="time" value={custom} onChange={e => { setCustom(e.target.value); setTime(null); }} />
          </div>
        )}
      </>}
      {who === 'patient' && <p className="muted" style={{ fontSize: '.85rem' }}>The clinic will confirm the new time.</p>}
      {err && <p className="alert error" role="alert">{err}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn sm" onClick={save} disabled={busy || !chosen}>{busy ? 'Saving…' : chosen ? `Move to ${dayLabel(day)}, ${label12(chosen)}` : 'Move appointment'}</button>
        <button className="btn sm ghost" onClick={onClose}>Keep current time</button>
      </div>
    </div>
  );
}

/** Doctor side: move an appointment (any time; refuses a clash with another booking). */
export async function doctorMove(id: string, from: { day: string; time: string }, day: string, time: string): Promise<string | null> {
  const { error } = await browserClient().from('appointments')
    .update({ day, time, moved_from: `${from.day} ${String(from.time).slice(0, 8)}` }).eq('id', id);
  if (!error) return null;
  return error.code === '23505' ? 'Another patient is already booked at that time.' : 'Could not move: ' + error.message;
}

/** Doctor side: delete an appointment for good, with its payment receipt. Reports stay in the patient's account. */
export async function doctorDelete(id: string, receiptPath: string | null): Promise<string | null> {
  const db = browserClient();
  const { error } = await db.from('appointments').delete().eq('id', id);
  if (error) return 'Could not delete: ' + error.message;
  if (receiptPath) await db.storage.from('receipts').remove([receiptPath]);
  return null;
}

/** "Moved from Wed 4 Nov, 11:30 AM" */
export function movedText(movedFrom: string | null | undefined): string | null {
  if (!movedFrom) return null;
  const [d, t] = String(movedFrom).replace('T', ' ').split(' ');
  return `Moved from ${dayLabel(d)}, ${label12((t || '00:00').slice(0, 5))}`;
}
