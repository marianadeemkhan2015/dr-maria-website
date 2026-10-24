'use client';
import { useState } from 'react';
import { browserClient } from '@/lib/supabase';
import type { Settings } from '@/lib/types';
import { useSettings } from './useSettings';
import { useToast } from './Toast';

const TEXT: [keyof Settings, string][] = [
  ['doctor_name', 'Display name'], ['specialty', 'Specialty'], ['degrees', 'Degrees'], ['pmdc_number', 'PMDC registration number (optional, leave empty if you have none)'], ['languages', 'Languages spoken'],
  ['stat_patients', 'Patients figure (e.g. 10,000+)'], ['stat_papers', 'Third figure (e.g. 50+)'], ['stat_extra_label', 'Third figure label'],
];

export default function Profile() {
  const { s, set, save, saving, dirty } = useSettings();
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  if (!s) return <p className="muted">Loading…</p>;

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) return toast('Please choose an image.');
    if (file.size > 5 * 1024 * 1024) return toast('Image must be under 5 MB.');
    setUploading(true);
    const db = browserClient();
    const path = `photo-${Date.now()}.${(file.name.split('.').pop() || 'jpg').toLowerCase()}`;
    const { error } = await db.storage.from('media').upload(path, file, { upsert: true, contentType: file.type });
    setUploading(false);
    if (error) return toast('Upload failed: ' + error.message);
    const url = db.storage.from('media').getPublicUrl(path).data.publicUrl;
    await save({ photo_url: url });
  };

  return (
    <section className="card panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <h2>Profile &amp; bio</h2>
        <button className="btn" onClick={() => save()} disabled={saving || !dirty}>{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {s.photo_url ? <img src={s.photo_url} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 18 }} /> : <div style={{ width: 96, height: 96, borderRadius: 18, background: 'var(--surface-2)' }} />}
        <label className="btn ghost sm">
          {uploading ? 'Uploading…' : 'Change photo'}
          <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      </div>
      <div className="grid2">
        {TEXT.map(([k, label]) => (
          <div className="field" key={k}><label htmlFor={`p-${k}`}>{label}</label>
            <input id={`p-${k}`} value={(s[k] as string) || ''} onChange={e => set(k, e.target.value as any)} /></div>
        ))}
        <div className="field"><label htmlFor="p-years">Years of experience</label>
          <input id="p-years" type="number" min={0} value={s.years} onChange={e => set('years', Number(e.target.value))} /></div>
      </div>
      <div className="field"><label htmlFor="p-bio">About me (English)</label><textarea id="p-bio" value={s.bio_en} onChange={e => set('bio_en', e.target.value)} style={{ minHeight: 140 }} /></div>
      <div className="field"><label htmlFor="p-bio-ur">About me (Urdu, shown when visitors switch to اردو)</label>
        <textarea id="p-bio-ur" dir="rtl" value={s.bio_ur} onChange={e => set('bio_ur', e.target.value)} style={{ minHeight: 140, fontFamily: 'var(--urdu)', lineHeight: 2 }} /></div>
    </section>
  );
}
