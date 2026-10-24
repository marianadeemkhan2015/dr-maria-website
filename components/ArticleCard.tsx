import Link from 'next/link';
import type { Article } from '@/lib/types';
import { dayLabel } from '@/lib/util';

export default function ArticleCard({ a, readMore = 'Read more' }: { a: Article; readMore?: string }) {
  return (
    <Link href={`/articles/${a.slug}`} className="card art">
      <div className="art-cover">
        {a.cover_url ? <img src={a.cover_url} alt="" loading="lazy" /> : <span className="art-cat-big" aria-hidden="true">{a.category}</span>}
      </div>
      <div className="art-body">
        <div className="art-meta"><span className="pill">{a.category}</span><span className="muted">{dayLabel(a.published_on, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
        <h3>{a.title}</h3>
        {a.summary && <p className="muted">{a.summary}</p>}
        <span className="art-more">{readMore} →</span>
      </div>
    </Link>
  );
}
