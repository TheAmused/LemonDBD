'use client';
// frontend/src/components/legal/LegalPage.tsx
//
// The shared frame of the long-form "legal" pages (Privacy Policy, Rules): page shell + header,
// and the pill that links to those pages from About us. The collapsible cards inside live in
// components/common/BlockCard. A page supplies only its content.
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import type { Locale } from '@/i18n/config';

interface LegalPageLayoutProps {
  locale: Locale;
  heading: string;
  backLabel: string;
  /** Ready-made stamp, e.g. "Last updated: October 9, 2026". */
  lastUpdated: string;
  children: React.ReactNode;
}

/** Page shell, "back to About us" link, title and last-updated stamp. */
export function LegalPageLayout({ locale, heading, backLabel, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <PageShell
      locale={locale}
      padding="spacious"
      mainClassName="flex flex-col items-center min-h-[calc(100vh-4rem)] lg:min-h-screen overflow-y-auto relative"
    >
      <div className="relative z-10 mx-auto flex w-full max-w-[110rem] flex-col gap-6 py-6 sm:gap-8 sm:py-10">
        <header className="grid grid-cols-2 items-center gap-x-4 gap-y-3 sm:grid-cols-[1fr_auto_1fr]">
          <Link
            href={`/${locale}/about`}
            className="inline-flex w-fit items-center gap-1.5 type-strong-fluid text-text-muted transition-colors hover:text-accent-red"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <h1 className="col-span-2 row-start-2 text-center text-2xl font-black tracking-tight text-text-primary sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:text-3xl md:text-4xl">
            {heading}
          </h1>
          <p className="justify-self-end text-right text-mini uppercase tracking-widest text-text-muted sm:col-start-3 sm:row-start-1 sm:text-xs">
            {lastUpdated}
          </p>
        </header>
        {children}
      </div>
    </PageShell>
  );
}

interface LegalLinkPillProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

/** The round "go to this legal page" button used on About us. */
export function LegalLinkPill({ href, icon, children }: LegalLinkPillProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-border-color bg-bg-surface px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-widest text-accent-red shadow-md backdrop-blur-xl transition-colors hover:border-accent-red/50 hover:bg-bg-elevated"
    >
      <span aria-hidden="true">{icon}</span>
      {children}
    </Link>
  );
}
