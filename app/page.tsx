import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ReviewForm from '@/components/ReviewForm';
import ArticleCard from '@/components/ArticleCard';
import Social from '@/components/Social';
import EventCard from '@/components/EventCard';
import PhotoBox from '@/components/PhotoBox';
import { DEFAULT_EVENTS_TITLE } from '@/lib/data';
import { getHomeData } from '@/lib/data';
import { getLang } from '@/lib/lang';
import { t } from '@/lib/i18n';
import { fmtPKR, hoursLines } from '@/lib/util';
import { isConfigured } from '@/lib/supabase';

/** Columns that leave no card alone on the last row (4 → 4 or 2, 5 → 3, 7 → 4 …). */
function svcCols(n: number) {
  if (n <= 4) return n;
  if (n % 3 === 0) return 3;
  if (n % 4 === 0 || n % 4 === 3) return 4;
  return 3;
}

export default async function Home() {
  const lang = getLang();
  const { settings: s, services, events, articles, reviews, reviewStats, clinics, availability, gallery } = await getHomeData();
  const parts = s.doctor_name.split(' ');
  const cut = Math.max(2, Math.ceil(parts.length / 2));
  const first = parts.slice(0, cut).join(' ');
  const rest = parts.slice(cut).join(' ');
  const bio = lang === 'ur' && s.bio_ur ? s.bio_ur : s.bio_en;
  const avg = reviewStats.count ? reviewStats.avg.toFixed(1) : null;
  const honours = gallery.filter(g => /award|achiev|honou?r|certif/i.test(g.kind));
  const hasPhotos = gallery.some(g => g.image_url);
  const videoHours = hoursLines(availability.filter(a => a.mode === 'video'));

  return (
    <>
      <Header name={s.doctor_name} lang={lang} bookingOpen={s.booking_open} />
      {!isConfigured && (
        <div className="wrap" style={{ paddingTop: 16 }}>
          <p className="alert">Preview mode: the database is not connected yet. Follow README step 2 to connect Supabase.</p>
        </div>
      )}
      <main>
        <section className="wrap hero" id="about">
          <div>
            <span className="pill">{s.specialty}</span>
            <h1 style={{ marginTop: 14 }}>{first} {rest && <span>{rest}</span>}</h1>
            <div className="creds">
              <span className="pill amber">{s.degrees}</span>
              {s.pmdc_number && <span className="pill green">✔ {t(lang, 'PMDC Reg.')} {s.pmdc_number}</span>}
              {s.languages && <span className="pill grey">{s.languages}</span>}
            </div>
            <p className="bio">{bio}</p>
            <div className="cta"><Social s={s} /></div>
          </div>
          <div className="portrait">
            {s.photo_url ? <img src={s.photo_url} alt={s.doctor_name} /> : <div className="ph" aria-hidden="true">{parts.filter(p => p !== 'Dr.').map(p => p[0]).slice(0, 2).join('')}</div>}
            {avg && <div className="float a"><b>{avg} ★</b>{reviewStats.count} {reviewStats.count === 1 ? 'review' : 'reviews'}</div>}
            <div className="float b"><b>{s.years}+</b>{t(lang, 'years in practice')}</div>
          </div>
        </section>

        <section className="wrap stats" aria-label="At a glance">
          <div className="stat">
            <span className="stat-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="6" /><path d="M8.5 14 7 22l5-3 5 3-1.5-8" /></svg></span>
            <span><b>{s.years}+</b><small>{t(lang, 'Years experience')}</small></span>
          </div>
          <div className="stat">
            <span className="stat-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 20a6.5 6.5 0 0 0-3-5.5" /></svg></span>
            <span><b>{s.stat_patients}</b><small>{t(lang, 'Patients guided')}</small></span>
          </div>
          <div className="stat">
            <span className="stat-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20v3H6.5" /></svg></span>
            <span><b>{s.stat_papers}</b><small>{s.stat_extra_label}</small></span>
          </div>
          {avg ? (
            <div className="stat">
              <span className="stat-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.8 6.4.8-4.7 4.4 1.2 6.3L12 17l-5.7 3.1 1.2-6.3-4.7-4.4 6.4-.8z" /></svg></span>
              <span><b>{avg}<em>/5</em></b><small>{t(lang, 'Patient rating')}</small></span>
            </div>
          ) : (
            <div className="stat">
              <span className="stat-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg></span>
              <span><b>{clinics.length || 1}</b><small>{clinics.length > 1 ? t(lang, 'Clinics') : t(lang, 'Clinic')}{s.video_open ? ' + video' : ''}</small></span>
            </div>
          )}
        </section>

        {services.length > 0 && (
          <section className="wrap sec" id="services">
            <div className="sec-head svc-head">
              <div style={{ display: 'grid', gap: 6 }}>
                <h2>{s.services_title === 'Services & fees' ? t(lang, 'Services & fees') : s.services_title}</h2>
                {s.services_intro && <p className="muted" style={{ maxWidth: '52ch' }}>{s.services_intro}</p>}
              </div>
              <dl className="fees" aria-label="Consultation fees">
                <div><dt>{t(lang, 'Clinic visit')}</dt><dd>{fmtPKR(s.clinic_fee)}</dd></div>
                {s.video_open && <div><dt>{t(lang, 'Video consult')}</dt><dd>{fmtPKR(s.video_fee)}</dd></div>}
                <div><dt>{t(lang, 'Follow-up')}</dt><dd>{fmtPKR(s.followup_fee)}</dd></div>
              </dl>
            </div>
            <div className={`svc-grid cols-${svcCols(services.length)}`}>
              {services.map(x => (
                <article key={x.id} className="svc">
                  {x.image_url && <img src={x.image_url} alt="" className="svc-img" loading="lazy" />}
                  <h3>{x.title}</h3>
                  {x.description && <p className="muted" style={{ fontSize: '.93rem' }}>{x.description}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {(clinics.length > 0 || (s.video_open && videoHours.length > 0)) && (
          <section className="wrap sec" id="clinics">
            <div className="sec-head"><h2>{t(lang, 'Clinics & timings')}</h2></div>
            <div className="grid">
              {clinics.map(c => {
                const lines = hoursLines(availability.filter(a => a.mode === 'clinic' && a.clinic_id === c.id));
                return (
                  <article key={c.id} className="card clinic">
                    <h3>{c.name}</h3>
                    {c.address && <p className="muted">{c.address}</p>}
                    <ul className="hours">{lines.length ? lines.map(l => <li key={l}>{l}</li>) : <li className="muted">Timings coming soon</li>}</ul>
                    <div className="clinic-links">
                      {s.booking_open && lines.length > 0 && <Link href={`/book?type=clinic&clinic=${c.id}`} className="btn sm">{t(lang, 'Book here')}</Link>}
                      {c.map_link && <a href={c.map_link} target="_blank" rel="noreferrer" className="btn ghost sm">{t(lang, 'Map')}</a>}
                      {c.phone && <span className="mono muted" style={{ alignSelf: 'center' }}>{c.phone}</span>}
                    </div>
                  </article>
                );
              })}
              {s.video_open && videoHours.length > 0 && (
                <article className="card clinic video">
                  <h3>{t(lang, 'Online video consult')}</h3>
                  <p className="muted">{t(lang, 'From anywhere, on phone or computer')}</p>
                  <ul className="hours">{videoHours.map(l => <li key={l}>{l}</li>)}</ul>
                  {s.booking_open && <div className="clinic-links"><Link href="/book?type=video" className="btn sm accent">{t(lang, 'Book video consult')}</Link></div>}
                </article>
              )}
            </div>
          </section>
        )}

        {(honours.length > 0 || hasPhotos) && (
          <section className="wrap sec" id="achievements">
            <div className={`ach ${honours.length && hasPhotos ? 'two' : ''}`}>
              {honours.length > 0 && (
                <div>
                  <div className="sec-head"><h2>{t(lang, 'Achievements & awards')}</h2></div>
                  <ul className="honours">
                    {honours.map(h => (
                      <li key={h.id}>
                        <span className="h-ic" aria-hidden="true">{/award|honou?r/i.test(h.kind)
                          ? <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="6" /><path d="M8.5 14 7 22l5-3 5 3-1.5-8" /></svg>
                          : <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" /></svg>}</span>
                        <span><b>{h.caption}</b>{(h.year || h.kind) && <small className="muted">{[h.kind, h.year].filter(Boolean).join(' · ')}</small>}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {hasPhotos && (
                <aside aria-label="Photos">
                  {!honours.length && <div className="sec-head"><h2>{t(lang, 'Gallery')}</h2></div>}
                  <PhotoBox items={gallery} />
                </aside>
              )}
            </div>
          </section>
        )}

        {s.show_events && events.length > 0 && (
          <section className="wrap sec" id="events">
            <div className="sec-head"><h2>{s.events_title === DEFAULT_EVENTS_TITLE ? t(lang, DEFAULT_EVENTS_TITLE) : s.events_title}</h2></div>
            <div className="grid">
              {events.map(e => <EventCard key={e.id} e={e} />)}
            </div>
          </section>
        )}

        {s.show_articles && articles.length > 0 && (
          <section className="wrap sec" id="articles">
            <div className="sec-head"><h2>{t(lang, 'Health articles')}</h2>
              <Link href="/articles" className="btn ghost sm">{t(lang, 'All articles')} →</Link></div>
            <div className="grid">
              {articles.map(a => <ArticleCard key={a.id} a={a} readMore={t(lang, 'Read more')} />)}
            </div>
          </section>
        )}

        {s.show_reviews && (
          <section className="wrap sec" id="reviews">
            <div className="sec-head">
              <h2>{t(lang, 'What patients say')}</h2>
              {avg && <p className="rating-sum"><b>{avg}</b> <span className="stars">★★★★★</span> <span className="muted">{reviewStats.count} {reviewStats.count === 1 ? 'review' : 'reviews'}</span></p>}
            </div>
            {reviews.length > 0 ? (
              <div className="grid">
                {reviews.map(r => (
                  <article key={r.id} className="card rev">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div className="stars" aria-label={`${r.rating} out of 5`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                      {r.verified && <span className="pill green">✔ {t(lang, 'Verified patient')}</span>}
                    </div>
                    <p>“{r.body}”</p>
                    <small className="muted">{r.name} · {new Date(r.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</small>
                    {r.reply && (
                      <div className="reply">
                        <b>{t(lang, 'Reply from')} {s.doctor_name}</b>
                        <p>{r.reply}</p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : <p className="muted">Reviews from patients will appear here.</p>}
            <ReviewForm />
          </section>
        )}
      </main>
      <Footer s={s} lang={lang} />
    </>
  );
}
