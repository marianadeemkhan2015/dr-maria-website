import type { Availability, Mode } from './types';

export const fmtPKR = (n: number | null | undefined) => 'PKR ' + Number(n || 0).toLocaleString('en-PK');

/** Today's date in Pakistan as YYYY-MM-DD. */
export function pkToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
}
/** Minutes since midnight right now in Pakistan. */
export function pkNowMinutes(): number {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const h = Number(p.find(x => x.type === 'hour')?.value || 0);
  const m = Number(p.find(x => x.type === 'minute')?.value || 0);
  return (h % 24) * 60 + m;
}
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function weekday(iso: string): number {
  return new Date(iso + 'T00:00:00Z').getUTCDay();
}
export function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
export function toTime(min: number): string {
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}
export function label12(t: string): string {
  const m = toMin(t); const h = Math.floor(m / 60); const mm = m % 60;
  const ap = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
}
export function dayLabel(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
}

/** All bookable start times for a date. clinicId = a clinic's hours; null = video hours. */
export function slotsFor(iso: string, clinicId: string | null, avail: Availability[], slotMinutes: number): string[] {
  const wd = weekday(iso);
  const rows = avail.filter(a => a.weekday === wd && (clinicId ? a.mode === 'clinic' && a.clinic_id === clinicId : a.mode === 'video'));
  const out = new Set<string>();
  for (const r of rows) {
    for (let t = toMin(r.start_time); t + slotMinutes <= toMin(r.end_time); t += slotMinutes) out.add(toTime(t));
  }
  return [...out].sort();
}

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Weekly hours as short lines, e.g. ["Mon–Wed, Fri · 5:00–9:00 PM"]. Days with the same times are grouped. */
export function hoursLines(rows: Availability[]): string[] {
  const byTime = new Map<string, number[]>();
  for (const r of rows) {
    const key = `${label12(r.start_time.slice(0, 5))} – ${label12(r.end_time.slice(0, 5))}`;
    byTime.set(key, [...(byTime.get(key) || []), r.weekday]);
  }
  const order = (d: number) => (d + 6) % 7; // Monday first
  const lines = [...byTime.entries()].map(([time, days]) => {
    const ds = [...new Set(days)].sort((a, b) => order(a) - order(b));
    const runs: number[][] = [];
    for (const d of ds) {
      const last = runs.at(-1);
      if (last && order(d) === order(last.at(-1)!) + 1) last.push(d); else runs.push([d]);
    }
    const txt = runs.map(r => r.length > 2 ? `${DAY[r[0]]}–${DAY[r.at(-1)!]}` : r.map(d => DAY[d]).join(', ')).join(', ');
    return { first: order(ds[0]), line: `${txt} · ${time}` };
  });
  return lines.sort((a, b) => a.first - b.first).map(l => l.line);
}

/** YouTube thumbnail from a watch / share / shorts link. */
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function waLink(phone: string, text?: string): string {
  const digits = (phone || '').replace(/\D/g, '').replace(/^0/, '92');
  return `https://wa.me/${digits}${text ? '?text=' + encodeURIComponent(text) : ''}`;
}

export const modeName: Record<Mode, string> = { clinic: 'Clinic visit', video: 'Video consult', followup: 'Follow-up' };
