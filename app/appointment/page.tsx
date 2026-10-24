import Header from '@/components/Header';
import AppointmentLookup from '@/components/AppointmentLookup';
import { getSettings } from '@/lib/data';
import { getLang } from '@/lib/lang';

export const metadata = { title: 'My appointment' };

export default async function Page() {
  const s = await getSettings();
  return (
    <>
      <Header name={s.doctor_name} lang={getLang()} bookingOpen={s.booking_open} />
      <main className="wrap" style={{ paddingBlock: '32px 64px', maxWidth: 640 }}>
        <p className="eyebrow">My appointment</p>
        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.4rem)', marginBottom: 18 }}>Check, join or cancel</h1>
        <AppointmentLookup whatsapp={s.whatsapp} />
      </main>
    </>
  );
}
