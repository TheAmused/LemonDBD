'use client';
// frontend/src/components/tier-lists/OfficialTierListClient.tsx

import React from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { OfficialTierListView } from '@/components/tier-lists/OfficialTierListView';
import { useLocale } from '@/context/DictionaryContext';

export function OfficialTierListClient({ slug }: { slug: string }) {
  const locale = useLocale();

  return (
    <PageShell
      locale={locale}
      activeCategory="tier-lists"
      padding="tight"
      mainClassName="relative flex flex-col"
    >
      <OfficialTierListView key={slug} slug={decodeURIComponent(slug)} locale={locale} />
    </PageShell>
  );
}
