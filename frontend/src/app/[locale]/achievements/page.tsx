'use client';
// frontend/src/app/[locale]/achievements/page.tsx

import React from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { AchievementsHub } from '@/components/achievements/AchievementsHub';
import { Locale } from '@/i18n/config';
import { useDictionary, useLocale } from '@/context/DictionaryContext';

export default function AchievementsPage() {
  const locale = useLocale();
  const dict = useDictionary();


  return (
    <PageShell locale={locale} padding="spacious">
      {dict && <AchievementsHub />}
    </PageShell>
  );
}
