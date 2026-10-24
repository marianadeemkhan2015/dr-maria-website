import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Doctor app',
  manifest: '/doctor.webmanifest',
  robots: { index: false },
  appleWebApp: { capable: true, title: 'Doctor', statusBarStyle: 'default' },
  icons: { icon: '/icons/doctor-192.png', apple: '/icons/doctor-180.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0A7464' };

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
