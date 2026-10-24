import Header from '@/components/Header';
import PatientApp from '@/components/patient/PatientApp';
import { getSettings } from '@/lib/data';
import { getLang } from '@/lib/lang';

export const metadata = { title: 'My health records', robots: { index: false } };

export default async function PatientPage() {
  const s = await getSettings();
  return (
    <>
      <Header name={s.doctor_name} lang={getLang()} bookingOpen={s.booking_open} />
      <main className="wrap" style={{ paddingBlock: '24px 64px' }}>
        <PatientApp doctorName={s.doctor_name} whatsapp={s.whatsapp} />
      </main>
    </>
  );
}
