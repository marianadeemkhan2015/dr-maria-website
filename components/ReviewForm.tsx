'use client';
import { useState } from 'react';
import { browserClient, isConfigured } from '@/lib/supabase';

export default function ReviewForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  if (!open) return <button className="btn ghost sm" style={{ marginTop: 18 }} onClick={() => setOpen(true)}>Leave a review</button>;
  if (state === 'done') return <p className="alert ok" style={{ marginTop: 18 }}>Thank you. Your review will appear after the doctor approves it.</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) { setState('error'); setMsg('The site is not connected to its database yet.'); return; }
    if (!name.trim() || body.trim().length < 10) { setState('error'); setMsg('Please add your name and at least a sentence.'); return; }
    setState('saving');
    const { error } = await browserClient().from('reviews').insert({ name: name.trim().slice(0, 80), rating, body: body.trim().slice(0, 1000), approved: false });
    if (error) { setState('error'); setMsg('Could not send your review. Please try again.'); } else setState('done');
  };

  return (
    <form onSubmit={submit} className="card" style={{ marginTop: 18, padding: 18, display: 'grid', gap: 12, maxWidth: 560 }}>
      <div className="grid2">
        <div className="field"><label htmlFor="rv-name">Your name</label><input id="rv-name" value={name} onChange={e => setName(e.target.value)} maxLength={80} /></div>
        <div className="field"><label htmlFor="rv-rating">Rating</label>
          <select id="rv-rating" value={rating} onChange={e => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}
          </select></div>
      </div>
      <div className="field"><label htmlFor="rv-body">Your experience</label><textarea id="rv-body" value={body} onChange={e => setBody(e.target.value)} maxLength={1000} /></div>
      {state === 'error' && <p className="alert error">{msg}</p>}
      <div><button className="btn sm" disabled={state === 'saving'}>{state === 'saving' ? 'Sending…' : 'Send review'}</button></div>
    </form>
  );
}
