'use client';
// frontend/src/app/[locale]/privacy-policy/page.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { CampfireParticles } from '@/components/common/CampfireParticles';
import { RichText } from '@/components/common/RichText';
import { Locale } from '@/i18n/config';
import { useDictionary } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { apiUrl } from '@/utils/api';
import { fillPrivacyPlaceholders, type PrivacyInfo } from '@/utils/privacyPlaceholders';

/** Render order of the policy sections (keys of `dict.privacy.sections`). */
export const PRIVACY_SECTION_ORDER = [
  'whoWeAre',
  'dataWeCollect',
  'howWeUse',
  'analytics',
  'storage',
  'sharing',
  'transfers',
  'retention',
  'security',
  'rights',
  'children',
  'changes',
  'contact',
] as const;

export default function PrivacyPolicyPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const dict = useDictionary();
  const privacy = dict?.privacy;

  useDocumentTitle(privacy?.pageTitle || 'LemonDBD - Privacy Policy');

  // Contact address, lifetimes and mail provider come from the backend (admin-editable),
  // so the translated text only holds placeholders for them.
  const [info, setInfo] = useState<PrivacyInfo | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl('/api/v1/privacy-info'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PrivacyInfo | null) => {
        if (!cancelled && data) setInfo(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const fill = (text?: string | null) => (text ? fillPrivacyPlaceholders(text, info, locale) : text);

  return (
    <PageShell
      locale={locale}
      dict={dict || ({} as Dictionary)}
      padding="spacious"
      mainClassName="flex flex-col items-center min-h-[calc(100vh-4rem)] lg:min-h-screen overflow-y-auto relative"
    >
      <CampfireParticles />
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-6 sm:gap-8 py-6 sm:py-10">
        <Link
          href={`/${locale}/about`}
          className="inline-flex w-fit items-center gap-1.5 text-xs sm:text-sm font-semibold text-text-muted hover:text-accent-red transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {privacy?.backToAbout}
        </Link>

        <header className="flex flex-col items-center text-center gap-2.5 sm:gap-3">
          <ShieldCheck className="h-8 w-8 text-accent-red" aria-hidden="true" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-mono tracking-tight text-text-primary">
            {privacy?.heading}
          </h1>
          <p className="text-[11px] sm:text-xs font-mono uppercase tracking-widest text-text-muted">
            {privacy?.lastUpdatedLabel}: {privacy?.lastUpdated}
          </p>
          <p className="max-w-2xl text-xs sm:text-sm text-text-muted leading-relaxed px-2">
            <RichText text={fill(privacy?.intro)} />
          </p>
        </header>

        {privacy ? (
          <>
            <section className="rounded-3xl border border-accent-red/30 bg-bg-surface backdrop-blur-xl shadow-md p-4 sm:p-6">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-accent-red font-mono text-center pb-3">
                {privacy.summaryHeading}
              </h2>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-text-muted marker:text-accent-red">
                {privacy.summary.map((line, i) => (
                  <li key={i}>
                    <RichText text={fill(line)} />
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex flex-col gap-4 sm:gap-5">
              {PRIVACY_SECTION_ORDER.map((key, index) => {
                const section = privacy.sections[key];
                return (
                  <section
                    key={key}
                    id={key}
                    className="scroll-mt-6 rounded-3xl border border-border-color bg-bg-surface backdrop-blur-xl shadow-md p-4 sm:p-6"
                  >
                    <h2 className="flex items-baseline gap-2 pb-3 text-xs sm:text-sm font-bold uppercase tracking-widest text-accent-red font-mono">
                      <span className="text-text-muted">{String(index + 1).padStart(2, '0')}</span>
                      {section.heading}
                    </h2>
                    <div className="flex flex-col gap-2.5 text-sm leading-relaxed text-text-muted">
                      {section.paragraphs.map((text, i) => (
                        <p key={i}>
                          <RichText text={fill(text)} />
                        </p>
                      ))}
                      {section.items.length > 0 ? (
                        <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-accent-red">
                          {section.items.map((text, i) => (
                            <li key={i}>
                              <RichText text={fill(text)} />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </PageShell>
  );
}
