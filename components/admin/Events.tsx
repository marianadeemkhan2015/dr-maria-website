'use client';
import ListEditor from './ListEditor';
import { useSettings } from './useSettings';

export default function Events() {
  const { s, set, save, saving, dirty } = useSettings();
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <section className="card panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <h2>Section title</h2>
          <button className="btn sm" onClick={() => save()} disabled={!s || saving || !dirty}>{saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}</button>
        </div>
        {s && <div className="field"><label htmlFor="ev-title">Title shown on the website</label>
          <input id="ev-title" value={s.events_title} onChange={e => set('events_title', e.target.value)} /></div>}
      </section>
      <ListEditor
        table="events" title="Events, camps & videos" order="starts_on"
        blank={{ title: 'New event', kind: 'Camp', starts_on: new Date().toISOString().slice(0, 10), venue: '', description: '', link: '' }}
        hint="Type “Video” as the type for a knowledge video and paste its YouTube link: videos stay on the website. Conferences, camps and workshops hide themselves after their date."
        fields={[
          { key: 'title', label: 'Title' },
          { key: 'kind', label: 'Type', placeholder: 'Conference, Camp, Workshop or Video' },
          { key: 'starts_on', label: 'Date', type: 'date' },
          { key: 'venue', label: 'Venue, city (leave empty for videos)' },
          { key: 'link', label: 'Link: registration page, or the YouTube / Facebook video' },
          { key: 'description', label: 'Short description', type: 'textarea' },
        ]}
      />
    </div>
  );
}
