'use client';
import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase';
import type { Availability, Clinic } from '@/lib/types';
import { dayLabel, hoursLines, label12, pkToday } from '@/lib/util';
import { useToast } from './Toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function Hours() {
  const db = browserClient();
  const toast = useToast();
  const [rows, setRows] = useState<Availability[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [blocked, setBlocked] = useState<{ day: string; reason: string | null }[]>([]);
  // place = a clinic id, or 'video'
  const [newRow, setNewRow] = useState({ place: '', days: [1] as number[], start_time: '17:00', end_time: '21:00' });
  const [off, setOff] = useState({ day: pkToday(), reason: '' });

  const load = async () => {
    const [a, b, c] = await Promise.all([
      db.from('availability').select('*').order('weekday').order('start_time'),
      db.from('blocked_dates').select('*').gte('day', pkToday()).order('day'),
      db.from('clinics').select('*').order('sort'),
    ]);
    setRows((a.data || []) as Availability[]);
    setBlocked((b.data || []) as any);
    const cl = (c.data || []) as Clinic[];
    setClinics(cl);
    setNewRow(r => (r.place ? r : { ...r, place: cl[0]?.id || 'video' }));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const toggleDay = (d: number) => setNewRow(r => ({ ...r, days: r.days.includes(d) ? r.days.filter(x => x !== d) : [...r.days, d] }));
  const add = async () => {
    if (!newRow.days.length) return toast('Choose at least one day.');
    if (newRow.end_time <= newRow.start_time) return toast('End time must be after start time.');
    const video = newRow.place === 'video';
    const inserts = newRow.days.map(d => ({ weekday: d, mode: video ? 'video' : 'clinic', clinic_id: video ? null : newRow.place, start_time: newRow.start_time, end_time: newRow.end_time }));
    const { error } = await db.from('availability').insert(inserts);
    if (error) toast(error.message); else { toast('Hours added'); load(); }
  };
  const remove = async (id: string) => {
    const { error } = await db.from('availability').delete().eq('id', id);
    if (error) toast(error.message); else load();
  };
  const addOff = async () => {
    const { error } = await db.from('blocked_dates').upsert({ day: off.day, reason: off.reason || null });
    if (error) toast(error.message); else { toast('Day off saved. Patients can’t book that date.'); load(); }
  };
  const removeOff = async (day: string) => { await db.from('blocked_dates').delete().eq('day', day); load(); };

  const groups = [
    ...clinics.map(c => ({ key: c.id, title: c.name, sub: c.address, rows: rows.filter(r => r.mode === 'clinic' && r.clinic_id === c.id) })),
    { key: 'video', title: 'Video consults', sub: 'Online, from anywhere', rows: rows.filter(r => r.mode === 'video') },
  ];
  const orphan = rows.filter(r => r.mode === 'clinic' && !clinics.some(c => c.id === r.clinic_id));

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <section className="card panel">
        <h2>Weekly hours</h2>
        <p className="muted">Each clinic has its own hours. Patients can only book inside them, and you can’t be booked at two places at the same time.</p>
        {clinics.length === 0 && <p className="alert">Add your clinics first in the <b>Clinics</b> tab.</p>}
        {groups.map(g => (
          <div key={g.key} className="list-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <b>{g.title}</b><span className="muted" style={{ fontSize: '.85rem' }}>{hoursLines(g.rows).join('  ·  ') || 'No hours yet'}</span>
            </div>
            {g.rows.length > 0 && (
              <div className="table-wrap">
                <table className="plain">
                  <tbody>
                    {[...g.rows].sort((a, b) => ORDER.indexOf(a.weekday) - ORDER.indexOf(b.weekday) || a.start_time.localeCompare(b.start_time)).map(r => (
                      <tr key={r.id}>
                        <td>{DAYS[r.weekday]}</td>
                        <td className="mono">{label12(r.start_time.slice(0, 5))} – {label12(r.end_time.slice(0, 5))}</td>
                        <td style={{ textAlign: 'end' }}><button className="btn ghost sm" onClick={() => remove(r.id)}>Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {orphan.length > 0 && <p className="alert">{orphan.length} hour block(s) belong to a deleted clinic and are ignored.</p>}

        <div className="list-item" style={{ background: 'var(--surface-2)' }}>
          <b>Add hours</b>
          <div className="grid2">
            <div className="field"><label htmlFor="h-place">Where</label>
              <select id="h-place" value={newRow.place} onChange={e => setNewRow({ ...newRow, place: e.target.value })}>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="video">Video consults</option>
              </select></div>
            <div className="grid2" style={{ gap: 10 }}>
              <div className="field"><label htmlFor="h-from">From</label><input id="h-from" type="time" value={newRow.start_time} onChange={e => setNewRow({ ...newRow, start_time: e.target.value })} /></div>
              <div className="field"><label htmlFor="h-to">To</label><input id="h-to" type="time" value={newRow.end_time} onChange={e => setNewRow({ ...newRow, end_time: e.target.value })} /></div>
            </div>
          </div>
          <div className="field"><label>Days</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ORDER.map(d => <button key={d} type="button" className={`btn sm ${newRow.days.includes(d) ? '' : 'ghost'}`} aria-pressed={newRow.days.includes(d)} onClick={() => toggleDay(d)}>{DAYS[d].slice(0, 3)}</button>)}
            </div></div>
          <div><button className="btn sm accent" onClick={add}>Add hours</button></div>
        </div>
      </section>

      <section className="card panel">
        <h2>Days off</h2>
        <p className="muted">Travel, conferences or holidays. Patients won’t see slots on these dates at any clinic.</p>
        {blocked.length > 0 && (
          <div style={{ display: 'grid', gap: 6 }}>
            {blocked.map(b => (
              <div key={b.day} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <span><b>{dayLabel(b.day, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</b> {b.reason && <span className="muted">· {b.reason}</span>}</span>
                <button className="btn ghost sm" onClick={() => removeOff(b.day)}>Remove</button>
              </div>
            ))}
          </div>
        )}
        <div className="grid2">
          <div className="field"><label htmlFor="o-day">Date</label><input id="o-day" type="date" value={off.day} onChange={e => setOff({ ...off, day: e.target.value })} /></div>
          <div className="field"><label htmlFor="o-reason">Reason (private)</label><input id="o-reason" value={off.reason} onChange={e => setOff({ ...off, reason: e.target.value })} /></div>
        </div>
        <div><button className="btn sm" onClick={addOff}>Add day off</button></div>
      </section>
    </div>
  );
}
