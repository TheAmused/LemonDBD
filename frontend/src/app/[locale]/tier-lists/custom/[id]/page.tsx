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
      mainClassName="relative flex flex-col"
    >
      <CustomTierListView key={id} id={decodeURIComponent(id)} locale={locale} />
    </PageShell>
  );
}
