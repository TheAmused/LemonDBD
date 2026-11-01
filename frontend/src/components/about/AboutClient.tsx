'use client';

import React from 'react';
import { FileText, ScrollText, ShieldCheck } from 'lucide-react';
import { InfoIcon } from '@/components/icons/DbdIcons';
import { ContactLinks } from '@/components/common/ContactLinks';
import { BlockCardPair, type BlockCardProps } from '@/components/common/BlockCard';
import { RichText } from '@/components/common/RichText';
import { LastUpdatedStamp, LegalLinkPill, type LegalPageId } from '@/components/legal/LegalPage';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { usePrivacyInfo } from '@/hooks/usePrivacyInfo';
import { cn } from '@/utils/cn';

const CREDITS = ['bromu', 'lift', 'aquamarine', 'packleader'] as const;

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
  bodyClassName: 'type-body-lg wide:text-base wide-2k:text-lg wide-4k:text-xl',
  children,
});

function SyncedAboutPair({ sectionA, sectionB }: { sectionA: AboutSectionConfig; sectionB: AboutSectionConfig }) {
  return <BlockCardPair a={toCard(sectionA)} b={toCard(sectionB)} />;
}

/** Pills to About us, Terms, Privacy Policy and Rules, minus the page we are on. */
export function LegalLinks({ exclude, className }: { exclude?: LegalPageId; className?: string }) {
  const locale = useLocale();
  const dict = useDictionary();
  const pages: { target: LegalPageId; label: string; icon: React.ReactNode }[] = [
    { target: 'about', label: dict.sidebar.about, icon: <InfoIcon className="icon-md" /> },
    { target: 'terms-of-service', label: dict.terms.heading, icon: <FileText className="icon-md" /> },
    { target: 'privacy-policy', label: dict.privacy.heading, icon: <ShieldCheck className="icon-md" /> },
    { target: 'rules', label: dict.rules.heading, icon: <ScrollText className="icon-md" /> },
  ];
  return (
    <nav className={cn('flex flex-wrap items-center justify-center gap-3', className)}>
      {pages.filter((p) => p.target !== exclude).map((p) => (
        <LegalLinkPill key={p.target} href={`/${locale}/${p.target}`} target={p.target} icon={p.icon}>
          {p.label}
        </LegalLinkPill>
      ))}
    </nav>
  );
}

export function AboutClient() {
  const dict = useDictionary();
  const about = dict.about;
  const contactEmail = usePrivacyInfo()?.contactEmail;

  const pageHeading = about.pageTitle
    ? about.pageTitle.replace(/^LemonDBD\s*[-–—]\s*/i, '').trim()
    : 'About us';

  return (
    <div className="relative z-10 mx-auto my-auto flex w-full max-w-5xl xl:max-w-6xl 2xl:max-w-page wide:max-w-page-lg wide-4k:max-w-page-xl flex-col gap-6 sm:gap-8 wide-2k:gap-10 py-6 sm:py-10">
      <LastUpdatedStamp label={about.lastUpdatedLabel} date={about.lastUpdated} />
      <h1 className="sr-only">{pageHeading}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 wide-2k:gap-8 wide-4k:gap-10">
        <SyncedAboutPair
          sectionA={{
            id: 'who',
            heading: about.who.heading,
            children: about.who.paragraphs.map((text, i) => (
              <p key={i} className="type-prose text-text-muted">
                <RichText text={text} />
              </p>
            )),
          }}
          sectionB={{
            id: 'why',
            heading: about.why.heading,
            children: about.why.paragraphs.map((text, i) => (
              <p key={i} className="type-prose text-text-muted">
                <RichText text={text} />
              </p>
            )),
          }}
        />

        <SyncedAboutPair
          sectionA={{
            id: 'community',
            heading: about.community.heading,
            children: about.community.paragraphs.map((text, i) => (
              <p key={i} className="type-prose text-text-muted">
                <RichText text={text} />
              </p>
            )),
          }}
          sectionB={{
            id: 'features',
            heading: about.features.heading,
            children: about.features.paragraphs.map((text, i) => (
              <p key={i} className="type-prose text-text-muted">
                <RichText text={text} />
              </p>
            )),
          }}
        />

        <SyncedAboutPair
          sectionA={{
            id: 'credits',
            heading: about.credits.heading,
            children: (
              <>
                <p className="type-prose text-text-muted">
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
                <p className="type-prose text-text-muted">{about.contact.text}</p>
                <ContactLinks email={contactEmail} />
              </>
            ),
          }}
        />

        <LegalLinks exclude="about" className="lg:col-span-2" />
      </div>
    </div>
  );
}
