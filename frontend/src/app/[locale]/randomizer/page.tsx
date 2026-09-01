'use client';
// frontend/src/app/[locale]/randomizer/page.tsx

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { GeneratorPage } from '@/components/generator/GeneratorPage';
import { RandomizerPageSkeleton } from '@/components/generator/RandomizerSkeleton';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { useSidebarState } from '@/hooks/useSidebarState';
import { useAuth } from '@/context/AuthContext';
import { Perk, CharacterItem } from '@/types/perks';
import type { Dictionary } from '@/locales/types';
import { getBackendBaseUrl } from '@/utils/perkUtils';

const PerkModal = dynamic(() => import('@/components/PerkModal').then((m) => m.PerkModal), { ssr: false });
const QuestsModal = dynamic(
  () => import('@/components/QuestsModal').then((m) => m.QuestsModal),
  { ssr: false }
);

function RandomizerContent() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const { isCollapsed } = useSidebarState();
  const { user } = useAuth();
  const backendBase = getBackendBaseUrl();

  const [dict, setDict] = useState<Dictionary | null>(null);
  const [allPerks, setAllPerks] = useState<Perk[]>([]);
  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);

  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);

  useEffect(() => {
    getDictionary(locale).then(setDict);
  }, [locale]);

  useEffect(() => {
    document.title = dict?.app?.perkRandomizerPageTitle || 'LemonDBD - Perk Randomizer';
  }, [dict]);

  const fetchData = useCallback(async () => {
    try {
      const allPerksUrl = new URLSearchParams({ limit: '1000', lang: locale });
      if (user?.id) {
        allPerksUrl.append('user_id', user.id.toString());
      }

      const [perksRes, charsRes] = await Promise.all([
        fetch(`${backendBase}/api/v1/perks?${allPerksUrl.toString()}`),
        fetch(`${backendBase}/api/v1/characters?lang=${locale}`),
      ]);

      if (perksRes.ok) {
        const result = await perksRes.json();
        const fullList: Perk[] = result.data || [];
        setAllPerks(fullList);
        setSurvivorCount(fullList.filter((p) => p.category === 'Survivor').length);
        setKillerCount(fullList.filter((p) => p.category === 'Killer').length);
      }

      if (charsRes.ok) {
        const data = await charsRes.json();
        const list: CharacterItem[] = data.data || [];
        setCharacterCount(list.length);
      }
    } catch (err) {
      console.error('Failed fetching randomizer data:', err);
    }
  }, [backendBase, locale, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!dict) {
    return (
      <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
        <aside className="hidden lg:flex w-72 flex-col shrink-0 border-r border-slate-800 bg-[#0a0f18]/90 p-4 select-none animate-pulse" />
        <main className="flex-1 w-full min-h-screen overflow-y-auto p-4 sm:p-6 lg:p-8 lg:pl-72 flex flex-col items-center">
          <RandomizerPageSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
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
        className={`flex-1 w-full min-h-screen overflow-y-auto transition-all duration-300 p-4 sm:p-6 lg:p-8 flex flex-col ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        <Suspense fallback={<RandomizerPageSkeleton dict={dict} />}>
          <GeneratorPage allPerks={allPerks} onSelectPerk={setSelectedPerk} dict={dict} />
        </Suspense>

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
        <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
          <aside className="hidden lg:flex w-72 flex-col shrink-0 border-r border-slate-800 bg-[#0a0f18]/90 p-4 select-none animate-pulse" />
          <main className="flex-1 w-full min-h-screen overflow-y-auto p-4 sm:p-6 lg:p-8 lg:pl-72 flex flex-col items-center">
            <RandomizerPageSkeleton />
          </main>
        </div>
      }
    >
      <RandomizerContent />
    </Suspense>
  );
}
