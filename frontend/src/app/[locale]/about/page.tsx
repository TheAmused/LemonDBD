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
      className={`rounded-3xl border border-border-color bg-bg-surface/90 backdrop-blur-xl shadow-md hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden ${className}`}
    >
      <button
        type="button"
        onClick={toggleExpanded}
        className="relative w-full flex items-center justify-center py-4 sm:py-5 px-12 sm:px-16 cursor-pointer group select-none text-center transition-colors"
        aria-expanded={isExpanded}
      >
        <h2 className="text-xs sm:text-sm md:text-base font-extrabold uppercase tracking-widest text-accent-red font-mono text-center transition-colors drop-shadow-xs">
          {heading}
        </h2>
        <ChevronDown
          className={`absolute right-4 sm:right-6 h-4 w-4 sm:h-5 sm:w-5 text-accent-red transition-transform duration-300 ease-in-out ${
            isExpanded ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3.5 border-t border-border-color/80 p-5 sm:p-7 text-xs sm:text-sm leading-relaxed">
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
      <div className="relative z-10 mx-auto w-full max-w-5xl xl:max-w-6xl flex flex-col gap-6 sm:gap-8 pb-12">
        {/* Header banner */}
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

        {/* Responsive Content Grid: 1 col on mobile, 2 cols on desktop (1024px+ / 1440px+) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
          {/* Column 1: Who are we? & Community */}
          <div className="flex flex-col gap-4 sm:gap-6">
            <AboutSection id="who" heading={about?.who.heading}>
              {about?.who.paragraphs.map((text, idx) => (
                <p
                  key={idx}
                  className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto leading-relaxed"
                >
                  <RichText text={text} />
                </p>
              ))}
            </AboutSection>

            <AboutSection id="community" heading={about?.community.heading}>
              {about?.community.paragraphs.map((text, idx) => (
                <p
                  key={idx}
                  className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto leading-relaxed"
                >
                  <RichText text={text} />
                </p>
              ))}
            </AboutSection>
          </div>

          {/* Column 2: Why did we build this? & Features */}
          <div className="flex flex-col gap-4 sm:gap-6">
            <AboutSection id="why" heading={about?.why.heading}>
              {about?.why.paragraphs.map((text, idx) => (
                <p
                  key={idx}
                  className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto leading-relaxed"
                >
                  <RichText text={text} />
                </p>
              ))}
            </AboutSection>

            <AboutSection id="features" heading={about?.features.heading}>
              {about?.features.paragraphs.map((text, idx) => (
                <p
                  key={idx}
                  className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto leading-relaxed"
                >
                  <RichText text={text} />
                </p>
              ))}
            </AboutSection>
          </div>

          {/* Full-width spanning row on desktop: Credits */}
          <AboutSection id="credits" heading={about?.credits.heading} className="lg:col-span-2">
            <p className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto leading-relaxed">
              <RichText text={about?.credits.text || ''} />
            </p>
            <div className="pt-2 sm:pt-3">
              <ul className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                {CREDITS.map((name) => (
                  <li
                    key={name}
                    className="px-4 py-1.5 rounded-2xl border border-border-color bg-bg-primary/90 text-xs sm:text-sm font-mono font-bold text-text-primary hover:border-accent-red/50 hover:text-accent-red transition-all shadow-xs"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </AboutSection>
        </div>
      </div>
    </PageShell>
  );
}
