'use client';
// frontend/src/components/layout/MaintenancePage.tsx
//
// What a visitor sees while maintenance mode is on. The Next.js proxy rewrites every page request to it
// (status 503), so the URL in the address bar is the page they asked for. It has no sidebar: nothing
// behind it would open. It asks the server every half minute and leaves by itself once the site is open
// again. It never says when that will be.
import React, { useCallback, useEffect } from 'react';
import { useShellOverride } from '@/components/layout/AppShell';
import { CenteredScreen } from '@/components/layout/CenteredScreen';
import { ERROR_PAGE_TEXT, ERROR_PAGE_TITLE } from '@/components/layout/errorPageClasses';
import { LemonIcon } from '@/components/LemonIcon';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { fetchMaintenanceStatus, type MaintenanceStatus } from '@/services/maintenanceStatus';

const POLL_MS = 30_000;

/** Back to the site: the page that was asked for when it was rewritten, else the home page. */
function leave(locale: string): void {
  if (/\/maintenance\/?$/.test(window.location.pathname)) window.location.assign(`/${locale}`);
  else window.location.reload();
}

export function MaintenancePage() {
  const dict = useDictionary();
  const locale = useLocale();
  const copy = dict.errorPages.maintenance;

  useDocumentTitle(`${dict.app.title} - ${copy.title}`);
  useShellOverride(false);

  /** The server's answer: back to the site when it is open for this visitor. No return time is shown. */
  const apply = useCallback(
    (status: MaintenanceStatus | null) => {
      if (!status) return;
      if (!status.blocked) leave(locale);
    },
    [locale]
  );

  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      void fetchMaintenanceStatus(controller.signal).then((status) => {
        if (!controller.signal.aborted) apply(status);
      });
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [apply]);

  return (
    <CenteredScreen className="flex max-w-xl flex-col items-center text-center">
      <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-card border-2 border-accent-red/40 bg-bg-elevated p-5 shadow-md">
        <LemonIcon className="dbd-lemon-glow h-full w-full" />
      </div>
      <h1 className={ERROR_PAGE_TITLE}>{copy.title}</h1>
      <p className={ERROR_PAGE_TEXT}>{copy.text}</p>
    </CenteredScreen>
  );
}
