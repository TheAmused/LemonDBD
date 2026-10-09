'use client';
// frontend/src/app/[locale]/about/page.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, Mail, ShieldCheck } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { RichText } from '@/components/common/RichText';
import { DiscordIcon } from '@/components/icons/DiscordIcon';
import { Locale } from '@/i18n/config';
import { useDictionary } from '@/context/DictionaryContext';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import { usePrivacyInfo } from '@/hooks/usePrivacyInfo';

const DISCORD_INVITE_URL = 'https://discord.gg/Veygfp6XfT';

// Placeholder names, to be replaced with real contributors before publishing.
const CREDITS = ['test1', 'test2', 'test3', 'test4', 'test5'] as const;

interface AboutSectionConfig {
  id: string;
  heading?: string;
  children: React.ReactNode;
}

function SyncedAboutCard({
  section,
  isExpanded,
  toggleExpanded,
  isAnyExpandedInRow,
}: {
  section: AboutSectionConfig;
  isExpanded: boolean;
  toggleExpanded: () => void;
  isAnyExpandedInRow: boolean;
}) {
  return (
    <div className="grid grid-cols-1 grid-rows-1">
      <section
        className={`col-start-1 row-start-1 z-10 rounded-3xl border border-border-color bg-bg-surface backdrop-blur-xl shadow-md overflow-hidden transition-colors flex flex-col ${
          isExpanded ? 'self-stretch h-full' : 'self-start h-fit'
        }`}
      >
        <button
          type="button"
          onClick={toggleExpanded}
          className="relative w-full flex items-center justify-center py-4 px-12 sm:px-14 cursor-pointer group select-none text-center shrink-0"
          aria-expanded={isExpanded}
        >
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-accent-red text-center">
            {section.heading}
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
            <div className="flex flex-col gap-2 border-t border-border-color p-4 sm:p-6 type-body-lg h-full">
              {section.children}
            </div>
          </div>
        </div>
      </section>

      {/* Ghost sizer (active on lg screens when any card in row is open) */}
      <div
        aria-hidden="true"
        className="col-start-1 row-start-1 invisible pointer-events-none select-none hidden lg:flex flex-col rounded-3xl border border-transparent"
      >
        <div className="py-4 px-12 sm:px-14 shrink-0">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-center opacity-0">
            {section.heading}
          </h2>
        </div>
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out flex-1 ${
            isAnyExpandedInRow ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden h-full">
            <div className="flex flex-col gap-2 border-t border-transparent p-4 sm:p-6 type-body-lg h-full">
              {section.children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SyncedAboutPair({
  sectionA,
  sectionB,
}: {
  sectionA: AboutSectionConfig;
  sectionB: AboutSectionConfig;
}) {
  const [isExpandedA, toggleExpandedA] = usePersistentDrawer(`lemondbd_drawer_about_${sectionA.id}`, true);
  const [isExpandedB, toggleExpandedB] = usePersistentDrawer(`lemondbd_drawer_about_${sectionB.id}`, true);

  const isAnyExpandedInRow = isExpandedA || isExpandedB;

  return (
    <>
      <SyncedAboutCard
        section={sectionA}
        isExpanded={isExpandedA}
        toggleExpanded={toggleExpandedA}
        isAnyExpandedInRow={isAnyExpandedInRow}
      />
      <SyncedAboutCard
        section={sectionB}
        isExpanded={isExpandedB}
        toggleExpanded={toggleExpandedB}
        isAnyExpandedInRow={isAnyExpandedInRow}
      />
    </>
  );
}

export default function AboutPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const dict = useDictionary();
  const about = dict.about;
  const contactEmail = usePrivacyInfo()?.contactEmail;


  const pageHeading = about.pageTitle
    ? about.pageTitle.replace(/^LemonDBD\s*[-–—]\s*/i, '').trim()
    : 'About us';

  return (
    <PageShell
      locale={locale}
      padding="spacious"
      mainClassName="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] lg:min-h-screen overflow-y-auto relative"
    >
      <div className="relative z-10 mx-auto my-auto flex w-full max-w-5xl xl:max-w-6xl flex-col gap-6 sm:gap-8 py-6 sm:py-10">
        {/* Header */}
        <header className="flex flex-col items-center text-center gap-2.5 sm:gap-3 pt-2 sm:pt-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-text-primary">
            {pageHeading}
          </h1>
          {about.features.paragraphs?.[0] ? (
            <p className="max-w-2xl type-body-fluid text-text-muted text-center px-4">
              <RichText text={about.features.paragraphs[0]} />
            </p>
          ) : null}
        </header>

        {/* 2:2:2 Grid layout: three rows of 2 cards, each pair kept equal height */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
          {/* Row 1: Who are we? & Why did we build this? */}
          <SyncedAboutPair
            sectionA={{
              id: 'who',
              heading: about.who.heading,
              children: about.who.paragraphs.map((text, i) => (
                <p key={i} className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto">
                  <RichText text={text} />
                </p>
              )),
            }}
            sectionB={{
              id: 'why',
              heading: about.why.heading,
              children: about.why.paragraphs.map((text, i) => (
                <p key={i} className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto">
                  <RichText text={text} />
                </p>
              )),
            }}
          />

          {/* Row 2: For streamers and players & What will you find here? */}
          <SyncedAboutPair
            sectionA={{
              id: 'community',
              heading: about.community.heading,
              children: about.community.paragraphs.map((text, i) => (
                <p key={i} className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto">
                  <RichText text={text} />
                </p>
              )),
            }}
            sectionB={{
              id: 'features',
              heading: about.features.heading,
              children: about.features.paragraphs.map((text, i) => (
                <p key={i} className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto">
                  <RichText text={text} />
                </p>
              )),
            }}
          />

          {/* Row 3: Credits & Contact us */}
          <SyncedAboutPair
            sectionA={{
              id: 'credits',
              heading: about.credits.heading,
              children: (
                <>
                  <p className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto">
                    <RichText text={about.credits.text} />
                  </p>
                  <ul className="flex flex-wrap items-center justify-start gap-x-4 gap-y-1 text-text-primary pt-1">
                    {CREDITS.map((name) => (
                      <li key={name} className="font-semibold">{name}</li>
                    ))}
                  </ul>
                </>
              ),
            }}
            sectionB={{
              id: 'contact',
              heading: about.contact.heading,
              children: (
                <>
                  <p className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto">{about.contact.text}</p>
                  <div className="flex flex-wrap items-center justify-start gap-3 pt-1">
                    {contactEmail ? (
                      <span className="inline-flex items-center gap-2 px-1 py-2 text-sm font-semibold text-text-primary">
                        <Mail className="h-4 w-4 shrink-0 text-accent-red" aria-hidden="true" />
                        {contactEmail}
                      </span>
                    ) : null}
                    <a
                      href={DISCORD_INVITE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border-color bg-bg-elevated px-4 py-2 text-sm font-semibold text-brand-discord transition-colors hover:border-brand-discord hover:bg-brand-discord/10"
                    >
                      <DiscordIcon className="h-4 w-4" />
                      {about.contact.discordLabel}
                    </a>
                  </div>
                </>
              ),
            }}
          />

          {/* Privacy Policy pill (links to its own page) */}
          <div className="lg:col-span-2 flex justify-center">
            <Link
              href={`/${locale}/privacy-policy`}
              className="inline-flex items-center gap-2 rounded-full border border-border-color bg-bg-surface px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-widest text-accent-red shadow-md backdrop-blur-xl transition-colors hover:border-accent-red/50 hover:bg-bg-elevated"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {dict.privacy.heading}
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
