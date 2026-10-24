'use client';
import type { Settings } from '@/lib/types';
import { useSettings } from './useSettings';

const CONTACT: [keyof Settings, string, string][] = [
  ['whatsapp', 'WhatsApp number', '+92 300 0000000'],
  ['phone', 'Phone / landline (optional)', '042 0000000'],
  ['email', 'Email (optional)', 'clinic@example.com'],
];
const SOCIAL: [keyof Settings, string][] = [
  ['facebook', 'Facebook page link'], ['instagram', 'Instagram link'], ['tiktok', 'TikTok link'], ['youtube', 'YouTube channel link'],
];
const TEXTS: [keyof Settings, string][] = [
  ['footer_clinics_title', 'Clinics heading'], ['footer_contact_title', 'Contact heading'],
  ['footer_timings_text', 'Timings link text (leave empty to hide)'], ['footer_qr_title', 'QR code title'],
];

/** Contact details, social links and every line of the website footer. */
export default function FooterSettings() {
  const { s, set, save, saving, dirty } = useSettings();
  if (!s) return <p className="muted">Loading…</p>;
  const input = (k: keyof Settings, label: string, ph = '') => (
    <div className="field" key={k}><label htmlFor={`ft-${k}`}>{label}</label>
      <input id={`ft-${k}`} value={(s[k] as string) || ''} placeholder={ph} onChange={e => set(k, e.target.value as any)} /></div>
  );
  return (
    <section className="card panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <h2>Footer &amp; contact</h2>
        <button className="btn" onClick={() => save()} disabled={saving || !dirty}>{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button>
      </div>
      <p className="muted">Everything at the bottom of your website. Leave a field empty to hide it.</p>

      <h3 style={{ fontSize: '1.05rem' }}>Contact</h3>
      <div className="grid2">{CONTACT.map(([k, l, ph]) => input(k, l, ph))}</div>

      <h3 style={{ fontSize: '1.05rem' }}>Social media</h3>
      <p className="muted" style={{ fontSize: '.88rem' }}>Each icon appears on the website (top and footer) only when its link is filled in.</p>
      <div className="grid2">{SOCIAL.map(([k, l]) => input(k, l, 'https://'))}</div>

      <h3 style={{ fontSize: '1.05rem' }}>Footer text</h3>
      <div className="grid2">{TEXTS.map(([k, l]) => input(k, l))}</div>
      <div className="field"><label htmlFor="ft-qrtext">Text beside the QR code</label>
        <input id="ft-qrtext" value={s.footer_qr_text || ''} onChange={e => set('footer_qr_text', e.target.value)} /></div>
      <div className="field"><label htmlFor="ft-note">Bottom line (after © {new Date().getFullYear()} {s.doctor_name}.)</label>
        <textarea id="ft-note" value={s.footer_note || ''} onChange={e => set('footer_note', e.target.value)} style={{ minHeight: 70 }} /></div>

      <div className="grid2">
        <label className="toggle">Show clinics list<input type="checkbox" className="switch" checked={s.show_footer_clinics !== false} onChange={e => set('show_footer_clinics', e.target.checked)} /></label>
        <label className="toggle">Show “Scan to book” QR code<input type="checkbox" className="switch" checked={s.show_footer_qr !== false} onChange={e => set('show_footer_qr', e.target.checked)} /></label>
      </div>
      <p className="muted" style={{ fontSize: '.85rem' }}>Clinic names, addresses and map links come from the <b>Clinics</b> tab.</p>
    </section>
  );
}
