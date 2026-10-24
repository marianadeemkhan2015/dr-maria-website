'use client';
import { useEffect, useState } from 'react';
import type { Settings } from '@/lib/types';
import { fmtPKR } from '@/lib/util';

function Row({ label, value }: { label: string; value?: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(value.replace(/\s/g, '')); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* copying not allowed: the number is still selectable */ }
  };
  return (
    <div className="pay-row">
      <span className="muted">{label}</span>
      <b className="mono" style={{ userSelect: 'all' }}>{value}</b>
      <button type="button" className="btn ghost sm" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
    </div>
  );
}

/** Account details for the chosen method, plus the receipt upload. */
export default function PaymentDetails({ method, s, fee, receipt, onReceipt }:
  { method: string; s: Settings; fee: number; receipt: File | null; onReceipt: (f: File | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!receipt || !receipt.type.startsWith('image/')) { setPreview(null); return; }
    const url = URL.createObjectURL(receipt);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receipt]);

  const pick = (f: File | undefined) => {
    setErr('');
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(f.type)) return setErr('Please attach a photo (JPG or PNG) or a PDF.');
    if (f.size > 5 * 1024 * 1024) return setErr('The file must be under 5 MB.');
    onReceipt(f);
  };

  return (
    <div className="pay-box">
      <p style={{ fontWeight: 700 }}>Send <span style={{ color: 'var(--brand)' }}>{fmtPKR(fee)}</span> to:</p>
      {method === 'JazzCash' && <><Row label="JazzCash number" value={s.jazzcash} /><Row label="Account name" value={s.jazzcash_title} /></>}
      {method === 'Easypaisa' && <><Row label="Easypaisa number" value={s.easypaisa} /><Row label="Account name" value={s.easypaisa_title} /></>}
      {method === 'Bank transfer' && <>
        <Row label="Bank" value={s.bank_name} />
        <Row label="Account title" value={s.bank_title} />
        <Row label="Account number" value={s.bank_account} />
        <Row label="IBAN" value={s.bank_iban} />
      </>}
      {s.payment_note && <p className="muted" style={{ fontSize: '.88rem' }}>{s.payment_note}</p>}

      <div className="receipt">
        <label htmlFor="receipt-file" style={{ fontWeight: 700 }}>Attach payment receipt</label>
        {receipt ? (
          <div className="receipt-chosen">
            {preview ? <img src={preview} alt="Receipt preview" /> : <span className="pill grey">PDF</span>}
            <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{receipt.name}</span>
            <button type="button" className="btn ghost sm" onClick={() => onReceipt(null)}>Change</button>
          </div>
        ) : (
          <label className="receipt-drop" htmlFor="receipt-file">
            <b>Choose screenshot or PDF</b>
            <span className="muted">JPG, PNG or PDF, up to 5 MB</span>
          </label>
        )}
        <input id="receipt-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        {err && <p className="alert error">{err}</p>}
        <p className="muted" style={{ fontSize: '.82rem' }}>Only the doctor and clinic staff can see your receipt.</p>
      </div>
    </div>
  );
}
