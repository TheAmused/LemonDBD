'use client';
// frontend/src/app/[locale]/tier-lists/[slug]/page.tsx

import React, { use } from 'react';
import dynamic from 'next/dynamic';
import { PageShell } from '@/components/layout/PageShell';
import { OfficialTierListView } from '@/components/tier-lists/OfficialTierListView';
import { useDictionary, useLocale } from '@/context/DictionaryContext';

const CampfireParticles = dynamic(
  () => import('@/components/common/CampfireParticles').then((m) => m.CampfireParticles),
  { ssr: false }
);

export default function OfficialTierListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const dict = useDictionary();
  const locale = useLocale();

  return (
    <PageShell
      locale={locale}
      dict={dict}
      activeCategory="tier-lists"
      padding="tight"
      decoration={<CampfireParticles />}
      mainClassName="relative flex flex-col"
    >
      {/* Keyed by slug: moving between lists must not carry one list's selection or dialogs into the next. */}
      <OfficialTierListView key={slug} slug={decodeURIComponent(slug)} locale={locale} dict={dict} />
    </PageShell>
  );
}
