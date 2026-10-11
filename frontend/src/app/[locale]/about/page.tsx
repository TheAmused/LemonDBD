'use client';
// frontend/src/app/[locale]/about/page.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { useParams } from 'next/navigation';
import { FileText, ScrollText, ShieldCheck } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { ContactLinks } from '@/components/common/ContactLinks';
import { BlockCardPair, type BlockCardProps } from '@/components/common/BlockCard';
import { RichText } from '@/components/common/RichText';
import { LegalLinkPill } from '@/components/legal/LegalPage';
import { Locale } from '@/i18n/config';
import { useDictionary } from '@/context/DictionaryContext';
import { usePrivacyInfo } from '@/hooks/usePrivacyInfo';

// Placeholder names, to be replaced with real contributors before publishing.
const CREDITS = ['test1', 'test2', 'test3', 'test4', 'test5'] as const;

interface AboutSectionConfig {
  id: string;
  heading?: string;
  children: React.ReactNode;
}

const toCard = ({ id, heading, children }: AboutSectionConfig): BlockCardProps => ({
  id,
  storageKey: `lemondbd_drawer_about_${id}`,
  title: heading ?? '',
  centered: true,
  bodyClassName: 'type-body-lg',
  children,
});

/** Two neighbouring cards: the same height while both are open, each animating open and shut on its own. */
function SyncedAboutPair({ sectionA, sectionB }: { sectionA: AboutSectionConfig; sectionB: AboutSectionConfig }) {
  return <BlockCardPair a={toCard(sectionA)} b={toCard(sectionB)} />;
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

        {/* 2:2:2 Grid layout: three rows of 2 cards, each pair kept equal height by <BlockCardPair> */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
                  <ContactLinks email={contactEmail} />
                </>
              ),
            }}
          />

          {/* Legal pills (each links to its own page), side by side and wrapping on narrow screens */}
          <div className="lg:col-span-2 flex flex-wrap items-center justify-center gap-3">
            <LegalLinkPill href={`/${locale}/terms-of-service`} icon={<FileText className="h-4 w-4" />}>
              {dict.terms.heading}
            </LegalLinkPill>
            <LegalLinkPill href={`/${locale}/privacy-policy`} icon={<ShieldCheck className="h-4 w-4" />}>
              {dict.privacy.heading}
            </LegalLinkPill>
            <LegalLinkPill href={`/${locale}/rules`} icon={<ScrollText className="h-4 w-4" />}>
              {dict.rules.heading}
            </LegalLinkPill>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
