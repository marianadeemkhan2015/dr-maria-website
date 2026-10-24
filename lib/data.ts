import { serverClient, isConfigured } from './supabase';
import type { Settings, Service, EventItem, Article, Review, Availability, Clinic, GalleryItem } from './types';
import { pkToday } from './util';

export const DEFAULT_EVENTS_TITLE = 'Events, camps & knowledge-based videos';

export const fallbackSettings: Settings = {
  id: 1, doctor_name: 'Dr. Maria Nadeem Khan', specialty: 'Clinical Nutritionist', degrees: 'MSc Nutrition', pmdc_number: null,
  bio_en: 'Connect the database to show the doctor\'s own text here. See README step 2.', bio_ur: '',
  photo_url: null, years: 15, stat_patients: '10,000+', stat_papers: '50+', stat_extra_label: 'Research papers',
  languages: 'English · اردو', clinic_name: '', clinic_address: '', clinic_hours: '', map_link: null,
  whatsapp: '', email: null, facebook: null, instagram: null, tiktok: null, youtube: null,
  clinic_fee: 2500, video_fee: 2000, followup_fee: 1000, payment_note: '', jazzcash: null, jazzcash_title: null, easypaisa: null, easypaisa_title: null,
  bank_name: null, bank_title: null, bank_account: null, bank_iban: null,
  slot_minutes: 30, booking_days: 21, booking_open: false, video_open: false,
  services_title: 'Services & fees', services_intro: '',
  events_title: DEFAULT_EVENTS_TITLE, show_events: true, show_articles: true, show_reviews: true,
  phone: null, footer_clinics_title: 'Clinics', footer_contact_title: 'Contact', footer_timings_text: 'See timings',
  footer_qr_title: 'Scan to book', footer_qr_text: 'Print this on prescriptions and clinic boards.',
  footer_note: '', show_footer_clinics: true, show_footer_qr: true,
};

export async function getSettings(): Promise<Settings> {
  if (!isConfigured) return fallbackSettings;
  const { data } = await serverClient().from('settings').select('*').eq('id', 1).maybeSingle();
  return (data as Settings) || fallbackSettings;
}

export async function getHomeData() {
  const settings = await getSettings();
  if (!isConfigured) return { settings, services: [], events: [] as EventItem[], articles: [], reviews: [], reviewStats: { avg: 0, count: 0 }, clinics: [] as Clinic[], availability: [] as Availability[], gallery: [] as GalleryItem[] };
  const db = serverClient();
  const [services, upcoming, videos, articles, reviews, allRatings, clinics, availability, gallery] = await Promise.all([
    db.from('services').select('*').eq('visible', true).order('sort'),
    // Events and camps disappear after their date; videos stay until removed.
    db.from('events').select('*').not('kind', 'ilike', '%video%').gte('starts_on', pkToday()).order('starts_on').limit(6),
    db.from('events').select('*').ilike('kind', '%video%').order('starts_on', { ascending: false }).limit(6),
    db.from('articles').select('id,slug,title,category,summary,cover_url,published_on').eq('published', true).order('published_on', { ascending: false }).limit(3),
    db.from('reviews').select('*').eq('approved', true).order('created_at', { ascending: false }).limit(6),
    db.from('reviews').select('rating').eq('approved', true),
    db.from('clinics').select('*').eq('visible', true).order('sort'),
    db.from('availability').select('*').order('weekday').order('start_time'),
    db.from('gallery').select('*').eq('visible', true).order('sort'),
  ]);
  return {
    settings,
    services: (services.data || []) as Service[],
    events: [...(upcoming.data || []), ...(videos.data || [])] as EventItem[],
    articles: (articles.data || []) as Article[],
    reviews: (reviews.data || []) as Review[],
    reviewStats: (() => { const r = (allRatings.data || []) as { rating: number }[]; return { count: r.length, avg: r.length ? r.reduce((a, x) => a + x.rating, 0) / r.length : 0 }; })(),
    clinics: (clinics.data || []) as Clinic[],
    availability: (availability.data || []) as Availability[],
    gallery: (gallery.data || []) as GalleryItem[],
  };
}

export async function getBookingData() {
  const settings = await getSettings();
  if (!isConfigured) return { settings, availability: [] as Availability[], blocked: [] as string[], clinics: [] as Clinic[] };
  const db = serverClient();
  const [a, b, c] = await Promise.all([
    db.from('availability').select('*'),
    db.from('blocked_dates').select('day').gte('day', pkToday()),
    db.from('clinics').select('*').eq('visible', true).order('sort'),
  ]);
  return {
    settings,
    availability: (a.data || []) as Availability[],
    blocked: ((b.data || []) as { day: string }[]).map(x => x.day),
    clinics: (c.data || []) as Clinic[],
  };
}

export async function getArticles(): Promise<Article[]> {
  if (!isConfigured) return [];
  const { data } = await serverClient().from('articles').select('id,slug,title,category,summary,cover_url,published_on')
    .eq('published', true).order('published_on', { ascending: false });
  return (data || []) as Article[];
}

export async function getArticle(slug: string): Promise<Article | null> {
  if (!isConfigured) return null;
  const { data } = await serverClient().from('articles').select('*').eq('slug', slug).eq('published', true).maybeSingle();
  return (data as Article) || null;
}
