'use client';
// frontend/src/app/[locale]/tier-lists/page.tsx

import React from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { TierListHub } from '@/components/tier-lists/TierListHub';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';


export default function TierListsPage() {
  const dict = useDictionary();
  const locale = useLocale();

  useDocumentTitle(dict.tierLists.pageTitle);

  return (
    <PageShell
      locale={locale}
      dict={dict}
      activeCategory="tier-lists"
      mainClassName="relative flex flex-col"
    >
      <TierListHub locale={locale} dict={dict} />
    </PageShell>
  );
}
