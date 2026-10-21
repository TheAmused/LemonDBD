'use client';
// frontend/src/components/layout/GlobalErrorDocument.tsx
//
// The whole document app/global-error.tsx shows when app/[locale]/layout.tsx itself throws: its own
// <html>/<body>, no providers (dictionary, theme, auth). The copy comes from i18n/errorPageCopy,
// picked by the URL's locale prefix (English until another locale's strings load).

import { logger } from '@/utils/logger';
import { useEffect, useState } from 'react';
import {
  ERROR_CODE_BADGE,
  ERROR_PAGE_ACTIONS,
  ERROR_PAGE_REFERENCE,
  ERROR_PAGE_TEXT,
  ERROR_PAGE_TITLE,
  GLOBAL_ERROR_HOME_BUTTON,
  GLOBAL_ERROR_RETRY_BUTTON,
} from '@/components/layout/errorPageClasses';
import { i18n, type Locale } from '@/i18n/config';
import { DEFAULT_ERROR_PAGE_COPY, loadErrorPageCopy, localeOfPath, type ErrorPageCopy } from '@/i18n/errorPageCopy';

export function GlobalErrorDocument({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [locale, setLocale] = useState<Locale>(i18n.defaultLocale);
  const [copy, setCopy] = useState<ErrorPageCopy>(DEFAULT_ERROR_PAGE_COPY);
  useEffect(() => {
    logger.error(error);
    const pathLocale = localeOfPath(window.location.pathname);
    let cancelled = false;
    void loadErrorPageCopy(pathLocale).then((loaded) => {
      if (cancelled) return;
      setLocale(pathLocale);
      setCopy(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [error]);

  return (
    <html lang={locale}>
      <body className="bg-bg-primary text-text-primary">
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
            <div className={ERROR_CODE_BADGE}>
              <span>{copy.error.code}</span>
            </div>
            <h1 className={ERROR_PAGE_TITLE}>{copy.error.title}</h1>
            <p className={ERROR_PAGE_TEXT}>{copy.error.text}</p>
            <div className={ERROR_PAGE_ACTIONS}>
              <button type="button" onClick={reset} className={GLOBAL_ERROR_RETRY_BUTTON}>
                {copy.error.retry}
              </button>
              {/* A full page load on purpose: the client router is part of what failed. */}
              <a href={`/${locale}`} className={GLOBAL_ERROR_HOME_BUTTON}>
                {copy.backHome}
              </a>
            </div>
            {error.digest ? (
              <p className={ERROR_PAGE_REFERENCE}>
                {copy.error.reference}: <code>{error.digest}</code>
              </p>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  );
}
