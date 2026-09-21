'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/app/[locale]/characters/page.tsx

import React, { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { CharactersHub } from '@/components/CharactersHub';
import { CharactersGridSkeleton } from '@/components/character-detail/CharactersSkeleton';
import { Locale } from '@/i18n/config';
import { CharacterItem, PerkItem } from '@/components/character-detail/types';
import { useDictionary } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getBackendBaseUrl } from '@/utils/api';

const CampfireParticles = dynamic(
  () => import('@/components/common/CampfireParticles').then((m) => m.CampfireParticles),
  { ssr: false }
);

export default function CharactersPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';

  const dict = useDictionary();

  const backendBase = getBackendBaseUrl();

  useDocumentTitle((dict?.app as any)?.charactersPageTitle || 'LemonDBD - Characters & Teachables');

  return (
    <PageShell
      locale={locale}
      dict={dict}
      activeCategory="characters"
      mainClassName="relative overflow-y-auto"
    >
      <CampfireParticles />
      <div className="relative z-10">
        <Suspense fallback={<CharactersGridSkeleton dict={dict} />}>
          <CharactersHub dict={dict} />
        </Suspense>
      </div>
    </PageShell>
  );
}
