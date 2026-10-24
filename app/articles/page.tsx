import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import { getArticles, getSettings } from '@/lib/data';
import { getLang } from '@/lib/lang';
import { t } from '@/lib/i18n';

export async function generateMetadata() {
  const s = await getSettings();
  return { title: `Health articles · ${s.doctor_name}`, description: `Practical health and nutrition advice from ${s.doctor_name}.` };
}

export default async function ArticlesPage() {
  const lang = getLang();
  const [s, articles] = await Promise.all([getSettings(), getArticles()]);
  const categories = [...new Set(articles.map(a => a.category))];
  return (
    <>
      <Header name={s.doctor_name} lang={lang} bookingOpen={s.booking_open} />
      <main className="wrap sec">
        <p className="eyebrow">{s.doctor_name}</p>
        <h1 style={{ fontSize: 'clamp(2rem,4.5vw,3rem)', marginBottom: 10 }}>{t(lang, 'Health articles')}</h1>
        <p className="muted" style={{ maxWidth: '60ch', marginBottom: 28 }}>Practical advice you can use at home. Articles are general information; for advice about your own health, book a consultation.</p>
        {categories.length > 1 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>{categories.map(c => <span key={c} className="pill grey">{c}</span>)}</div>}
        {articles.length === 0
          ? <p className="muted">New articles are coming soon.</p>
          : <div className="grid art-grid">{articles.map(a => <ArticleCard key={a.id} a={a} readMore={t(lang, 'Read more')} />)}</div>}
      </main>
      <Footer s={s} lang={lang} />
    </>
  );
}
