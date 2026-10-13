'use client';
// frontend/src/components/tier-lists/TierListHubClient.tsx

import React from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { TierListHub } from '@/components/tier-lists/TierListHub';
import { useLocale } from '@/context/DictionaryContext';

export function TierListHubClient() {
  const locale = useLocale();

  return (
    <PageShell
      locale={locale}
      activeCategory="tier-lists"
      mainClassName="relative flex flex-col"
    >
      <TierListHub locale={locale} />
    </PageShell>
  );
}
