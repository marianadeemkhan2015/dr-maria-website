import QRCode from 'qrcode';
import type { Clinic, Settings } from '@/lib/types';
import { waLink } from '@/lib/util';
import Social from './Social';
import { t, type Lang } from '@/lib/i18n';
import { serverClient, isConfigured } from '@/lib/supabase';

/** Footer: every heading, line and switch comes from Footer & contact in the doctor panel. */
export default async function Footer({ s, lang }: { s: Settings; lang: Lang }) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || '';
  const clinics: Clinic[] = isConfigured && s.show_footer_clinics !== false
    ? (((await serverClient().from('clinics').select('*').eq('visible', true).order('sort')).data) || []) as Clinic[]
    : [];
  const qr = site && s.show_footer_qr !== false
    ? await QRCode.toDataURL(site.replace(/\/$/, '') + '/book', { margin: 1, width: 240, color: { dark: '#10292B', light: '#FFFFFF' } })
    : null;
  const tr = (v: string | null | undefined, fallback: string) => (v && v !== fallback ? v : t(lang, fallback));
  const hasContact = s.whatsapp || s.phone || s.email || s.facebook || s.instagram || s.tiktok || s.youtube;
  return (
    <footer className="footer" id="contact">
      <div className="wrap">
        {clinics.length > 0 && (
          <div className="foot-col">
            <h3>{tr(s.footer_clinics_title, 'Clinics')}</h3>
            {clinics.map(c => (
              <p key={c.id}>
                <b>{c.name}</b>{c.address && <><br /><span className="muted">{c.address}</span></>}
                {c.phone && <><br /><span className="mono muted">{c.phone}</span></>}
                {c.map_link && <> · <a href={c.map_link} target="_blank" rel="noreferrer">Map</a></>}
              </p>
            ))}
            {s.footer_timings_text && <p><a href="/#clinics" className="foot-link">{s.footer_timings_text} →</a></p>}
          </div>
        )}
        {hasContact && (
          <div className="foot-col">
            <h3>{tr(s.footer_contact_title, 'Contact')}</h3>
            {s.whatsapp && <p>WhatsApp: <a href={waLink(s.whatsapp)} target="_blank" rel="noreferrer" className="mono">{s.whatsapp}</a></p>}
            {s.phone && <p>Phone: <a href={`tel:${s.phone.replace(/[^\d+]/g, '')}`} className="mono">{s.phone}</a></p>}
            {s.email && <p>Email: <a href={`mailto:${s.email}`}>{s.email}</a></p>}
            <Social s={s} compact />
          </div>
        )}
        {qr && (
          <div className="foot-qr">
            <img src={qr} alt="QR code to book an appointment" className="qr" />
            <p><b>{s.footer_qr_title}</b>{s.footer_qr_text && <><br /><span className="muted">{s.footer_qr_text}</span></>}</p>
          </div>
        )}
      </div>
      <div className="wrap muted foot-note">
        © {new Date().getFullYear()} {s.doctor_name}.{s.footer_note ? ` ${s.footer_note}` : ''}
      </div>
    </footer>
  );
}
