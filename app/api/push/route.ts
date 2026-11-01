import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { dayLabel, label12 } from '@/lib/util';
import { VAPID_PUBLIC } from '@/lib/push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };
const reply = (body: unknown, status = 200) => Response.json(body, { status });

/**
 * Sends booking alerts to the doctor's phones.
 * - From the database (new booking): header x-push-secret = PUSH_SECRET; body has the booking and the phones to notify.
 * - From the doctor app ("Send test alert"): the doctor's login token; sends only to that phone.
 */
export async function POST(req: Request) {
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!priv) return reply({ error: 'Booking alerts are not set up (VAPID_PRIVATE_KEY missing).' }, 503);
  webpush.setVapidDetails('mailto:' + (process.env.PUSH_CONTACT || 'alerts@example.com'), VAPID_PUBLIC, priv);

  const body = await req.json().catch(() => null);
  if (!body) return reply({ error: 'Bad request' }, 400);

  let subs: Sub[] = [];
  let payload: Record<string, unknown>;
  const secret = req.headers.get('x-push-secret');

  if (secret !== null) {
    if (!process.env.PUSH_SECRET || secret !== process.env.PUSH_SECRET) return reply({ error: 'Not allowed' }, 401);
    subs = Array.isArray(body.subs) ? body.subs : [];
    const when = `${dayLabel(String(body.day))}, ${label12(String(body.time).slice(0, 5))}`;
    payload = {
      title: `New booking: ${String(body.name || 'Patient').slice(0, 60)}`,
      body: `${body.video ? 'Video consult' : body.clinic || 'Clinic visit'} · ${when}`,
      pending: Number(body.pending) || 0,
    };
  } else {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token || !body.sub?.endpoint) return reply({ error: 'Not allowed' }, 401);
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false },
    });
    const { data } = await db.rpc('is_admin');
    if (data !== true) return reply({ error: 'Not allowed' }, 401);
    subs = [body.sub];
    payload = { title: 'Booking alerts are on', body: 'You will get a notification like this for every new booking.', pending: 0, test: true };
  }

  const results = await Promise.allSettled(
    subs.map(s => webpush.sendNotification(s, JSON.stringify(payload), { TTL: 6 * 3600, urgency: 'high' })),
  );
  const failed = results.filter(r => r.status === 'rejected').length;
  return reply({ sent: results.length - failed, failed });
}
