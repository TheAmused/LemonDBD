'use client';
// frontend/src/components/character-detail/CharactersClient.tsx

import React, { Suspense } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { CharactersHub } from '@/components/CharactersHub';
import { CharactersGridSkeleton } from '@/components/character-detail/CharactersSkeleton';
import { useLocale } from '@/context/DictionaryContext';

export function CharactersClient() {
  const locale = useLocale();

  return (
    <PageShell
      locale={locale}
      activeCategory="characters"
      mainClassName="relative overflow-y-auto"
    >
      <div className="relative z-10">
        <Suspense fallback={<CharactersGridSkeleton />}>
          <CharactersHub />
        </Suspense>
      </div>
    </PageShell>
  );
}
