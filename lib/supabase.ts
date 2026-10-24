import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const isConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Server-side reads of public content (no login, no session). */
export function serverClient(): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false } });
}

let browser: SupabaseClient | null = null;
/** Browser client: keeps the doctor's login session. */
export function browserClient(): SupabaseClient {
  if (!browser) browser = createClient(url, key);
  return browser;
}
