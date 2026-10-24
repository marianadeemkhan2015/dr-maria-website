'use client';
import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase';
import type { Settings } from '@/lib/types';
import { useToast } from './Toast';

/** Load the single settings row, edit it locally, save changed fields. */
export function useSettings() {
  const db = browserClient();
  const toast = useToast();
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    db.from('settings').select('*').eq('id', 1).single().then(({ data }) => setS(data as Settings));
  }, []); // eslint-disable-line

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => { setS(x => (x ? { ...x, [k]: v } : x)); setDirty(true); };

  const save = async (patch?: Partial<Settings>) => {
    if (!s) return;
    setSaving(true);
    const body = { ...s, ...(patch || {}), updated_at: new Date().toISOString() } as any;
    delete body.id;
    const { error } = await db.from('settings').update(body).eq('id', 1);
    setSaving(false);
    if (error) toast('Could not save: ' + error.message);
    else { setDirty(false); if (patch) setS(x => (x ? { ...x, ...patch } : x)); toast('Saved. The website is updated.'); }
  };

  return { s, set, save, saving, dirty };
}
