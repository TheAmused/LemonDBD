'use client';
// frontend/src/app/[locale]/privacy-policy/page.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { useParams } from 'next/navigation';
import { RichText } from '@/components/common/RichText';
import { BlockCard } from '@/components/common/BlockCard';
import { LegalPageLayout } from '@/components/legal/LegalPage';
import { Locale } from '@/i18n/config';
import { useDictionary } from '@/context/DictionaryContext';
import { usePrivacyInfo } from '@/hooks/usePrivacyInfo';
import { fillPrivacyPlaceholders } from '@/utils/privacyPlaceholders';

/** Render order of the policy sections (keys of `dict.privacy.sections`). */
export const PRIVACY_SECTION_ORDER = [
  'whoWeAre',
  'aiContent',
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

export default function PrivacyPolicyPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const dict = useDictionary();
  const privacy = dict.privacy;


  // Contact address, lifetimes and mail provider come from the backend (admin-editable),
  // so the translated text only holds placeholders for them.
  const info = usePrivacyInfo();
  const fill = (text?: string | null) => (text ? fillPrivacyPlaceholders(text, info, locale) : text);

  const blockTitle = (id: string): string =>
    id === SUMMARY_BLOCK
      ? privacy.summaryHeading
      : privacy.sections[id as (typeof PRIVACY_SECTION_ORDER)[number]]?.heading ?? '';

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
    <LegalPageLayout
      locale={locale}
      heading={privacy.heading}
      backLabel={privacy.backToAbout}
      lastUpdated={`${privacy.lastUpdatedLabel}: ${privacy.lastUpdated}`}
    >
      {privacy ? (
        <>
          <p className="text-center text-text-muted text-sm leading-relaxed sm:text-base">
            {privacy.translationNotice}
          </p>
          <div className="flex flex-col gap-6">
            {ALL_BLOCK_IDS.map((id) => (
              <BlockCard key={id} id={id} storageKey={`lemondbd_drawer_privacy_open_${id}`} title={blockTitle(id)}>
                {renderBlockBody(id)}
              </BlockCard>
            ))}
          </div>
        </>
      ) : null}
    </LegalPageLayout>
  );
}
