'use client';
import { useEffect, useMemo, useState } from 'react';
import { browserClient } from '@/lib/supabase';
import type { Appointment, Clinic, Patient } from '@/lib/types';
import { dayLabel, modeName, waLink } from '@/lib/util';
import { Icon } from './parts';

type Person = { key: string; name: string; phone: string; visits: Appointment[]; account: Patient | null };
const digits = (p: string) => p.replace(/\D/g, '').slice(-10);

/** Everyone who has booked, grouped by mobile number, with their visits. */
export default function PatientsTab({ clinics }: { clinics: Clinic[] }) {
  const db = browserClient();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Person | null>(null);

  useEffect(() => {
    Promise.all([
      db.from('appointments').select('*').neq('status', 'cancelled').order('day', { ascending: false }).limit(1000),
      db.from('patients').select('*'),
    ]).then(([a, p]: any[]) => {
      const accounts = (p.data || []) as Patient[];
      const map = new Map<string, Person>();
      for (const x of (a.data || []) as Appointment[]) {
        const k = digits(x.phone);
        const cur = map.get(k) || { key: k, name: x.patient_name, phone: x.phone, visits: [], account: null };
        cur.visits.push(x);
        if (x.patient_user_id && !cur.account) cur.account = accounts.find(u => u.user_id === x.patient_user_id) || null;
        map.set(k, cur);
      }
      for (const u of accounts) if (!map.has(digits(u.phone))) map.set(digits(u.phone), { key: digits(u.phone), name: u.full_name, phone: u.phone, visits: [], account: u });
      setPeople([...map.values()]);
    });
  }, []); // eslint-disable-line

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase(), d = q.replace(/\D/g, '');
    return (people || []).filter(p => !t || p.name.toLowerCase().includes(t) || (d.length > 2 && p.key.includes(d)));
  }, [people, q]);
  const where = (a: Appointment) => clinics.find(c => c.id === a.clinic_id)?.name || (a.video_room ? 'Video' : '');

  if (open) return (
    <div style={{ display: 'grid', gap: 12 }}>
      <button className="btn ghost sm" style={{ justifySelf: 'start' }} onClick={() => setOpen(null)}>← Patients</button>
      <section className="da-sec">
        <h2 className="da-h2" style={{ margin: 0 }}>{open.account?.full_name || open.name}</h2>
        <p className="mono muted">{open.phone}</p>
        {open.account?.allergies && <p className="alert error"><b>Allergies:</b> {open.account.allergies}</p>}
        {open.account?.conditions && <p><span className="muted">Conditions: </span>{open.account.conditions}</p>}
        {open.account?.medicines && <p><span className="muted">Medicines: </span>{open.account.medicines}</p>}
        <div className="da-actions">
          <a className="btn ghost sm" href={`tel:${open.phone.replace(/[^\d+]/g, '')}`}><Icon name="phone" /> Call</a>
          <a className="btn ghost sm" href={waLink(open.phone)} target="_blank" rel="noreferrer"><Icon name="chat" /> WhatsApp</a>
        </div>
      </section>
      <section className="da-sec">
        <h3>Visits <span className="muted">· {open.visits.length}</span></h3>
        {open.visits.map(v => (
          <details key={v.id} className="da-prev">
            <summary><b>{dayLabel(v.day, { day: 'numeric', month: 'short', year: 'numeric' })}</b> <span className="muted">· {modeName[v.mode]} · {where(v)} · {v.status}</span></summary>
            {v.reason && <p><span className="muted">Reason: </span>{v.reason}</p>}
            {v.treatment && <p><span className="muted">Treatment: </span>{v.treatment}</p>}
            {v.prescription && <p style={{ whiteSpace: 'pre-wrap' }}><span className="muted">Prescription: </span>{v.prescription}</p>}
            {v.notes && <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>Notes: {v.notes}</p>}
          </details>
        ))}
      </section>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2 className="da-h2">Patients</h2>
      <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or mobile" aria-label="Search patients" />
      {people === null ? <p className="muted">Loading…</p> : shown.length === 0 ? <div className="da-empty">No patient found.</div> : (
        <div className="da-list">
          {shown.map(p => (
            <button key={p.key} className="da-card" onClick={() => setOpen(p)}>
              <span className="da-avatar">{(p.account?.full_name || p.name).split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
              <span className="da-main">
                <b>{p.account?.full_name || p.name}</b>
                <span className="da-meta mono">{p.phone}</span>
                <span className="da-reason">{p.visits.length} visit{p.visits.length === 1 ? '' : 's'}{p.visits[0] ? ` · last ${dayLabel(p.visits[0].day)}` : ''}</span>
              </span>
              <span className="da-side">{p.account && <span className="pill">Account</span>}{p.account?.allergies && <span className="pill red">Allergy</span>}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
