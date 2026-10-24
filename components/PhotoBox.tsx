'use client';
import { useEffect, useState } from 'react';
import type { GalleryItem } from '@/lib/types';

/** Small photo box: the doctor at work, awards, events. Slides on its own; tap a photo to enlarge. */
export default function PhotoBox({ items }: { items: GalleryItem[] }) {
  const photos = items.filter(i => i.image_url);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (photos.length < 2 || paused || open) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI(x => (x + 1) % photos.length), 5000);
    return () => clearInterval(t);
  }, [photos.length, paused, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowRight') setI(x => (x + 1) % photos.length);
      if (e.key === 'ArrowLeft') setI(x => (x - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, photos.length]);

  if (!photos.length) return null;
  const p = photos[Math.min(i, photos.length - 1)];
  const go = (d: number) => setI(x => (x + d + photos.length) % photos.length);

  return (
    <div className="photobox card" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <button type="button" className="pb-frame" onClick={() => setOpen(true)} aria-label={`Enlarge photo: ${p.caption || p.kind}`}>
        {photos.map((x, k) => <img key={x.id} src={x.image_url!} alt={x.caption || x.kind} className={k === i ? 'on' : ''} loading={k === 0 ? 'eager' : 'lazy'} />)}
        <span className="pb-cap">
          <span className="pill" style={{ background: 'rgba(255,255,255,.92)', color: '#10292B' }}>{p.kind}{p.year ? ` · ${p.year}` : ''}</span>
          {p.caption && <span className="pb-text">{p.caption}</span>}
        </span>
      </button>
      {photos.length > 1 && (
        <div className="pb-nav">
          <button type="button" onClick={() => go(-1)} aria-label="Previous photo">‹</button>
          <div className="pb-dots">{photos.map((x, k) => <button key={x.id} type="button" aria-label={`Photo ${k + 1}`} aria-current={k === i} onClick={() => setI(k)} />)}</div>
          <button type="button" onClick={() => go(1)} aria-label="Next photo">›</button>
        </div>
      )}
      {open && (
        <div className="pb-light" role="dialog" aria-modal="true" aria-label="Photo" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <figure>
            <img src={p.image_url!} alt={p.caption || p.kind} />
            <figcaption>{p.caption}{p.year ? ` · ${p.year}` : ''}</figcaption>
          </figure>
          <button type="button" className="pb-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          {photos.length > 1 && <>
            <button type="button" className="pb-arrow l" onClick={() => go(-1)} aria-label="Previous photo">‹</button>
            <button type="button" className="pb-arrow r" onClick={() => go(1)} aria-label="Next photo">›</button>
          </>}
        </div>
      )}
    </div>
  );
}
