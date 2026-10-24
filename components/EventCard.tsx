import type { EventItem } from '@/lib/types';
import { youtubeId } from '@/lib/util';

export const isVideo = (e: EventItem) => /video/i.test(e.kind);

/** One card in "Events, camps & knowledge-based videos". */
export default function EventCard({ e }: { e: EventItem }) {
  const d = new Date(e.starts_on + 'T00:00:00Z');
  const video = isVideo(e);
  const yt = video && e.link ? youtubeId(e.link) : null;
  // Thumbnail as a background so a blocked or missing image never shows a broken icon.
  const style = yt ? { backgroundImage: `linear-gradient(180deg, transparent 40%, rgba(0,0,0,.45)), url(https://img.youtube.com/vi/${yt}/hqdefault.jpg), linear-gradient(135deg, var(--ink), var(--brand))` } : undefined;
  return (
    <article className={`card ev${video ? ' ev-video' : ''}`}>
      <div className="cover" style={style}>
        {video
          ? <span className="ev-play" aria-hidden="true">▶</span>
          : <div className="date"><b>{d.getUTCDate()}</b><small>{d.toLocaleString('en', { month: 'short', timeZone: 'UTC' })}</small></div>}
        <span className="pill" style={{ background: 'rgba(255,255,255,.92)', color: '#10292B' }}>{e.kind}</span>
      </div>
      <div className="body">
        <h3>{e.title}</h3>
        {e.venue && <p className="muted" style={{ fontSize: '.88rem' }}>{e.venue}</p>}
        {e.description && <p className="ev-desc">{e.description}</p>}
        {e.link && <a href={e.link} target="_blank" rel="noreferrer" className="ev-link">{video ? 'Watch video →' : 'Details →'}</a>}
      </div>
    </article>
  );
}
