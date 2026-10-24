'use client';
import { useEffect, useMemo, useState } from 'react';
import { browserClient } from '@/lib/supabase';
import type { Appointment, Clinic, Patient } from '@/lib/types';
import { dayLabel, label12, modeName, waLink } from '@/lib/util';
import VisitFiles from './VisitFiles';

const age = (dob: string | null) => {
  if (!dob) return null;
  const d = new Date(dob), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
};

/** Registered patients with their health profile, visit history and files. */
export default function Patients() {
  const db = browserClient();
  const [list, setList] = useState<Patient[]>([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Patient | null>(null);

  useEffect(() => {
    db.from('patients').select('*').order('created_at', { ascending: false }).then(({ data }: any) => setList((data || []) as Patient[]));
  }, []); // eslint-disable-line

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase(), d = q.replace(/\D/g, '');
    return list.filter(p => !t || p.full_name.toLowerCase().includes(t) || (d.length > 2 && p.phone.replace(/\D/g, '').includes(d)));
  }, [list, q]);

  if (open) return <PatientFile p={open} back={() => setOpen(null)} />;

  return (
    <section className="card panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <h2>Patients</h2>
        <span className="muted">{list.length} with an account</span>
      </div>
      <p className="muted">Patients who created an account on your website. Open one to see their health profile, every visit and their files.</p>
      <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or mobile number" aria-label="Search patients" />
      {shown.length === 0 && <p className="muted">{list.length ? 'No patient matches.' : 'No patient accounts yet. Patients sign up from “Patient login” on your website.'}</p>}
      {shown.map(p => (
        <button key={p.user_id} className="list-item" style={{ textAlign: 'start', cursor: 'pointer' }} onClick={() => setOpen(p)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <b>{p.full_name}</b>
            <span className="mono muted">{p.phone}</span>
          </div>
          <span className="muted" style={{ fontSize: '.85rem' }}>
            {[age(p.dob) !== null && `${age(p.dob)} yrs`, p.gender, p.conditions].filter(Boolean).join(' · ') || 'Profile not filled in yet'}
          </span>
        </button>
      ))}
    </section>
  );
}

function PatientFile({ p, back }: { p: Patient; back: () => void }) {
  const db = browserClient();
  const [visits, setVisits] = useState<Appointment[] | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  useEffect(() => {
    Promise.all([
      db.from('appointments').select('*').eq('patient_user_id', p.user_id).order('day', { ascending: false }),
      db.from('clinics').select('*'),
    ]).then(([a, c]: any[]) => { setVisits((a.data || []) as Appointment[]); setClinics((c.data || []) as Clinic[]); });
  }, [p.user_id]); // eslint-disable-line
  const where = (a: Appointment) => clinics.find(c => c.id === a.clinic_id)?.name || (a.video_room ? 'Video call' : '');
  const facts: [string, string | null][] = [
    ['Age', age(p.dob) !== null ? `${age(p.dob)} years (${dayLabel(p.dob!, { day: 'numeric', month: 'short', year: 'numeric' })})` : null],
    ['Gender', p.gender], ['Blood group', p.blood_group], ['Conditions', p.conditions], ['Current medicines', p.medicines], ['Allergies', p.allergies],
  ];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <section className="card panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn ghost sm" onClick={back}>← All patients</button>
          <a className="btn ghost sm" href={waLink(p.phone, `Assalam o Alaikum ${p.full_name},`)} target="_blank" rel="noreferrer">WhatsApp</a>
        </div>
        <div>
          <h2>{p.full_name}</h2>
          <p className="muted mono">{p.phone}</p>
        </div>
        <dl className="facts">
          {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className={v ? '' : 'muted'}>{v || '—'}</dd></div>)}
        </dl>
        {p.allergies && <p className="alert error"><b>Allergies:</b> {p.allergies}</p>}
      </section>

      <section className="card panel">
        <h2>Visits {visits && <span className="muted" style={{ fontSize: '.9rem', fontWeight: 500 }}>({visits.length})</span>}</h2>
        {visits === null ? <p className="muted">Loading…</p> : visits.length === 0 ? <p className="muted">No visits linked to this account yet.</p> : visits.map(a => (
          <div key={a.id} className="visit">
            <div className="visit-date"><b>{Number(a.day.slice(8))}</b><span>{dayLabel(a.day, { month: 'short', year: 'numeric' })}</span></div>
            <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
              <div><b>{modeName[a.mode]}</b> <span className="muted" style={{ fontSize: '.86rem' }}>· {label12(String(a.time).slice(0, 5))} · {where(a)} · {a.status}{a.booking_for && a.booking_for !== 'Myself' ? ` · for ${a.patient_name} (${a.booking_for})` : ''}</span></div>
              {a.reason && <p className="muted" style={{ fontSize: '.9rem' }}>Reason: {a.reason}</p>}
              {a.treatment && <div className="pt-note"><b>Treatment plan</b><p>{a.treatment}</p></div>}
              {a.prescription && <div className="pt-note rx"><b>Prescription / diet plan</b><p>{a.prescription}</p></div>}
              {a.notes && <div className="pt-note" style={{ background: 'var(--surface-2)' }}><b style={{ color: 'var(--muted)' }}>Private notes</b><p>{a.notes}</p></div>}
              <VisitFiles appointmentId={a.id} compact />
            </div>
          </div>
        ))}
      </section>

      <section className="card panel">
        <h2>Other files</h2>
        <p className="muted" style={{ fontSize: '.9rem' }}>Reports the patient uploaded, and files you add here that aren’t tied to one visit.</p>
        <PatientLevelFiles patientId={p.user_id} />
      </section>
    </div>
  );
}

function PatientLevelFiles({ patientId }: { patientId: string }) {
  return <VisitFiles patientId={patientId} compact />;
}
