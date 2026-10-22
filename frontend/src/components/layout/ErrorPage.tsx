'use client';
// frontend/src/components/layout/ErrorPage.tsx
//
// The "you can't see this" pages -- 404 Not found, 403 Forbidden, Blocked (a page an admin
// switched off) and Error (a page that crashed while rendering; app/[locale]/error.tsx). They are
// the home page's layout with different words, inside the normal app shell so the sidebar stays
// usable.

import React from 'react';
import Link from 'next/link';
import { Home, RotateCcw } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { LemonIcon } from '@/components/LemonIcon';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button, buttonClassName } from '@/components/common/Button';
import {
  ERROR_CODE_BADGE,
  ERROR_PAGE_ACTIONS,
  ERROR_PAGE_REFERENCE,
  ERROR_PAGE_TEXT,
  ERROR_PAGE_TITLE,
} from '@/components/layout/errorPageClasses';

export type ErrorPageVariant = 'not-found' | 'forbidden' | 'blocked' | 'error';

interface ErrorPageProps {
  variant: ErrorPageVariant;
  /** 'error' only: re-render the segment that crashed (Next's `reset`). */
  onRetry?: () => void;
  /** 'error' only: Next's error digest, so a report can be matched to the server log. */
  reference?: string;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({ variant, onRetry, reference }) => {
  const dict = useDictionary();
  const locale = useLocale();
  const { isAuthenticated } = useAuth();
  const copy = dict.errorPages;

  const { code, title, text } =
    variant === 'not-found'
      ? { code: copy.notFound.code, title: copy.notFound.title, text: copy.notFound.text }
      : variant === 'forbidden'
        ? {
            code: copy.forbidden.code,
            title: copy.forbidden.title,
            text: isAuthenticated ? copy.forbidden.textSignedIn : copy.forbidden.textGuest,
          }
        : variant === 'error'
          ? { code: copy.error.code, title: copy.error.title, text: copy.error.text }
          : {
              code: copy.blocked.code,
              title: copy.blocked.title,
              text: copy.blocked.text,
            };

  useDocumentTitle(`${dict.app.title} - ${title}`);

  return (
    <PageShell
      locale={locale}
      activeCategory=""
      mainId="main-error-content"
      customPadding="p-4 sm:p-8 lg:p-12"
      mainClassName="flex items-center justify-center min-h-screen-nav lg:min-h-screen"
    >
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center py-8 text-center sm:py-12">
        <div className="group relative mb-8 flex h-36 w-36 items-center justify-center rounded-card border-2 border-accent-red/40 bg-bg-elevated p-6 shadow-md transition-transform duration-300 hover:scale-105 sm:h-44 sm:w-44">
          <LemonIcon className="dbd-lemon-glow h-full w-full transition-transform duration-300 group-hover:rotate-6" />
        </div>

        <div className={ERROR_CODE_BADGE}>
          <span>{code}</span>
        </div>

        <h1 className={ERROR_PAGE_TITLE}>{title}</h1>
        <p className={ERROR_PAGE_TEXT}>{text}</p>

        <div className={ERROR_PAGE_ACTIONS}>
          {onRetry ? (
            <Button variant="secondary" size="lg" onClick={onRetry} leftIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}>
              <span>{copy.error.retry}</span>
            </Button>
          ) : null}
          <Link
            href={`/${locale}`}
            className={buttonClassName('primary', 'lg')}
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span>{copy.backHome}</span>
          </Link>
        </div>
        {reference ? (
          <p className={ERROR_PAGE_REFERENCE}>
            {copy.error.reference}: <code>{reference}</code>
          </p>
        ) : null}
      </div>
    </PageShell>
  );
};
