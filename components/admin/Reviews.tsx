'use client';
import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase';
import type { Review } from '@/lib/types';
import { useToast } from './Toast';

export default function Reviews() {
  const db = browserClient();
  const toast = useToast();
  const [rows, setRows] = useState<Review[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const load = async () => {
    const { data } = await db.from('reviews').select('*').order('approved').order('created_at', { ascending: false });
    const list = (data || []) as Review[];
    setRows(list);
    setReplies(Object.fromEntries(list.map(r => [r.id, r.reply || ''])));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line
  const patch = async (id: string, p: Partial<Review>, msg: string) => {
    const { error } = await db.from('reviews').update(p).eq('id', id);
    if (error) toast(error.message); else { toast(msg); load(); }
  };
  const del = async (id: string) => { await db.from('reviews').delete().eq('id', id); setConfirmDel(null); load(); };
  const waiting = rows.filter(r => !r.approved).length;
  const shown = rows.filter(r => r.approved);
  const avg = shown.length ? (shown.reduce((a, r) => a + r.rating, 0) / shown.length).toFixed(1) : '—';

  return (
    <section className="card panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <h2>Patient reviews</h2>
        <span className="muted">{avg} ★ on website · {shown.length} shown · {waiting} waiting</span>
      </div>
      <p className="muted">New reviews stay hidden until you show them. Add a reply to thank the patient or answer a question: it appears under the review on your website.</p>
      {rows.length === 0 && <p className="muted">No reviews yet. Patients can review from the website, or from “My appointment” after a visit.</p>}
      {rows.map(r => {
        const dirty = (replies[r.id] || '') !== (r.reply || '');
        return (
          <div key={r.id} className="list-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <span><b>{r.name}</b> <span className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                {r.verified && <span className="pill green" style={{ marginInlineStart: 8 }}>✔ Verified patient</span>}</span>
              <span className={`pill ${r.approved ? 'green' : 'amber'}`}>{r.approved ? 'On website' : 'Waiting'}</span>
            </div>
            <p>{r.body}</p>
            <div className="field">
              <label htmlFor={`rp-${r.id}`}>Your reply (optional, shown on the website)</label>
              <textarea id={`rp-${r.id}`} value={replies[r.id] || ''} style={{ minHeight: 70 }} maxLength={600}
                placeholder="e.g. Thank you, Ayesha! Keep it up and see you at your follow-up."
                onChange={e => setReplies(x => ({ ...x, [r.id]: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {dirty && <button className="btn sm accent" onClick={() => patch(r.id, { reply: replies[r.id].trim() || null }, replies[r.id].trim() ? 'Reply saved' : 'Reply removed')}>Save reply</button>}
              {r.approved
                ? <button className="btn ghost sm" onClick={() => patch(r.id, { approved: false }, 'Hidden from website')}>Hide</button>
                : <button className="btn sm" onClick={() => patch(r.id, { approved: true, reply: replies[r.id]?.trim() || r.reply }, 'Shown on website')}>Show on website</button>}
              {confirmDel === r.id
                ? <><button className="btn danger sm" onClick={() => del(r.id)}>Delete for good</button><button className="btn ghost sm" onClick={() => setConfirmDel(null)}>Keep</button></>
                : <button className="btn ghost sm" onClick={() => setConfirmDel(r.id)}>Delete</button>}
            </div>
          </div>
        );
      })}
    </section>
  );
}
