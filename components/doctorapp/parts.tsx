'use client';
import type { Appointment } from '@/lib/types';
import { label12, modeName } from '@/lib/util';

const PATHS: Record<string, JSX.Element> = {
  today: <><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /><circle cx="12" cy="15" r="2" /></>,
  cal: <><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4M7 13h2M11 13h2M15 13h2M7 17h2M11 17h2" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18.5 20a6.5 6.5 0 0 0-3-5.5" /></>,
  more: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
  video: <><rect x="2.5" y="6" width="13" height="12" rx="2.5" /><path d="m15.5 10.5 6-3.5v10l-6-3.5" /></>,
  clinic: <><path d="M4 21V8l8-5 8 5v13" /><path d="M10 21v-6h4v6M12 8v4M10 10h4" /></>,
  phone: <path d="M5 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 12l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 5a2 2 0 0 1 2-2z" />,
  chat: <path d="M4 18.5 5.5 15A8 8 0 1 1 9 18.6z" />,
  back: <path d="M15 5l-7 7 7 7" />,
  steth: <><path d="M6 3v6a5 5 0 0 0 10 0V3" /><path d="M11 14v2a5 5 0 0 0 10 0v-1" /><circle cx="21" cy="13" r="2" /></>,
};

export function Icon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{PATHS[name]}</svg>;
}

export const STATUS: Record<Appointment['status'], [string, string]> = {
  pending: ['amber', 'New'], confirmed: ['green', 'Confirmed'], completed: ['grey', 'Done'], cancelled: ['red', 'Cancelled'], no_show: ['red', 'No-show'],
};

export function ApptCard({ a, clinicName, onOpen, past = false }: { a: Appointment; clinicName: string | null; onOpen: () => void; past?: boolean }) {
  const video = Boolean(a.video_room) && !a.clinic_id;
  return (
    <button className={`da-card ${video ? 'video' : 'clinic'} ${past && a.status !== 'completed' ? 'late' : ''} ${a.status === 'completed' ? 'done' : ''}`} onClick={onOpen}>
      <span className="da-time">{label12(String(a.time).slice(0, 5)).replace(' ', '\n')}</span>
      <span className="da-main">
        <b>{a.patient_name}{a.age ? <span className="muted">, {a.age}</span> : null}</b>
        <span className="da-meta">
          <Icon name={video ? 'video' : 'clinic'} />{video ? 'Video' : clinicName || 'Clinic'}{a.mode === 'followup' ? ' · Follow-up' : ''}
        </span>
        {a.reason && <span className="da-reason">{a.reason}</span>}
      </span>
      <span className="da-side">
        <span className={`pill ${STATUS[a.status][0]}`}>{STATUS[a.status][1]}</span>
        {a.receipt_path && !a.paid && <span className="pill amber">Receipt</span>}
        {a.paid && <span className="pill green">Paid</span>}
      </span>
    </button>
  );
}

export { modeName };
