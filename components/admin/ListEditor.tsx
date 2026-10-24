'use client';
import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase';
import { useToast } from './Toast';

export type Field = {
  key: string; label: string;
  type?: 'text' | 'textarea' | 'number' | 'date' | 'image' | 'checkbox';
  placeholder?: string;
};

/** Add, edit, reorder and delete rows of a simple content table (services, events). */
export default function ListEditor({ table, title, fields, blank, order, hint, titleKey = 'title' }:
  { table: string; title: string; fields: Field[]; blank: Record<string, any>; order: string; hint?: string; titleKey?: string }) {
  const db = browserClient();
  const toast = useToast();
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const sortable = order === 'sort';

  const load = async () => {
    const { data } = await db.from(table).select('*').order(order);
    setRows(data || []); setDirty(new Set());
  };
  useEffect(() => { load(); }, [table]); // eslint-disable-line

  const edit = (id: string, k: string, v: any) => {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, [k]: v } : r)));
    setDirty(d => new Set(d).add(id));
  };
  const clean = (r: Record<string, any>) => {
    const body = { ...r }; delete body.id;
    for (const f of fields) {
      if (body[f.key] === '' && (f.type === 'number' || f.type === 'image' || f.key === 'link')) body[f.key] = null;
    }
    return body;
  };
  const save = async (r: Record<string, any>) => {
    const { error } = await db.from(table).update(clean(r)).eq('id', r.id);
    if (error) return toast('Could not save: ' + error.message);
    toast('Saved. The website is updated.');
    setDirty(d => { const n = new Set(d); n.delete(r.id); return n; });
  };
  const add = async () => {
    const body = sortable ? { ...blank, sort: (rows.at(-1)?.sort ?? 0) + 1 } : blank;
    const { error } = await db.from(table).insert(body);
    if (error) toast(error.message); else { await load(); toast('Added at the bottom. Edit it, then press Save.'); }
  };
  const del = async (id: string) => {
    const { error } = await db.from(table).delete().eq('id', id);
    setConfirmDel(null);
    if (error) toast(error.message); else load();
  };
  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    const updates = next.map((r, k) => ({ id: r.id, sort: k + 1 }));
    setRows(next.map((r, k) => ({ ...r, sort: k + 1 })));
    const results = await Promise.all(updates.map(u => db.from(table).update({ sort: u.sort }).eq('id', u.id)));
    if (results.some(r => r.error)) { toast('Could not reorder. Please try again.'); load(); } else toast('Order saved');
  };
  const upload = async (id: string, key: string, file: File) => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return toast('Choose an image under 5 MB.');
    setUploading(id + key);
    const path = `${table}-${Date.now()}.${(file.name.split('.').pop() || 'jpg').toLowerCase()}`;
    const { error } = await db.storage.from('media').upload(path, file, { contentType: file.type });
    setUploading(null);
    if (error) return toast('Upload failed: ' + error.message);
    edit(id, key, db.storage.from('media').getPublicUrl(path).data.publicUrl);
  };

  const input = (r: Record<string, any>, f: Field) => {
    const id = `${table}-${r.id}-${f.key}`;
    if (f.type === 'textarea') return <textarea id={id} value={r[f.key] ?? ''} onChange={e => edit(r.id, f.key, e.target.value)} placeholder={f.placeholder} />;
    if (f.type === 'checkbox') return (
      <label className="toggle" htmlFor={id}>{r[f.key] ? 'Shown on website' : 'Hidden'}
        <input id={id} type="checkbox" className="switch" checked={Boolean(r[f.key])} onChange={e => edit(r.id, f.key, e.target.checked)} /></label>);
    if (f.type === 'image') return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {r[f.key] && <img src={r[f.key]} alt="" style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 8 }} />}
        <label className="btn ghost sm">{uploading === r.id + f.key ? 'Uploading…' : r[f.key] ? 'Change' : 'Upload image'}
          <input id={id} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && upload(r.id, f.key, e.target.files[0])} /></label>
        {r[f.key] && <button className="btn ghost sm" onClick={() => edit(r.id, f.key, null)}>Remove</button>}
      </div>);
    return <input id={id} type={f.type || 'text'} value={r[f.key] ?? ''} placeholder={f.placeholder}
      onChange={e => edit(r.id, f.key, f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />;
  };

  return (
    <section className="card panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <h2>{title}</h2>
        <button className="btn sm accent" onClick={add}>+ Add</button>
      </div>
      {hint && <p className="muted">{hint}</p>}
      {rows.length === 0 && <p className="muted">Nothing here yet. Press “+ Add”.</p>}
      {rows.map((r, i) => (
        <div key={r.id} className="list-item" style={r.visible === false ? { opacity: .7 } : undefined}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <b>{r[titleKey] || 'Untitled'}</b>
            {sortable && (
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn ghost sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button className="btn ghost sm" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">↓</button>
              </div>
            )}
          </div>
          <div className="grid2">
            {fields.map(f => (
              <div key={f.key} className="field" style={f.type === 'textarea' || f.type === 'image' ? { gridColumn: '1 / -1' } : undefined}>
                {f.type !== 'checkbox' && <label htmlFor={`${table}-${r.id}-${f.key}`}>{f.label}</label>}
                {f.type === 'checkbox' && <label>{f.label}</label>}
                {input(r, f)}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn sm" onClick={() => save(r)} disabled={!dirty.has(r.id)}>{dirty.has(r.id) ? 'Save' : 'Saved'}</button>
            {confirmDel === r.id
              ? <><button className="btn danger sm" onClick={() => del(r.id)}>Delete for good</button><button className="btn ghost sm" onClick={() => setConfirmDel(null)}>Keep</button></>
              : <button className="btn ghost sm" onClick={() => setConfirmDel(r.id)}>Delete</button>}
          </div>
        </div>
      ))}
    </section>
  );
}
