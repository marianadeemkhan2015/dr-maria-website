'use client';
import type { Settings } from '@/lib/types';
import { useSettings } from './useSettings';

const TOGGLES: [keyof Settings, string][] = [
  ['booking_open', 'Accept online bookings'], ['video_open', 'Offer video consults'],
  ['show_events', 'Show events on website'], ['show_articles', 'Show articles on website'], ['show_reviews', 'Show reviews on website'],
];

export default function Booking() {
  const { s, set, save, saving, dirty } = useSettings();
  if (!s) return <p className="muted">Loading…</p>;
  const num = (k: keyof Settings, label: string, extra: any = {}) => (
    <div className="field"><label htmlFor={`b-${k}`}>{label}</label>
      <input id={`b-${k}`} type="number" value={s[k] as number} onChange={e => set(k, Number(e.target.value) as any)} {...extra} /></div>
  );
  const text = (k: keyof Settings, label: string) => (
    <div className="field" key={k}><label htmlFor={`b-${k}`}>{label}</label>
      <input id={`b-${k}`} value={(s[k] as string) || ''} onChange={e => set(k, (e.target.value || null) as any)} /></div>
  );
  return (
    <section className="card panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <h2>Fees &amp; booking</h2>
        <button className="btn" onClick={() => save()} disabled={saving || !dirty}>{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button>
      </div>
      <div className="grid2">
        {TOGGLES.map(([k, label]) => (
          <label className="toggle" key={k}>{label}
            <input type="checkbox" className="switch" checked={Boolean(s[k])} onChange={e => set(k, e.target.checked as any)} /></label>
        ))}
      </div>
      <div className="grid2">
        {num('clinic_fee', 'Clinic visit fee (PKR)', { min: 0, step: 100 })}
        {num('video_fee', 'Video consult fee (PKR)', { min: 0, step: 100 })}
        {num('followup_fee', 'Follow-up fee (PKR)', { min: 0, step: 100 })}
        {num('slot_minutes', 'Minutes per appointment', { min: 10, max: 120, step: 5 })}
        {num('booking_days', 'How many days ahead patients can book', { min: 1, max: 90 })}
      </div>
      <h3 style={{ fontSize: '1.05rem' }}>Payment accounts</h3>
      <p className="muted" style={{ fontSize: '.9rem' }}>Patients see these in the booking form when they choose the method, then attach their receipt. Leave a method empty to hide it.</p>
      <div className="grid2">
        {text('jazzcash', 'JazzCash number')}{text('jazzcash_title', 'JazzCash account name')}
        {text('easypaisa', 'Easypaisa number')}{text('easypaisa_title', 'Easypaisa account name')}
        {text('bank_name', 'Bank name')}{text('bank_title', 'Bank account title')}
        {text('bank_account', 'Bank account number')}{text('bank_iban', 'IBAN')}
      </div>
      <div className="field"><label htmlFor="b-note">Payment instructions</label><textarea id="b-note" value={s.payment_note} onChange={e => set('payment_note', e.target.value)} /></div>
    </section>
  );
}
