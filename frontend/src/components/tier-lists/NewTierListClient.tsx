'use client';
// frontend/src/components/tier-lists/NewTierListClient.tsx

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { TierListCreator } from '@/components/tier-lists/creator/TierListCreator';
import { useLocale } from '@/context/DictionaryContext';
import TierListsLoading from '@/app/[locale]/tier-lists/loading';

function NewTierListContent({ locale }: { locale: string }) {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit') ?? undefined;
  const officialSlug = searchParams.get('official') ?? undefined;

  return <TierListCreator locale={locale} editId={editId} officialSlug={officialSlug} />;
}

export function NewTierListClient() {
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
