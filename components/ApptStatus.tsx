import { fmtPKR, pkDateTime } from '@/lib/util';

type A = {
  status: string; payment_method: string | null; paid: boolean; fee: number | null;
  confirmed_at?: string | null; paid_at?: string | null; has_receipt?: boolean;
};

/** What the patient needs to know: is it confirmed (by whom, when) and what about payment. */
export default function ApptStatus({ a, doctorName }: { a: A; doctorName: string }) {
  const online = ['JazzCash', 'Easypaisa', 'Bank transfer'].includes(a.payment_method || '');
  const active = ['pending', 'confirmed'].includes(a.status);
  return (
    <div className="appt-status">
      {a.status === 'confirmed' && (
        <p className="ok">✓ Confirmed by {doctorName}{a.confirmed_at ? ` on ${pkDateTime(a.confirmed_at)}` : ''}</p>
      )}
      {a.status === 'pending' && <p className="wait">⏳ Waiting for the clinic to confirm{online && !a.paid ? ' (after checking your payment receipt)' : ''}.</p>}
      {(active || a.paid) && (
        online
          ? a.paid
            ? <p className="ok">✓ Payment received by {a.payment_method}{a.paid_at ? ` · checked on ${pkDateTime(a.paid_at)}` : ''}</p>
            : <p className="wait">🧾 {a.has_receipt === false ? `Paying by ${a.payment_method}` : `Receipt sent (${a.payment_method})`} · the clinic is checking it</p>
          : a.paid
            ? <p className="ok">✓ Paid{a.paid_at ? ` on ${pkDateTime(a.paid_at)}` : ''}</p>
            : a.payment_method === 'Pay later'
              ? <p className="muted">💳 Payment: the clinic will send you payment details</p>
              : <p className="muted">💵 Pay {a.fee ? fmtPKR(a.fee) : 'the fee'} at the clinic</p>
      )}
    </div>
  );
}
