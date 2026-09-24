'use client';
// frontend/src/app/[locale]/about/page.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { useParams } from 'next/navigation';
import { ChevronDown, Sparkles } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { CampfireParticles } from '@/components/common/CampfireParticles';
import { RichText } from '@/components/common/RichText';
import { Locale } from '@/i18n/config';
import { useDictionary } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';

// Placeholder names, to be replaced with real contributors before publishing.
const CREDITS = ['test1', 'test2', 'test3', 'test4', 'test5'] as const;

interface AboutSectionProps {
  id: string;
  heading?: string;
  className?: string;
  children: React.ReactNode;
}

function AboutSection({ id, heading, className = '', children }: AboutSectionProps) {
  const [isExpanded, toggleExpanded] = usePersistentDrawer(`lemondbd_drawer_about_${id}`, true);

  return (
    <section
      className={`rounded-3xl border border-border-color bg-bg-surface backdrop-blur-xl shadow-md overflow-hidden transition-colors flex flex-col ${
        isExpanded ? 'h-full' : 'h-fit'
      } ${className}`}
    >
      <button
        type="button"
        onClick={toggleExpanded}
        className="relative w-full flex items-center justify-center py-4 px-12 sm:px-14 cursor-pointer group select-none text-center shrink-0"
        aria-expanded={isExpanded}
      >
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-accent-red font-mono text-center">
          {heading}
        </h2>
        <ChevronDown
          className={`absolute right-5 sm:right-7 h-4 w-4 sm:h-5 sm:w-5 text-accent-red transition-transform duration-300 ease-in-out ${
            isExpanded ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out flex-1 ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden h-full">
          <div className="flex flex-col gap-2 border-t border-border-color p-4 sm:p-6 text-sm leading-relaxed h-full">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AboutPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const dict = useDictionary();
  const about = dict?.about;

  useDocumentTitle(about?.pageTitle || 'LemonDBD - About us');

  return (
    <PageShell
      locale={locale}
      dict={dict || ({} as Dictionary)}
      padding="spacious"
      mainClassName="overflow-y-auto relative"
    >
      <CampfireParticles />
      <div className="relative z-10 mx-auto flex w-full max-w-5xl xl:max-w-6xl flex-col gap-6 sm:gap-8 pb-10">
        {/* Header */}
        <header className="flex flex-col items-center text-center gap-2.5 sm:gap-3 pt-2 sm:pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border-color bg-bg-surface/80 backdrop-blur-md text-[11px] font-mono font-bold uppercase tracking-wider text-text-secondary shadow-xs">
            <Sparkles className="h-3 w-3 text-accent-red" />
            <span className="text-accent-red font-black">{dict?.app?.title || 'LemonDBD'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-mono tracking-tight text-text-primary">
            {about?.pageTitle || 'LemonDBD - About us'}
          </h1>
          {about?.features?.paragraphs?.[0] ? (
            <p className="max-w-2xl text-xs sm:text-sm text-text-muted leading-relaxed text-center px-4">
              <RichText text={about.features.paragraphs[0]} />
            </p>
          ) : null}
        </header>

        {/* 2:2:1 Grid layout: Row 1 (2 cards equal height), Row 2 (2 cards equal height), Row 3 (1 card full width) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
          {/* Row 1: Who are we? & Why did we build this? */}
          <AboutSection id="who" heading={about?.who.heading}>
            {about?.who.paragraphs.map((text, i) => (
              <p key={i} className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto">
                <RichText text={text} />
              </p>
            ))}
          </AboutSection>

          <AboutSection id="why" heading={about?.why.heading}>
            {about?.why.paragraphs.map((text, i) => (
              <p key={i} className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto">
                <RichText text={text} />
              </p>
            ))}
          </AboutSection>

          {/* Row 2: For streamers and players & What will you find here? */}
          <AboutSection id="community" heading={about?.community.heading}>
            {about?.community.paragraphs.map((text, i) => (
              <p key={i} className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto">
                <RichText text={text} />
              </p>
            ))}
          </AboutSection>

          <AboutSection id="features" heading={about?.features.heading}>
            {about?.features.paragraphs.map((text, i) => (
              <p key={i} className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto">
                <RichText text={text} />
              </p>
            ))}
          </AboutSection>

          {/* Row 3: Credits (full width spanning both columns) */}
          <AboutSection id="credits" heading={about?.credits.heading} className="lg:col-span-2">
            <p className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto">
              <RichText text={about?.credits.text} />
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-text-primary marker:text-accent-red pt-1">
              {CREDITS.map((name) => (
                <li key={name} className="font-semibold">{name}</li>
              ))}
            </ul>
          </AboutSection>
        </div>
      </div>
    </PageShell>
  );
}
