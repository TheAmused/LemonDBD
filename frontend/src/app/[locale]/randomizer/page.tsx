'use client';
// frontend/src/app/[locale]/randomizer/page.tsx

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { GeneratorPage } from '@/components/generator/GeneratorPage';
import { RandomizerPageSkeleton } from '@/components/generator/RandomizerSkeleton';
import { Locale } from '@/i18n/config';
import { useAuth } from '@/context/AuthContext';
import { Perk, CharacterItem } from '@/types/perks';
import type { Dictionary } from '@/locales/types';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { useDictionary } from '@/context/DictionaryContext';
import { useCachedData } from '@/hooks/useCachedData';
import { fetchJson } from '@/services/dataCache';

const PerkModal = dynamic(() => import('@/components/PerkModal').then((m) => m.PerkModal), { ssr: false });
const QuestsModal = dynamic(
  () => import('@/components/QuestsModal').then((m) => m.QuestsModal),
  { ssr: false }
);

function RandomizerContent() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const { user } = useAuth();
  const backendBase = getBackendBaseUrl();

  const dict = useDictionary();
  const [allPerks, setAllPerks] = useState<Perk[]>([]);
  // GeneratorPage used to mount immediately with an empty perk list and then
  // re-render once ~1000 perks landed, which reflowed the whole stage. Hold the
  // (identical) skeleton until the data is in, so there is one transition.
  const [perksLoading, setPerksLoading] = useState<boolean>(true);
  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);

  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);

  useEffect(() => {
    document.title = dict?.app?.perkRandomizerPageTitle || 'LemonDBD - Perk Randomizer';
  }, [dict]);

  // Both reads share their cache keys with /perks, so arriving here from the
  // perk vault (or coming back to the randomizer later) needs no request at all.
  const allPerksKey = `${backendBase}/api/v1/perks?limit=1000&lang=${locale}${
    user?.id ? `&user_id=${user.id}` : ''
  }`;
  const { data: perksResponse, loading: perksFetching } = useCachedData<{ data?: Perk[] }>(
    allPerksKey,
    () => fetchJson<{ data?: Perk[] }>(allPerksKey)
  );

  const charactersKey = `${backendBase}/api/v1/characters?lang=${locale}`;
  const { data: charactersResponse } = useCachedData<{ data?: CharacterItem[] }>(
    charactersKey,
    () => fetchJson<{ data?: CharacterItem[] }>(charactersKey)
  );

  useEffect(() => {
    const fullList: Perk[] = perksResponse?.data || [];
    setAllPerks(fullList);
    setSurvivorCount(fullList.filter((p) => p.category === 'Survivor').length);
    setKillerCount(fullList.filter((p) => p.category === 'Killer').length);
    setPerksLoading(perksFetching);
  }, [perksResponse, perksFetching]);

  useEffect(() => {
    setCharacterCount((charactersResponse?.data || []).length);
  }, [charactersResponse]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="generator"
        onOpenQuests={() => setIsQuestsOpen(true)}
        totalPerksCount={allPerks.length}
        survivorCount={survivorCount}
        killerCount={killerCount}
        characterCount={characterCount}
      />

      <main
        className="flex-1 w-full min-h-screen overflow-y-auto transition-[padding] duration-300 flex flex-col lemon-shell-main--flush"
      >
        {perksLoading ? (
          <RandomizerPageSkeleton dict={dict} />
        ) : (
          <Suspense fallback={<RandomizerPageSkeleton dict={dict} />}>
            <GeneratorPage allPerks={allPerks} onSelectPerk={setSelectedPerk} dict={dict} />
          </Suspense>
        )}

        {selectedPerk && (
          <PerkModal perk={selectedPerk} onClose={() => setSelectedPerk(null)} dict={dict} />
        )}
        {isQuestsOpen && (
          <QuestsModal
            isOpen={isQuestsOpen}
            onClose={() => setIsQuestsOpen(false)}
            dict={dict}
          />
        )}
      </main>
    </div>
  );
}

export default function RandomizerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
          <div
            aria-hidden="true"
            className="lemon-shell-aside hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64 border-r border-slate-200/80 bg-white/80 dark:border-slate-800/60 dark:bg-slate-950/60"
          />
          <div aria-hidden="true" className="h-16 shrink-0 border-b border-slate-800/60 lg:hidden" />
          <main className="flex-1 w-full min-h-screen overflow-y-auto flex flex-col lemon-shell-main--flush">
            <RandomizerPageSkeleton />
          </main>
        </div>
      }
    >
      <RandomizerContent />
    </Suspense>
  );
}
