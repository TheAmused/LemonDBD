'use client';
// frontend/src/components/layout/ErrorPage.tsx
//
// The three "you can't see this" pages -- 404 Not found, 403 Forbidden and Blocked (a page an
// admin switched off) -- all inside the normal app shell so the sidebar stays usable.

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Ban, Home, Lock, SearchX } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Surface } from '@/components/common/Surface';
import { buttonClassName } from '@/components/common/Button';
import { buildMainNavItems } from '@/components/sidebar/mainNavItems';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSitePages } from '@/hooks/useSitePages';
import type { SitePageId } from '@/utils/sitePages';

export type ErrorPageVariant = 'not-found' | 'forbidden' | 'blocked';

const VARIANT_ICON: Record<ErrorPageVariant, React.ElementType> = {
  'not-found': SearchX,
  forbidden: Lock,
  blocked: Ban,
};

interface ErrorPageProps {
  variant: ErrorPageVariant;
  /** For `blocked`: the switched-off page that was requested. */
  pageId?: SitePageId | null;
}

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
    <dt className="type-label-2xs text-text-muted">{label}</dt>
    <dd className="type-strong min-w-0 break-all text-text-primary sm:text-right">{value}</dd>
  </div>
);

export const ErrorPage: React.FC<ErrorPageProps> = ({ variant, pageId = null }) => {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname() || '';
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { isOff } = useSitePages();
  const copy = dict.errorPages;
  const Icon = VARIANT_ICON[variant];

  const navItems = buildMainNavItems(dict, locale);
  const pageLabel = (pageId ? navItems.find((item) => item.pageId === pageId)?.label : undefined) ?? '';

  const variantCopy =
    variant === 'not-found'
      ? copy.notFound
      : variant === 'forbidden'
        ? copy.forbidden
        : copy.blocked;
  const bodyText =
    variant === 'not-found'
      ? copy.notFound.text
      : variant === 'forbidden'
        ? isAuthenticated
          ? copy.forbidden.textSignedIn
          : copy.forbidden.textGuest
        : pageLabel
          ? copy.blocked.text.replace('{page}', pageLabel)
          : copy.blocked.textGeneric;

  useDocumentTitle(`${dict.app.title} - ${variantCopy.title}`);

  const links = navItems.filter((item) => item.pageId !== pageId && (isAdmin || !isOff(item.pageId)));

  return (
    <PageShell locale={locale} dict={dict} mainId="main-error-content" mainClassName="flex flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 py-4 sm:gap-6 sm:py-10">
        <Surface padding="none" radius="3xl" className="overflow-hidden shadow-md backdrop-blur-xl">
          <div className="relative overflow-hidden px-5 py-4 text-center sm:px-7">
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20 mix-blend-luminosity dark:opacity-30"
              style={{ backgroundImage: "url('/images/banners/banner_loadouts.webp')" }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg-surface via-bg-surface/75 to-bg-surface" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border-color/60" />
            <p className="type-section-title relative z-10 text-accent-red">{variantCopy.code}</p>
          </div>

          <div className="flex flex-col items-center px-5 py-7 text-center sm:px-10 sm:py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-red/30 bg-accent-red/15 text-accent-red">
              <Icon className="h-8 w-8" aria-hidden="true" />
            </div>
            <h1 className="type-page-title mt-4 text-text-primary">{variantCopy.title}</h1>
            <p className="type-body-fluid mt-2 max-w-md text-text-secondary">{bodyText}</p>
            {variant === 'blocked' ? (
              <p className="type-body mt-2 max-w-md text-text-muted">{copy.blocked.hint}</p>
            ) : null}

            <dl className="mt-6 w-full max-w-md divide-y divide-border-color rounded-2xl border border-border-color bg-bg-primary/60 text-left">
              <InfoRow label={copy.statusLabel} value={variantCopy.status} />
              {variant === 'blocked' && pageLabel ? <InfoRow label={copy.pageLabel} value={pageLabel} /> : null}
              <InfoRow label={copy.addressLabel} value={pathname} />
              {variant === 'forbidden' ? (
                <InfoRow label={copy.accountLabel} value={isAuthenticated && user ? user.username : copy.guest} />
              ) : null}
            </dl>

            <div className="mt-6 flex w-full max-w-md flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href={`/${locale}`} className={buttonClassName('primary', 'md', 'sm:flex-1')}>
                <Home className="h-4 w-4" aria-hidden="true" />
                <span>{copy.backHome}</span>
              </Link>
              <button type="button" onClick={() => router.back()} className={buttonClassName('secondary', 'md', 'sm:flex-1')}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>{copy.goBack}</span>
              </button>
            </div>
          </div>
        </Surface>

        <Surface as="section" radius="3xl" aria-labelledby="error-next-title">
          <h2 id="error-next-title" className="type-label-xs mb-3 text-text-muted">
            {copy.nextTitle}
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {links.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="type-strong flex items-center gap-2.5 rounded-xl border border-border-color bg-bg-elevated px-3 py-2.5 text-text-primary transition-colors hover:border-accent-red/40 hover:text-accent-red"
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${item.color}`} aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Surface>
      </div>
    </PageShell>
  );
};

export default ErrorPage;
