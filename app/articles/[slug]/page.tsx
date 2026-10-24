import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleBody from '@/components/ArticleBody';
import { getArticle, getSettings } from '@/lib/data';
import { getLang } from '@/lib/lang';
import { dayLabel } from '@/lib/util';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const [a, s] = await Promise.all([getArticle(params.slug), getSettings()]);
  if (!a) return { title: 'Article not found' };
  return {
    title: `${a.title} · ${s.doctor_name}`,
    description: a.summary,
    openGraph: { title: a.title, description: a.summary, images: a.cover_url ? [a.cover_url] : [], type: 'article' },
  };
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const lang = getLang();
  const [a, s] = await Promise.all([getArticle(params.slug), getSettings()]);
  if (!a) notFound();
  const minutes = Math.max(1, Math.round(a.body.split(/\s+/).length / 200));
  return (
    <>
      <Header name={s.doctor_name} lang={lang} bookingOpen={s.booking_open} />
      <main className="wrap article">
        <Link href="/articles" className="muted" style={{ fontWeight: 600, textDecoration: 'none' }}>← All articles</Link>
        <div className="art-meta" style={{ marginTop: 18 }}><span className="pill">{a.category}</span>
          <span className="muted">{dayLabel(a.published_on, { day: 'numeric', month: 'long', year: 'numeric' })} · {minutes} min read</span></div>
        <h1>{a.title}</h1>
        {a.summary && <p className="lede">{a.summary}</p>}
        <div className="byline">
          {s.photo_url && <img src={s.photo_url} alt="" />}
          <span><b>{s.doctor_name}</b><br /><span className="muted">{s.degrees} · {s.specialty}</span></span>
        </div>
        {a.cover_url && <img className="art-hero" src={a.cover_url} alt="" />}
        <ArticleBody body={a.body} />
        <aside className="card art-cta">
          <div>
            <b>Want a plan made for you?</b>
            <p className="muted">This article is general information. Book a consultation for advice about your own health.</p>
          </div>
          {s.booking_open && <Link href="/book" className="btn">Book appointment</Link>}
        </aside>
      </main>
      <Footer s={s} lang={lang} />
    </>
  );
}
