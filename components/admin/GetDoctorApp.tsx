'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

/** True on phones and tablets (not on a computer). */
export function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    const touchSmall = window.matchMedia?.('(pointer: coarse) and (max-width: 1024px)').matches;
    setMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(ua) || Boolean(touchSmall));
  }, []);
  return mobile;
}

/** Doctor panel: the doctor-app link only appears on a phone, where the app can be installed. */
export function GetDoctorAppLink() {
  return useIsMobile() ? <Link href="/doctor" className="btn sm">📲 Get doctor app</Link> : null;
}

export function GetDoctorAppBanner() {
  if (!useIsMobile()) return null;
  return (
    <div className="da-alert-banner" style={{ margin: '8px 0 14px' }}>
      <span>📲 Install the doctor app on this phone: today’s patients, video calls and booking alerts in one tap.</span>
      <Link href="/doctor" className="btn sm">Get app</Link>
    </div>
  );
}
