'use client';
// frontend/src/components/generator/RandomizerClient.tsx

import React, { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { PageShell } from '@/components/layout/PageShell';
import { PageShellFallback } from '@/components/layout/PageShellFallback';
import { GeneratorPage } from '@/components/generator/GeneratorPage';
import { RandomizerPageSkeleton } from '@/components/generator/RandomizerSkeleton';
import { useAuth } from '@/context/AuthContext';
import { Perk, CharacterItem } from '@/types/perks';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useCachedData } from '@/hooks/useCachedData';
import { fetchJson } from '@/services/dataCache';

const PerkModal = dynamic(() => import('@/components/PerkModal').then((m) => m.PerkModal), { ssr: false });

function RandomizerContent() {
  const locale = useLocale();
  const { user } = useAuth();
  const backendBase = getBackendBaseUrl();

  const dict = useDictionary();
  const [allPerks, setAllPerks] = useState<Perk[]>([]);
  const [perksLoading, setPerksLoading] = useState<boolean>(true);
  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);

  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);


  const allPerksKey = `${backendBase}/api/v1/perks?limit=1000&lang=${locale}`;
  const { data: perksResponse, loading: perksFetching, error: perksError, refresh: retryPerks } = useCachedData<{ data?: Perk[] }>(
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
    <PageShell
      locale={locale}
      activeCategory="generator"
      totalPerksCount={allPerks.length}
      survivorCount={survivorCount}
      killerCount={killerCount}
      characterCount={characterCount}
      padding="flush"
      mainClassName="min-h-screen overflow-y-auto flex flex-col relative"
    >
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        {perksError && allPerks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 p-12 text-center my-auto">
            <p className="text-text-secondary text-base">Failed to load perks catalog.</p>
            <button
              onClick={() => retryPerks()}
              className="px-4 py-2 bg-accent-red text-white rounded hover:bg-opacity-90 font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        ) : perksLoading && allPerks.length === 0 ? (
          <RandomizerPageSkeleton />
        ) : (
          <Suspense fallback={<RandomizerPageSkeleton />}>
            <GeneratorPage allPerks={allPerks} onSelectPerk={setSelectedPerk} />
          </Suspense>
        )}

        {selectedPerk && (
          <PerkModal perk={selectedPerk} onClose={() => setSelectedPerk(null)} />
        )}
      </div>
    </PageShell>
  );
}

export function RandomizerClient() {
  return (
    <Suspense
      fallback={
        <PageShellFallback
          padding="flush"
          mainClassName="min-h-screen overflow-y-auto flex flex-col"
          skeleton={<RandomizerPageSkeleton />}
        />
      }
    >
      <RandomizerContent />
    </Suspense>
  );
}
