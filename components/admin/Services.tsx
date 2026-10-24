'use client';
import ListEditor from './ListEditor';
import { useSettings } from './useSettings';

export default function Services() {
  const { s, set, save, saving, dirty } = useSettings();
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <section className="card panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <h2>Services section</h2>
          <button className="btn sm" onClick={() => save()} disabled={!s || saving || !dirty}>{saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}</button>
        </div>
        {s && <div className="grid2">
          <div className="field"><label htmlFor="sv-title">Section title</label><input id="sv-title" value={s.services_title} onChange={e => set('services_title', e.target.value)} /></div>
          <div className="field"><label htmlFor="sv-intro">Short intro (optional)</label><input id="sv-intro" value={s.services_intro} onChange={e => set('services_intro', e.target.value)} /></div>
        </div>}
      </section>
      <ListEditor
        table="services" title="Services" order="sort"
        blank={{ title: 'New service', description: '', fee_note: '', visible: true }}
        hint="Use ↑ ↓ to change the order. Switch a service off to hide it without deleting it. Consultation fees are set in Fees & booking and show beside the section title."
        fields={[
          { key: 'title', label: 'Service name' },
          { key: 'visible', label: 'On website', type: 'checkbox' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'image_url', label: 'Photo (optional)', type: 'image' },
        ]}
      />
    </div>
  );
}
