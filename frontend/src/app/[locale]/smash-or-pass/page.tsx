'use client';
// frontend/src/app/[locale]/smash-or-pass/page.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { useParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { SmashOrPassHub } from '@/components/smash-or-pass/SmashOrPassHub';
import { Locale } from '@/i18n/config';

import { SmashHubSkeleton } from '@/components/smash-or-pass/SmashOrPassSkeleton';
import { useDictionary } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function SmashOrPassPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';

  const dict = useDictionary();

  useDocumentTitle(dict?.app?.smashOrPassPageTitle || 'LemonDBD - Smash or Pass | Dead by Daylight Romance');

  return (
    <PageShell
      locale={locale}
      dict={dict || ({} as Dictionary)}
      activeCategory="smash-or-pass"
      mainClassName="overflow-y-auto"
    >
      <React.Suspense fallback={<SmashHubSkeleton />}>
        {dict ? (
          <SmashOrPassHub dict={dict} locale={locale} />
        ) : (
          <SmashHubSkeleton />
        )}
      </React.Suspense>
    </PageShell>
  );
}
