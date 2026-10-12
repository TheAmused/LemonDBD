'use client';
// frontend/src/app/[locale]/tier-lists/new/page.tsx

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { TierListCreator } from '@/components/tier-lists/creator/TierListCreator';
import { useLocale } from '@/context/DictionaryContext';
import TierListsLoading from '../loading';

function NewTierListContent({ locale }: { locale: string }) {
  // `?edit=<id>` -- reused by "Edit details" on a custom list's own page
  // (`CustomTierListView.tsx`) instead of a title/description-only modal:
  // the creator prefills from that list and saves back onto it in place.
  // `TierListCreator` sets the document title itself (it knows whether it's
  // creating or editing).
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit') ?? undefined;
  const officialSlug = searchParams.get('official') ?? undefined;

  return <TierListCreator locale={locale} editId={editId} officialSlug={officialSlug} />;
}

export default function NewTierListPage() {
  const locale = useLocale();

  return (
    <PageShell
      locale={locale}
      activeCategory="tier-lists"
      padding="tight"
      mainClassName="relative flex flex-col"
    >
      <Suspense fallback={<TierListsLoading />}>
        <NewTierListContent locale={locale} />
      </Suspense>
    </PageShell>
  );
}
