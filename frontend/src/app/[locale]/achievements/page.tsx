'use client';
// frontend/src/app/[locale]/achievements/page.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { useParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { AchievementsHub } from '@/components/achievements/AchievementsHub';
import { Locale } from '@/i18n/config';
import { useDictionary } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function AchievementsPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const dict = useDictionary();

  useDocumentTitle(dict?.app?.achievementsPageTitle || 'LemonDBD - Achievements');

  return (
    <PageShell locale={locale} dict={dict || ({} as Dictionary)} padding="spacious">
      {dict && <AchievementsHub dict={dict} />}
    </PageShell>
  );
}
