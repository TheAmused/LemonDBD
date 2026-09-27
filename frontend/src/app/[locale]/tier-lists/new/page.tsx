'use client';
// frontend/src/app/[locale]/tier-lists/new/page.tsx

import React from 'react';
import dynamic from 'next/dynamic';
import { PageShell } from '@/components/layout/PageShell';
import { TierListCreator } from '@/components/tier-lists/creator/TierListCreator';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const CampfireParticles = dynamic(
  () => import('@/components/common/CampfireParticles').then((m) => m.CampfireParticles),
  { ssr: false }
);

export default function NewTierListPage() {
  const dict = useDictionary();
  const locale = useLocale();

  useDocumentTitle(dict.tierLists.creator.pageTitle);

  return (
    <PageShell
      locale={locale}
      dict={dict}
      activeCategory="tier-lists"
      padding="tight"
      decoration={<CampfireParticles />}
      mainClassName="relative flex flex-col"
    >
      <TierListCreator locale={locale} dict={dict} />
    </PageShell>
  );
}
