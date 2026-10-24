import type { Settings } from '@/lib/types';

const ICONS: Record<string, JSX.Element> = {
  facebook: <path d="M14 8.5V6.8c0-.8.5-1 1-1h1.8V2.5h-2.6C11.3 2.5 10.6 4.6 10.6 6v2.5H8.5v3.4h2.1v9.6H14v-9.6h2.5l.4-3.4z" />,
  instagram: <g fill="none" stroke="currentColor" strokeWidth="2"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></g>,
  tiktok: <path d="M15.6 2.5h-3.2v12.6a2.7 2.7 0 1 1-2.7-2.7c.3 0 .6 0 .9.1V9.2a6 6 0 1 0 5 5.9V8.6a7.4 7.4 0 0 0 4.4 1.4V6.8a4.4 4.4 0 0 1-4.4-4.3z" />,
  youtube: <g><rect x="2" y="5" width="20" height="14" rx="4" /><path d="M10 9v6l5.2-3z" fill="var(--social-cut, #fff)" /></g>,
};

const ORDER: { key: keyof Settings; icon: string; label: string }[] = [
  { key: 'facebook', icon: 'facebook', label: 'Facebook' },
  { key: 'instagram', icon: 'instagram', label: 'Instagram' },
  { key: 'tiktok', icon: 'tiktok', label: 'TikTok' },
  { key: 'youtube', icon: 'youtube', label: 'YouTube' },
];

/** Social links. Each one shows only when the doctor has entered its link in the panel. */
export default function Social({ s, compact = false }: { s: Settings; compact?: boolean }) {
  const items = ORDER.filter(o => typeof s[o.key] === 'string' && (s[o.key] as string).trim());
  if (!items.length) return null;
  return (
    <div className={`social${compact ? ' compact' : ''}`}>
      {items.map(o => (
        <a key={o.key} href={s[o.key] as string} target="_blank" rel="noreferrer" aria-label={o.label} className={`soc soc-${o.icon}`}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">{ICONS[o.icon]}</svg>
          {!compact && <span>{o.label}</span>}
        </a>
      ))}
    </div>
  );
}
