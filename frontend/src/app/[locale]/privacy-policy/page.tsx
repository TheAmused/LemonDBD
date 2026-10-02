'use client';
// frontend/src/app/[locale]/privacy-policy/page.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { CampfireParticles } from '@/components/common/CampfireParticles';
import { RichText } from '@/components/common/RichText';
import { Locale } from '@/i18n/config';
import { useDictionary } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
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

const SUMMARY_BLOCK = 'summary';
const ALL_BLOCK_IDS: readonly string[] = [SUMMARY_BLOCK, ...PRIVACY_SECTION_ORDER];

interface BlockCardProps {
  id: string;
  title: string;
  accent?: boolean;
  children: React.ReactNode;
}

/** Collapsible card, the same drawer pattern the About page uses (state remembered per block). */
function BlockCard({ id, title, accent, children }: BlockCardProps) {
  const [isExpanded, toggleExpanded] = usePersistentDrawer(`lemondbd_drawer_privacy_${id}`, false);

  return (
    <div
      id={id}
      className="grid w-full scroll-mt-6 grid-cols-1 grid-rows-1 md:w-[calc(50%-0.75rem)] xl:w-[calc((100%-3rem)/3)]"
    >
      <section
        className={`col-start-1 row-start-1 z-10 flex flex-col overflow-hidden rounded-3xl border bg-bg-surface backdrop-blur-xl shadow-md transition-colors ${
          accent ? 'border-accent-red/30' : 'border-border-color'
        } ${isExpanded ? 'h-full self-stretch' : 'h-fit self-start'}`}
      >
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={isExpanded}
          className="relative flex w-full shrink-0 cursor-pointer select-none items-center justify-center px-12 py-4 text-center sm:px-14"
        >
          <h2 className="text-center text-xs font-bold uppercase tracking-widest text-accent-red sm:text-sm">
            {title}
          </h2>
          <ChevronDown
            className={`absolute right-5 h-4 w-4 text-accent-red transition-transform duration-300 ease-in-out sm:right-7 sm:h-5 sm:w-5 ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </button>
        <div
          className={`grid flex-1 transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="h-full overflow-hidden">
            <div className="flex h-full flex-col gap-2 border-t border-border-color p-4 type-body-lg sm:p-6">
              {children}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

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

  const blockTitle = (id: string): string =>
    id === SUMMARY_BLOCK
      ? privacy?.summaryHeading ?? ''
      : privacy?.sections[id as (typeof PRIVACY_SECTION_ORDER)[number]]?.heading ?? '';

  const renderBlockBody = (id: string) => {
    if (!privacy) return null;
    if (id === SUMMARY_BLOCK) {
      return (
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-text-muted marker:text-accent-red">
          {privacy.summary.map((line, i) => (
            <li key={i}>
              <RichText text={fill(line)} />
            </li>
          ))}
        </ul>
      );
    }
    const section = privacy.sections[id as (typeof PRIVACY_SECTION_ORDER)[number]];
    const P = 'text-text-muted text-justify [text-justify:inter-word] hyphens-auto';
    // Lead-in paragraph, then the list, then any closing paragraphs (e.g. how to use your rights).
    const lead = section.items.length > 0 ? section.paragraphs.slice(0, 1) : section.paragraphs;
    const closing = section.items.length > 0 ? section.paragraphs.slice(1) : [];
    return (
      <>
        {lead.map((text, i) => (
          <p key={i} className={P}>
            <RichText text={fill(text)} />
          </p>
        ))}
        {section.items.length > 0 ? (
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-text-muted marker:text-accent-red">
            {section.items.map((text, i) => (
              <li key={i}>
                <RichText text={fill(text)} />
              </li>
            ))}
          </ul>
        ) : null}
        {closing.map((text, i) => (
          <p key={`c${i}`} className={P}>
            <RichText text={fill(text)} />
          </p>
        ))}
      </>
    );
  };

  return (
    <PageShell
      locale={locale}
      dict={dict || ({} as Dictionary)}
      padding="spacious"
      mainClassName="flex flex-col items-center min-h-[calc(100vh-4rem)] lg:min-h-screen overflow-y-auto relative"
    >
      <CampfireParticles />
      <div className="relative z-10 mx-auto flex w-full max-w-[110rem] flex-col gap-6 py-6 sm:gap-8 sm:py-10">
        <header className="grid grid-cols-2 items-center gap-x-4 gap-y-3 sm:grid-cols-[1fr_auto_1fr]">
          <Link
            href={`/${locale}/about`}
            className="inline-flex w-fit items-center gap-1.5 type-strong-fluid text-text-muted transition-colors hover:text-accent-red"
          >
            <ArrowLeft className="h-4 w-4" />
            {privacy?.backToAbout}
          </Link>
          <h1 className="col-span-2 row-start-2 text-center text-2xl font-black tracking-tight text-text-primary sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:text-3xl md:text-4xl">
            {privacy?.heading}
          </h1>
          <p className="justify-self-end text-right text-mini uppercase tracking-widest text-text-muted sm:col-start-3 sm:row-start-1 sm:text-xs">
            {privacy?.lastUpdatedLabel}: {privacy?.lastUpdated}
          </p>
        </header>

        {privacy ? (
          <div className="flex flex-wrap items-start justify-center gap-6">
            {ALL_BLOCK_IDS.map((id) => (
              <BlockCard key={id} id={id} title={blockTitle(id)} accent={id === SUMMARY_BLOCK}>
                {renderBlockBody(id)}
              </BlockCard>
            ))}
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
