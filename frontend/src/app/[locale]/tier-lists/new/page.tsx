'use client';
// frontend/src/app/[locale]/tier-lists/new/page.tsx

import React from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { TierListCreator } from '@/components/tier-lists/creator/TierListCreator';
import { useDictionary, useLocale } from '@/context/DictionaryContext';

const CampfireParticles = dynamic(
  () => import('@/components/common/CampfireParticles').then((m) => m.CampfireParticles),
  { ssr: false }
);

export default function NewTierListPage() {
  const dict = useDictionary();
  const locale = useLocale();
  // `?edit=<id>` -- reused by "Edit details" on a custom list's own page
  // (`CustomTierListView.tsx`) instead of a title/description-only modal:
  // the creator prefills from that list and saves back onto it in place.
  // `TierListCreator` sets the document title itself (it knows whether it's
  // creating or editing).
  const editId = useSearchParams().get('edit') ?? undefined;

  return (
    <PageShell
      locale={locale}
      dict={dict}
      activeCategory="tier-lists"
      padding="tight"
      decoration={<CampfireParticles />}
      mainClassName="relative flex flex-col"
    >
      <TierListCreator locale={locale} dict={dict} editId={editId} />
    </PageShell>
  );
}
