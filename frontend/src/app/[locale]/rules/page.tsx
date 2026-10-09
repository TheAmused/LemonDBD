'use client';
// frontend/src/app/[locale]/rules/page.tsx
import React from 'react';
import { LegalPageLayout } from '@/components/legal/LegalPage';
import { RulesSections } from '@/components/rules/RulesSections';
import { useDictionary, useLocale } from '@/context/DictionaryContext';

export default function RulesPage() {
  const dict = useDictionary();
  const locale = useLocale();
  const { rules } = dict;

  return (
    <LegalPageLayout
      locale={locale}
      heading={rules.heading}
      backLabel={rules.backToAbout}
      lastUpdated={`${rules.lastUpdatedLabel}: ${rules.lastUpdated}`}
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
        <p className="type-body-fluid text-text-secondary">{rules.tagline}</p>
        <p className="type-body text-text-muted">{rules.translationNotice}</p>
      </div>

      {/* Neighbouring cards share one height while both are open (<BlockCardPair>); a collapsed card is just its title. */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
        <RulesSections variant="page" />
      </div>
    </LegalPageLayout>
  );
}
