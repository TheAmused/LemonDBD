'use client';
// frontend/src/app/[locale]/about/page.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { useParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
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
  children: React.ReactNode;
}

function AboutSection({ id, heading, children }: AboutSectionProps) {
  const [isExpanded, toggleExpanded] = usePersistentDrawer(`lemondbd_drawer_about_${id}`, true);

  return (
    <section className="rounded-3xl border border-border-color bg-bg-surface backdrop-blur-xl shadow-md overflow-hidden transition-colors flex flex-col">
      <button
        type="button"
        onClick={toggleExpanded}
        className="relative w-full flex items-center justify-center py-4 px-12 sm:px-14 cursor-pointer group select-none text-center"
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
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-2 border-t border-border-color p-4 sm:p-6 text-sm leading-relaxed">
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
      <div className="relative z-10 mx-auto flex w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl flex-col gap-4">
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

        <AboutSection id="credits" heading={about?.credits.heading}>
          <p className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto">
            <RichText text={about?.credits.text} />
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-text-primary">
            {CREDITS.map((name) => (
              <li key={name} className="font-semibold">{name}</li>
            ))}
          </ul>
        </AboutSection>
      </div>
    </PageShell>
  );
}
