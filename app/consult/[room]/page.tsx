import Link from 'next/link';
import { getSettings } from '@/lib/data';

export const metadata = { title: 'Video consultation', robots: { index: false } };

export default async function Consult({ params, searchParams }: { params: { room: string }; searchParams: { code?: string; doctor?: string } }) {
  const s = await getSettings();
  const room = params.room.replace(/[^a-zA-Z0-9-]/g, '');
  const base = (process.env.NEXT_PUBLIC_VIDEO_BASE_URL || 'https://meet.jit.si').replace(/\/$/, '');
  // Embedding meet.jit.si is limited to 5-minute calls, so it opens in its own tab
  // unless you run your own Jitsi server or JaaS and set NEXT_PUBLIC_VIDEO_EMBED=true.
  const embed = process.env.NEXT_PUBLIC_VIDEO_EMBED === 'true';
  const isDoctor = searchParams.doctor === '1';
  const display = isDoctor ? s.doctor_name : 'Patient';
  const hash = [
    'config.prejoinConfig.enabled=true',
    'config.disableDeepLinking=true',
    `config.subject=${encodeURIComponent('"Consultation with ' + s.doctor_name + '"')}`,
    `userInfo.displayName=${encodeURIComponent('"' + display + '"')}`,
  ].join('&');
  const callUrl = `${base}/${room}#${hash}`;

  if (embed) {
    return (
      <div className="callwrap">
        <div className="callbar">
          <b>{s.doctor_name} · Video consultation{searchParams.code ? ` · ${searchParams.code}` : ''}</b>
          <Link className="btn sm ghost" style={{ color: 'inherit' }} href={isDoctor ? '/admin' : '/appointment'}>Leave</Link>
        </div>
        <iframe src={callUrl} title="Video consultation" allow="camera; microphone; fullscreen; display-capture; autoplay" />
      </div>
    );
  }

  return (
    <main className="wrap" style={{ maxWidth: 640, paddingBlock: 48 }}>
      <div className="card done" style={{ margin: 0 }}>
        <p className="eyebrow">Video consultation</p>
        <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.2rem)' }}>{isDoctor ? 'Your consultation room' : `Consultation with ${s.doctor_name}`}</h1>
        {searchParams.code && <div className="code">{searchParams.code}</div>}
        <ul style={{ textAlign: 'start', display: 'grid', gap: 6, paddingInlineStart: 20 }}>
          <li>Join at your appointment time. {isDoctor ? 'The patient waits in the same room.' : 'If the doctor is not there yet, please wait in the room.'}</li>
          <li>Allow the camera and microphone when your browser asks.</li>
          <li>Use earphones, sit somewhere quiet, and keep your reports ready to show.</li>
          {isDoctor && <li>The first time, sign in on the call page (Google or GitHub) so the room opens. Patients never need to sign in.</li>}
        </ul>
        <a className="btn accent" href={callUrl} target="_blank" rel="noreferrer" style={{ fontSize: '1.05rem', padding: '14px 28px' }}>Join video call</a>
        <p className="muted" style={{ fontSize: '.85rem' }}>The call opens in a new tab. Video consultations are not for emergencies; call 1122.</p>
        <Link href={isDoctor ? '/admin' : '/appointment'} className="btn ghost sm">{isDoctor ? 'Back to doctor panel' : 'My appointment'}</Link>
      </div>
    </main>
  );
}
