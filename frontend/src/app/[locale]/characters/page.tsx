'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/app/[locale]/characters/page.tsx

import React, { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { CharactersHub } from '@/components/CharactersHub';
import { CharactersGridSkeleton } from '@/components/character-detail/CharactersSkeleton';
import { Locale } from '@/i18n/config';
import { CharacterItem, PerkItem } from '@/components/character-detail/types';
import { useDictionary } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const QuestsModal = dynamic(
  () => import('@/components/QuestsModal').then((m) => m.QuestsModal),
  { ssr: false }
);

export default function CharactersPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';

  const dict = useDictionary();
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);


  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useDocumentTitle((dict?.app as any)?.charactersPageTitle || 'LemonDBD - Characters & Teachables');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="characters"
        onOpenQuests={() => setIsQuestsOpen(true)}
      />

      <main
        className="flex-1 w-full overflow-y-auto transition-[padding] duration-300 p-4 sm:p-6 lg:p-8 lemon-shell-main"
      >
        <Suspense fallback={<CharactersGridSkeleton dict={dict} />}>
          <CharactersHub dict={dict} />
        </Suspense>
        {isQuestsOpen && (
          <QuestsModal isOpen={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} dict={dict} />
        )}
      </main>
    </div>
  );
}
