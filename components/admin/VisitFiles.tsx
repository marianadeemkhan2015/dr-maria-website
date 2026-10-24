'use client';
import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase';
import type { Report } from '@/lib/types';
import { dayLabel } from '@/lib/util';
import { useToast } from './Toast';

/** Reports and files for one visit, or for one patient (no visit). The patient sees them in their records. */
export default function VisitFiles({ appointmentId, patientId, compact = false }: { appointmentId?: string; patientId?: string | null; compact?: boolean }) {
  const db = browserClient();
  const toast = useToast();
  const [rows, setRows] = useState<Report[]>([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<string | null>(null);
  const inputId = `vf-${appointmentId || patientId}`;

  const load = async () => {
    let q = db.from('reports').select('*').order('created_at', { ascending: false });
    q = appointmentId ? q.eq('appointment_id', appointmentId) : q.eq('patient_user_id', patientId).is('appointment_id', null);
    const { data } = await q;
    setRows((data || []) as Report[]);
  };
  useEffect(() => { load(); }, [appointmentId, patientId]); // eslint-disable-line

  const open = async (r: Report) => {
    const tab = window.open('', '_blank');
    const { data, error } = await db.storage.from('reports').createSignedUrl(r.file_path, 600);
    if (error || !data) { tab?.close(); return toast('Could not open the file.'); }
    if (tab) tab.location.href = data.signedUrl; else window.location.href = data.signedUrl;
  };
  const upload = async () => {
    if (!file) return toast('Choose a file first.');
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type) || file.size > 10 * 1024 * 1024) return toast('Use a JPG, PNG or PDF under 10 MB.');
    setBusy(true);
    const ext = file.type === 'application/pdf' ? 'pdf' : (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const path = `doctor/${appointmentId || patientId}/${crypto.randomUUID()}.${ext}`;
    const up = await db.storage.from('reports').upload(path, file, { contentType: file.type });
    if (up.error) { setBusy(false); return toast('Upload failed: ' + up.error.message); }
    const { error } = await db.from('reports').insert({ appointment_id: appointmentId || null, patient_user_id: patientId || null, title: title.trim() || file.name, file_path: path, uploaded_by: 'doctor' });
    setBusy(false);
    if (error) return toast('Could not save: ' + error.message);
    setTitle(''); setFile(null); toast(patientId || appointmentId ? 'File added. The patient can see it in their records.' : 'File added'); load();
  };
  const remove = async (r: Report) => {
    await db.from('reports').delete().eq('id', r.id);
    await db.storage.from('reports').remove([r.file_path]);
    setDel(null); load();
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {!compact && <b style={{ fontSize: '.9rem' }}>Reports &amp; files</b>}
      {rows.map(r => (
        <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="file" onClick={() => open(r)}>{r.title}</button>
          <span className="muted" style={{ fontSize: '.78rem' }}>{r.uploaded_by === 'patient' ? 'from patient' : 'by you'} · {dayLabel(r.created_at.slice(0, 10))}</span>
          {del === r.id
            ? <><button className="btn danger sm" onClick={() => remove(r)}>Delete</button><button className="btn ghost sm" onClick={() => setDel(null)}>Keep</button></>
            : <button className="btn ghost sm" onClick={() => setDel(r.id)} aria-label="Delete file">✕</button>}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" style={{ flex: '1 1 180px', width: 'auto' }} value={title} onChange={e => setTitle(e.target.value)} placeholder="Title, e.g. Diet plan, Lipid profile" aria-label="File title" />
        <label className="btn ghost sm" htmlFor={inputId}>{file ? file.name.slice(0, 24) : 'Choose file'}</label>
        <input id={inputId} type="file" hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
        <button className="btn sm" onClick={upload} disabled={busy || !file}>{busy ? 'Uploading…' : 'Add file'}</button>
      </div>
    </div>
  );
}
