/** Public half of the booking-alert key pair (safe to publish). The private half lives only in Vercel (VAPID_PRIVATE_KEY). */
export const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BPwXccUoaDheFJHyGIEqn4C2jOKpoi7VtBAwioLKg8p1UJsjSgyHL9q3j1r-trs5oLEqsMYm2ePsUGAFYmn1Dzc';

/** Browser push needs the key as bytes. */
export function keyBytes(base64url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
