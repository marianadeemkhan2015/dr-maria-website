import Header from '@/components/Header';
import BookingForm from '@/components/BookingForm';
import { getBookingData } from '@/lib/data';
import { getLang } from '@/lib/lang';

export const metadata = { title: 'Book an appointment' };

export default async function BookPage({ searchParams }: { searchParams: { type?: string; pay?: string; clinic?: string } }) {
  const lang = getLang();
  const { settings, availability, blocked, clinics } = await getBookingData();
  const initial = searchParams.type === 'video' || searchParams.type === 'followup' ? searchParams.type : 'clinic';
  return (
    <>
      <Header name={settings.doctor_name} lang={lang} bookingOpen={false} />
      <main className="wrap">
        <div style={{ paddingTop: 28 }}>
          <p className="eyebrow">Appointments</p>
          <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)' }}>Book with {settings.doctor_name}</h1>
        </div>
        {settings.booking_open
          ? <BookingForm settings={settings} availability={availability} blocked={blocked} clinics={clinics} initialClinic={searchParams.clinic} initialMode={initial as any} initialPayment={searchParams.pay} />
          : <p className="alert" style={{ margin: '24px 0 64px' }}>Online booking is closed at the moment. Please contact the clinic on WhatsApp.</p>}
      </main>
    </>
  );
}
