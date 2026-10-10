'use client';
// frontend/src/app/[locale]/tier-lists/custom/[id]/page.tsx

import React, { use } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { CustomTierListView } from '@/components/tier-lists/CustomTierListView';
import { useDictionary, useLocale } from '@/context/DictionaryContext';


export default function CustomTierListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const dict = useDictionary();
  const locale = useLocale();

  return (
    <PageShell
      locale={locale}
      activeCategory="tier-lists"
      padding="tight"
      outerClassName="h-dvh overflow-hidden [@media(max-height:439px)]:h-auto [@media(max-height:439px)]:min-h-dvh [@media(max-height:439px)]:overflow-visible text-text-primary flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300"
      mainClassName="relative flex min-h-0 flex-col overflow-hidden [@media(max-height:439px)]:overflow-visible"
    >
      <CustomTierListView key={id} id={decodeURIComponent(id)} locale={locale} />
    </PageShell>
  );
}
