'use client';
// frontend/src/components/tier-lists/CustomTierListClient.tsx

import React from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { CustomTierListView } from '@/components/tier-lists/CustomTierListView';
import { useLocale } from '@/context/DictionaryContext';

export function CustomTierListClient({ id }: { id: string }) {
  const locale = useLocale();

  return (
    <PageShell
      locale={locale}
      activeCategory="tier-lists"
      padding="tight"
      mainClassName="relative flex flex-col"
    >
      <CustomTierListView key={id} id={decodeURIComponent(id)} locale={locale} />
    </PageShell>
  );
}
