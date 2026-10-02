'use client';
// frontend/src/components/layout/ErrorPage.tsx
//
// The three "you can't see this" pages -- 404 Not found, 403 Forbidden and Blocked (a page an
// admin switched off). They are the home page's layout with different words, inside the normal
// app shell so the sidebar stays usable.

import React from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { LemonIcon } from '@/components/LemonIcon';
import { FogHeartbeatBackground } from '@/components/landing/FogHeartbeatBackground';
import { buildMainNavItems } from '@/components/sidebar/mainNavItems';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { PageSlug } from '@/utils/sitePages';

export type ErrorPageVariant = 'not-found' | 'forbidden' | 'blocked';

interface ErrorPageProps {
  variant: ErrorPageVariant;
  /** For `blocked`: the switched-off page that was requested. */
  pageId?: PageSlug | null;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({ variant, pageId = null }) => {
  const dict = useDictionary();
  const locale = useLocale();
  const { isAuthenticated } = useAuth();
  const copy = dict.errorPages;

  const pageLabel =
    (pageId ? buildMainNavItems(dict, locale).find((item) => item.pageId === pageId)?.label : undefined) ?? '';

  const { code, title, text } =
    variant === 'not-found'
      ? { code: copy.notFound.code, title: copy.notFound.title, text: copy.notFound.text }
      : variant === 'forbidden'
        ? {
            code: copy.forbidden.code,
            title: copy.forbidden.title,
            text: isAuthenticated ? copy.forbidden.textSignedIn : copy.forbidden.textGuest,
          }
        : {
            code: copy.blocked.code,
            title: copy.blocked.title,
            text: pageLabel ? copy.blocked.text.replace('{page}', pageLabel) : copy.blocked.textGeneric,
          };

  useDocumentTitle(`${dict.app.title} - ${title}`);

  return (
    <PageShell
      locale={locale}
      dict={dict}
      activeCategory=""
      mainId="main-error-content"
      outerClassName="relative min-h-screen overflow-hidden bg-bg-primary text-text-primary flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300"
      decoration={<FogHeartbeatBackground />}
      customPadding="p-4 sm:p-8 lg:p-12"
      mainClassName="flex items-center justify-center min-h-[calc(100vh-4rem)] lg:min-h-screen"
    >
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center py-8 text-center sm:py-12">
        <div className="group relative mb-8 flex h-36 w-36 items-center justify-center rounded-3xl border-2 border-accent-red/40 bg-bg-elevated p-6 shadow-md transition-transform duration-300 hover:scale-105 sm:h-44 sm:w-44">
          <LemonIcon className="dbd-lemon-glow h-full w-full transition-transform duration-300 group-hover:rotate-6" />
        </div>

        <div className="mb-5 inline-flex items-center rounded-full border border-accent-red/30 bg-accent-red/10 px-4 py-1.5 type-label-sm text-accent-red">
          <span>{code}</span>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-text-primary sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-md text-sm font-medium leading-relaxed text-text-secondary sm:text-base">{text}</p>
        {variant === 'blocked' ? (
          <p className="mt-3 max-w-md type-body text-text-muted">{copy.blocked.hint}</p>
        ) : null}

        <div className="mt-8">
          <Link
            href={`/${locale}`}
            className="inline-flex cursor-pointer items-center gap-2.5 rounded-2xl bg-accent-red px-7 py-3.5 type-card-title text-text-inverted shadow-md transition-all hover:scale-105 hover:bg-accent-red-hover active:scale-95"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span>{copy.backHome}</span>
          </Link>
        </div>
      </div>
    </PageShell>
  );
};

export default ErrorPage;
