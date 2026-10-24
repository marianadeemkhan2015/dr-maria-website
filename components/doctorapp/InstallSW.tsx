'use client';
import { useEffect } from 'react';

/** Registers the small service worker that lets phones install the doctor app. */
export default function InstallSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/doctor-sw.js', { scope: '/doctor' }).catch(() => {});
  }, []);
  return null;
}
