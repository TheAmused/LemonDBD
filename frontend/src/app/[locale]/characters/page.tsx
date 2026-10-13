'use client';
// frontend/src/app/[locale]/characters/page.tsx

import React, { useEffect, useState, Suspense } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { CharactersHub } from '@/components/CharactersHub';
import { CharactersGridSkeleton } from '@/components/character-detail/CharactersSkeleton';
import { Locale } from '@/i18n/config';
import { CharacterItem, PerkItem } from '@/components/character-detail/types';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { getBackendBaseUrl } from '@/utils/api';


export default function CharactersPage() {
  const locale = useLocale();

  const dict = useDictionary();

  const backendBase = getBackendBaseUrl();


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
