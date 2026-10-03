'use client';
// frontend/src/app/[locale]/tier-lists/page.tsx

import React from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { TierListHub } from '@/components/tier-lists/TierListHub';
import { useDictionary, useLocale } from '@/context/DictionaryContext';


export default function TierListsPage() {
  const dict = useDictionary();
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
