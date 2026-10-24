'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { t, type Lang } from '@/lib/i18n';

export default function Header({ name, lang, bookingOpen = true }: { name: string; lang: Lang; bookingOpen?: boolean }) {
  const router = useRouter();
  const switchLang = () => {
    document.cookie = `lang=${lang === 'ur' ? 'en' : 'ur'}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <header className="header">
      <div className="wrap">
        <Link href="/" className="brand">{name}</Link>
        <nav className="nav" aria-label="Main">
          <Link href="/#about" className="nav-xl">{t(lang, 'About')}</Link>
          <Link href="/#services">{t(lang, 'Services')}</Link>
          <Link href="/#clinics">{t(lang, 'Clinics')}</Link>
          <Link href="/#events" className="nav-lg">{t(lang, 'Events & videos')}</Link>
          <Link href="/articles" className="nav-lg">{t(lang, 'Articles')}</Link>
          <Link href="/#contact" className="nav-xl">{t(lang, 'Contact')}</Link>
        </nav>
        <button className="lang" onClick={switchLang} aria-label="Switch language">
          {lang === 'ur' ? 'English' : <span style={{ fontFamily: 'var(--urdu)' }}>اردو</span>}
        </button>
        <Link href="/patient" className="btn ghost sm patient-link">{t(lang, 'Patient login')}</Link>
        {bookingOpen && <Link href="/book" className="btn sm">{t(lang, 'Book appointment')}</Link>}
      </div>
    </header>
  );
}
