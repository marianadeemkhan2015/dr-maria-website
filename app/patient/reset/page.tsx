'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { browserClient } from '@/lib/supabase';

/** Patients land here from the "Forgot password" email. */
export default function PatientReset() {
  const db = browserClient();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    db.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => setReady(Boolean(s)));
    return () => sub.subscription.unsubscribe();
  }, []); // eslint-disable-line

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setMsg({ kind: 'error', text: 'Use at least 8 characters.' });
    const { error } = await db.auth.updateUser({ password: pw });
    setMsg(error ? { kind: 'error', text: error.message } : { kind: 'ok', text: 'Password changed.' });
  };

  return (
    <main className="wrap">
      <form onSubmit={save} className="card panel" style={{ maxWidth: 420, margin: '64px auto' }}>
        <h2>Set a new password</h2>
        {!ready && <p className="muted">Open this page from the link in the reset email.</p>}
        <div className="field"><label htmlFor="pnp">New password</label><input id="pnp" type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" disabled={!ready} /></div>
        {msg && <p className={`alert ${msg.kind}`}>{msg.text}</p>}
        <button className="btn" disabled={!ready}>Save password</button>
        <Link href="/patient" className="btn ghost sm">Go to my records</Link>
      </form>
    </main>
  );
}
