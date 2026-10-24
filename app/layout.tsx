import './globals.css';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { getSettings } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const title = `${s.doctor_name} · ${s.specialty}${s.clinic_address ? ' in ' + s.clinic_address : ''}`;
  const description = (s.bio_en || '').slice(0, 155);
  return {
    title,
    description,
    metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
    openGraph: { title, description, images: s.photo_url ? [s.photo_url] : [] },
  };
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0A7464' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = cookies().get('lang')?.value === 'ur' ? 'ur' : 'en';
  return (
    <html lang={lang} dir={lang === 'ur' ? 'rtl' : 'ltr'}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500&family=Noto+Nastaliq+Urdu:wght@500;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
