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

const QuestsModal = dynamic(
  () => import('@/components/QuestsModal').then((m) => m.QuestsModal),
  { ssr: false }
);

export default function CharactersPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';

  const dict = useDictionary();
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);


  const backendBase = getBackendBaseUrl();

  useDocumentTitle((dict?.app as any)?.charactersPageTitle || 'LemonDBD - Characters & Teachables');

  return (
    <PageShell
      locale={locale}
      dict={dict}
      activeCategory="characters"
      onOpenQuests={() => setIsQuestsOpen(true)}
      mainClassName="overflow-y-auto"
    >
      <Suspense fallback={<CharactersGridSkeleton dict={dict} />}>
        <CharactersHub dict={dict} />
      </Suspense>
      {isQuestsOpen && (
        <QuestsModal isOpen={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} dict={dict} />
      )}
    </PageShell>
  );
}
