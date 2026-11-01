'use client';
// frontend/src/components/legal/LegalPage.tsx
//
// The shared frame of the long-form "legal" pages (Privacy Policy, Terms, Rules): page shell, the
// last-updated stamp, and the capsule that leads to a legal page (the row of them is <LegalLinks> in About).
// The collapsible cards inside live in components/common/BlockCard. A page supplies only its content.
import React from 'react';
import type { DbdIconProps } from '@/components/icons/DbdIcons';
import { LinkPill } from '@/components/common/LinkPill';
import { Surface } from '@/components/common/Surface';
import { cn } from '@/utils/cn';
import { trackEvent } from '@/utils/analytics';

export type LegalPageId = 'about' | 'terms-of-service' | 'privacy-policy' | 'rules';

/** The "Last updated: ..." stamp: top right, in the primary (white) text colour. */
export function LastUpdatedStamp({ label, date }: { label: string; date: string }) {
  return (
    <p className="text-center text-mini uppercase tracking-widest text-text-primary sm:text-right sm:text-xs">
      {label}: {date}
    </p>
  );
}

interface LegalPageLayoutProps {
  /** Page title, read by screen readers only: the page itself starts with its content. */
  heading: string;
  lastUpdatedLabel: string;
  lastUpdated: string;
  children: React.ReactNode;
}

/** Page shell and last-updated stamp. */
export function LegalPageLayout({ heading, lastUpdatedLabel, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <div className="relative z-10 mx-auto flex w-full max-w-page-lg flex-col gap-6 py-6 sm:gap-8 sm:py-10">
      <h1 className="sr-only">{heading}</h1>
      <LastUpdatedStamp label={lastUpdatedLabel} date={lastUpdated} />
      {children}
    </div>
  );
}

export interface LegalIntroNotice {
  icon: React.ComponentType<DbdIconProps>;
  text: string;
}

interface LegalIntroProps {
  /** The notes every reader must see first (summaries are not binding, which language prevails). One column each. */
  notices: readonly LegalIntroNotice[];
}

/** The notes at the top of a legal page: a strip as wide as the cards below, one icon-led column per note. */
export function LegalIntro({ notices }: LegalIntroProps) {
  return (
    <Surface
      as="aside"
      padding="none"
      className={cn('grid divide-y divide-border-color overflow-hidden md:divide-x md:divide-y-0', notices.length > 1 && 'md:grid-cols-2')}
    >
      {notices.map(({ icon: Icon, text }) => (
        <div key={text} className="flex items-start gap-3.5 p-4 sm:p-5">
          <Icon className="icon-md mt-0.5 shrink-0 text-accent-amber" aria-hidden="true" />
          <p className="type-body-fluid text-text-secondary">{text}</p>
        </div>
      ))}
    </Surface>
  );
}

interface LegalLinkPillProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  target: LegalPageId;
}

/** The "go to this legal page" capsule. */
export function LegalLinkPill({ href, icon, children, target }: LegalLinkPillProps) {
  return (
    <LinkPill
      href={href}
      icon={icon}
      className="text-xs sm:text-sm font-bold uppercase tracking-widest"
      onClick={() => trackEvent('legal_link_click', { target })}
    >
      {children}
    </LinkPill>
  );
}
