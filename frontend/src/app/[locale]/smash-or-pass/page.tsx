'use client';
// frontend/src/app/[locale]/smash-or-pass/page.tsx

import React from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { SmashOrPassHub } from '@/components/smash-or-pass/SmashOrPassHub';
import { Locale } from '@/i18n/config';

import { SmashHubSkeleton } from '@/components/smash-or-pass/SmashOrPassSkeleton';
import { useDictionary, useLocale } from '@/context/DictionaryContext';

export default function SmashOrPassPage() {
  const locale = useLocale();

  const dict = useDictionary();


  return (
    <PageShell
      locale={locale}
      activeCategory="smash-or-pass"
      mainClassName="overflow-y-auto theme-smash"
    >
      <React.Suspense fallback={<SmashHubSkeleton />}>
        {dict ? (
          <SmashOrPassHub locale={locale} />
        ) : (
          <SmashHubSkeleton />
        )}
      </React.Suspense>
    </PageShell>
  );
}
