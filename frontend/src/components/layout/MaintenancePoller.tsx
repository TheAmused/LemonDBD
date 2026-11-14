'use client';
// frontend/src/components/layout/MaintenancePoller.tsx
//
// The proxy closes the site for page requests, but a tab that was already open keeps running without
// asking it. Once a minute (and when the tab comes back into view) this asks the server whether the
// site is now closed for this visitor and, if so, moves them to the maintenance page.
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/context/DictionaryContext';
import { fetchMaintenanceStatus } from '@/services/maintenanceStatus';

const POLL_MS = 60_000;

export function MaintenancePoller() {
  const locale = useLocale();
  const pathname = usePathname() || '/';

  useEffect(() => {
    // The maintenance page polls for itself, and the admin side (its sign-in too) is never closed.
    if (/\/(maintenance|admin)(\/.*)?$/.test(pathname)) return undefined;
    const controller = new AbortController();
    const check = async () => {
      const status = await fetchMaintenanceStatus(controller.signal);
      if (status?.blocked && !controller.signal.aborted) window.location.assign(`/${locale}/maintenance`);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    const timer = setInterval(() => void check(), POLL_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [locale, pathname]);

  return null;
}
