'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/app/[locale]/characters/page.tsx

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { CharactersHub } from '@/components/CharactersHub';
import { CharactersGridSkeleton } from '@/components/character-detail/CharactersSkeleton';
import { Locale } from '@/i18n/config';
import { CharacterItem, PerkItem } from '@/components/character-detail/types';
import { useDictionary } from '@/context/DictionaryContext';
import { getBackendBaseUrl } from '@/utils/api';


export default function CharactersPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';

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
