'use client';
// frontend/src/app/[locale]/tier-lists/page.tsx

import React from 'react';
import dynamic from 'next/dynamic';
import { PageShell } from '@/components/layout/PageShell';
import { TierListHub } from '@/components/tier-lists/TierListHub';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const CampfireParticles = dynamic(
  () => import('@/components/common/CampfireParticles').then((m) => m.CampfireParticles),
  { ssr: false }
);

export default function TierListsPage() {
  const dict = useDictionary();
  const locale = useLocale();

  useDocumentTitle(dict.tierLists.pageTitle);

  return (
    <PageShell
      locale={locale}
      dict={dict}
      activeCategory="tier-lists"
      decoration={<CampfireParticles />}
      mainClassName="relative flex flex-col"
    >
      <TierListHub locale={locale} dict={dict} />
    </PageShell>
  );
}
