'use client';
import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase';
import type { Article } from '@/lib/types';
import { dayLabel, pkToday } from '@/lib/util';
import ArticleBody from '../ArticleBody';
import { useToast } from './Toast';

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').trim()
  .replace(/[\s-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'article';

type Draft = Omit<Article, 'id'> & { id?: string };
const blank = (): Draft => ({ slug: '', title: '', category: 'Nutrition', summary: '', body: '', cover_url: null, published: false, published_on: pkToday() });

export default function Articles() {
  const db = browserClient();
  const toast = useToast();
  const [list, setList] = useState<Article[]>([]);
  const [edit, setEdit] = useState<Draft | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const load = async () => {
    const { data } = await db.from('articles').select('*').order('published_on', { ascending: false });
    setList((data || []) as Article[]);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const open = (a: Draft) => { setEdit({ ...a }); setSlugTouched(Boolean(a.id)); setPreview(false); setConfirmDel(false); };
  const set = (k: keyof Draft, v: any) => setEdit(e => {
    if (!e) return e;
    const next = { ...e, [k]: v };
    if (k === 'title' && !slugTouched) next.slug = slugify(v);
    return next;
  });

  const save = async (publish?: boolean) => {
    if (!edit) return;
    if (!edit.title.trim()) return toast('Give the article a title.');
    const body: any = { ...edit, slug: slugify(edit.slug || edit.title), updated_at: new Date().toISOString() };
    if (publish !== undefined) body.published = publish;
    delete body.id;
    setSaving(true);
    const res = edit.id
      ? await db.from('articles').update(body).eq('id', edit.id).select().single()
      : await db.from('articles').insert(body).select().single();
    setSaving(false);
    if (res.error) return toast(res.error.message.includes('articles_slug_key') ? 'Another article already uses this web address. Change the address.' : 'Could not save: ' + res.error.message);
    setEdit(res.data as Article);
    toast(body.published ? 'Published on the website.' : 'Saved as draft.');
    load();
  };

  const del = async () => {
    if (!edit?.id) return;
    await db.from('articles').delete().eq('id', edit.id);
    setEdit(null); toast('Article deleted'); load();
  };

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return toast('Choose an image under 5 MB.');
    const path = `article-${Date.now()}.${(file.name.split('.').pop() || 'jpg').toLowerCase()}`;
    const { error } = await db.storage.from('media').upload(path, file, { contentType: file.type });
    if (error) return toast('Upload failed: ' + error.message);
    set('cover_url', db.storage.from('media').getPublicUrl(path).data.publicUrl);
  };

  if (edit) return (
    <section className="card panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn ghost sm" onClick={() => setEdit(null)}>← All articles</button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn ghost sm" onClick={() => setPreview(p => !p)}>{preview ? 'Edit' : 'Preview'}</button>
          <button className="btn ghost sm" onClick={() => save()} disabled={saving}>Save</button>
          {edit.published
            ? <button className="btn ghost sm" onClick={() => save(false)} disabled={saving}>Unpublish</button>
            : <button className="btn sm" onClick={() => save(true)} disabled={saving}>Publish</button>}
        </div>
      </div>
      <span className={`pill ${edit.published ? 'green' : 'amber'}`} style={{ justifySelf: 'start' }}>{edit.published ? 'Published' : 'Draft, not on website'}</span>

      {preview ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <span className="pill" style={{ justifySelf: 'start' }}>{edit.category}</span>
          <h1 style={{ fontSize: '2rem' }}>{edit.title || 'Untitled'}</h1>
          {edit.summary && <p className="muted" style={{ fontSize: '1.1rem' }}>{edit.summary}</p>}
          {edit.cover_url && <img src={edit.cover_url} alt="" style={{ borderRadius: 14, maxHeight: 320, objectFit: 'cover' }} />}
          <ArticleBody body={edit.body} />
        </div>
      ) : (
        <>
          <div className="field"><label htmlFor="ar-title">Title</label><input id="ar-title" value={edit.title} onChange={e => set('title', e.target.value)} style={{ fontSize: '1.15rem', fontWeight: 600 }} /></div>
          <div className="grid2">
            <div className="field"><label htmlFor="ar-cat">Category</label>
              <input id="ar-cat" list="ar-cats" value={edit.category} onChange={e => set('category', e.target.value)} />
              <datalist id="ar-cats">{['Nutrition', 'Diabetes', 'Weight', 'Pregnancy', 'Children', 'Heart health', 'Ramadan'].map(c => <option key={c} value={c} />)}</datalist></div>
            <div className="field"><label htmlFor="ar-date">Date</label><input id="ar-date" type="date" value={edit.published_on} onChange={e => set('published_on', e.target.value)} /></div>
          </div>
          <div className="field"><label htmlFor="ar-slug">Web address</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="muted mono">/articles/</span>
              <input id="ar-slug" value={edit.slug} onChange={e => { setSlugTouched(true); set('slug', e.target.value); }} onBlur={() => set('slug', slugify(edit.slug))} /></div></div>
          <div className="field"><label htmlFor="ar-sum">Short summary (shown on cards and in Google)</label><textarea id="ar-sum" value={edit.summary} onChange={e => set('summary', e.target.value)} style={{ minHeight: 70 }} maxLength={300} /></div>
          <div className="field">
            <label htmlFor="ar-body">Article</label>
            <textarea id="ar-body" value={edit.body} onChange={e => set('body', e.target.value)} style={{ minHeight: 360, lineHeight: 1.7 }} />
            <p className="muted" style={{ fontSize: '.82rem' }}>Leave an empty line between paragraphs. Start a line with <b className="mono">## </b> for a heading, <b className="mono">- </b> for a bullet point. Wrap words in <b className="mono">**two stars**</b> for bold.</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {edit.cover_url && <img src={edit.cover_url} alt="" style={{ width: 160, height: 80, objectFit: 'cover', borderRadius: 10 }} />}
            <label className="btn ghost sm">{edit.cover_url ? 'Change cover image' : 'Add cover image (optional)'}
              <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && upload(e.target.files[0])} /></label>
            {edit.cover_url && <button className="btn ghost sm" onClick={() => set('cover_url', null)}>Remove image</button>}
          </div>
          {edit.id && (confirmDel
            ? <div className="alert" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>Delete this article for good?
                <button className="btn danger sm" onClick={del}>Delete</button><button className="btn ghost sm" onClick={() => setConfirmDel(false)}>Keep</button></div>
            : <div><button className="btn ghost sm" onClick={() => setConfirmDel(true)}>Delete article</button></div>)}
        </>
      )}
    </section>
  );

  return (
    <section className="card panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <h2>Articles</h2>
        <button className="btn sm accent" onClick={() => open(blank())}>+ New article</button>
      </div>
      <p className="muted">Write in drafts, then publish when ready. The three latest published articles show on the home page.</p>
      {list.length === 0 && <p className="muted">No articles yet.</p>}
      {list.map(a => (
        <button key={a.id} className="list-item" onClick={() => open(a)} style={{ textAlign: 'start', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <b>{a.title}</b>
            <span className={`pill ${a.published ? 'green' : 'amber'}`}>{a.published ? 'Published' : 'Draft'}</span>
          </div>
          <span className="muted" style={{ fontSize: '.85rem' }}>{a.category} · {dayLabel(a.published_on, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </button>
      ))}
    </section>
  );
}
