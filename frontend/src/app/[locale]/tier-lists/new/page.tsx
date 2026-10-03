'use client';
// frontend/src/app/[locale]/tier-lists/new/page.tsx

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { TierListCreator } from '@/components/tier-lists/creator/TierListCreator';
import { useDictionary, useLocale } from '@/context/DictionaryContext';


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
      activeCategory="tier-lists"
      padding="tight"
      mainClassName="relative flex flex-col"
    >
      <TierListCreator locale={locale} editId={editId} />
    </PageShell>
  );
}
