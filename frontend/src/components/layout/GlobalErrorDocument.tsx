'use client';
// frontend/src/components/layout/GlobalErrorDocument.tsx
//
// The whole document app/global-error.tsx shows when app/[locale]/layout.tsx itself throws: its own
// <html>/<body>, no providers (dictionary, theme, auth). The copy comes from i18n/errorPageCopy,
// picked by the URL's locale prefix.

import { useEffect, useState } from 'react';
import { buttonClassName } from '@/components/common/Button';
import {
  ERROR_CODE_BADGE,
  ERROR_PAGE_ACTIONS,
  ERROR_PAGE_REFERENCE,
  ERROR_PAGE_TEXT,
  ERROR_PAGE_TITLE,
} from '@/components/layout/errorPageClasses';
import { i18n, type Locale } from '@/i18n/config';
import { errorPageCopy, localeOfPath } from '@/i18n/errorPageCopy';

export function GlobalErrorDocument({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [locale, setLocale] = useState<Locale>(i18n.defaultLocale);
  useEffect(() => {
    setLocale(localeOfPath(window.location.pathname));
    console.error(error);
  }, [error]);
  const copy = errorPageCopy(locale);

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
              <button type="button" onClick={reset} className={buttonClassName('secondary', 'lg')}>
                {copy.error.retry}
              </button>
              {/* A full page load on purpose: the client router is part of what failed. */}
              <a href={`/${locale}`} className={buttonClassName('primary', 'lg')}>
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
