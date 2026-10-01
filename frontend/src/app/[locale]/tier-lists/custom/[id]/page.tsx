'use client';
// frontend/src/app/[locale]/tier-lists/custom/[id]/page.tsx

import React, { use } from 'react';
import dynamic from 'next/dynamic';
import { PageShell } from '@/components/layout/PageShell';
import { CustomTierListView } from '@/components/tier-lists/CustomTierListView';
import { useDictionary, useLocale } from '@/context/DictionaryContext';

const CampfireParticles = dynamic(
  () => import('@/components/common/CampfireParticles').then((m) => m.CampfireParticles),
  { ssr: false }
);

export default function CustomTierListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const dict = useDictionary();
  const locale = useLocale();

  return (
    <PageShell
      locale={locale}
      dict={dict}
      activeCategory="tier-lists"
      padding="tight"
      decoration={<CampfireParticles />}
      outerClassName="min-h-screen lg:h-dvh lg:overflow-hidden bg-bg-primary text-text-primary flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300"
      mainClassName="relative flex flex-col lg:h-full lg:min-h-0 lg:overflow-hidden"
    >
      <CustomTierListView key={id} id={decodeURIComponent(id)} locale={locale} dict={dict} />
    </PageShell>
  );
}
