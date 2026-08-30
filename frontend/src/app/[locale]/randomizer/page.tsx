'use client';
// frontend/src/app/[locale]/randomizer/page.tsx

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { PerkModal } from '@/components/PerkModal';
import { GeneratorPage } from '@/components/generator/GeneratorPage';
import { QuestsModal } from '@/components/QuestsModal';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { useSidebarState } from '@/hooks/useSidebarState';
import { useAuth } from '@/context/AuthContext';
import { Perk, CharacterItem } from '@/types/perks';
import type { Dictionary } from '@/locales/types';
import { getBackendBaseUrl } from '@/utils/perkUtils';

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

  if (!dict) return null;

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
        className={`flex-1 w-full overflow-y-auto transition-all duration-300 p-4 sm:p-6 lg:p-8 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        <GeneratorPage allPerks={allPerks} onSelectPerk={setSelectedPerk} dict={dict} />

        <PerkModal perk={selectedPerk} onClose={() => setSelectedPerk(null)} dict={dict} />
        <QuestsModal
          isOpen={isQuestsOpen}
          onClose={() => setIsQuestsOpen(false)}
          dict={dict}
        />
      </main>
    </div>
  );
}

export default function RandomizerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b12] flex items-center justify-center text-slate-400 font-mono text-xs">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <RandomizerContent />
    </Suspense>
  );
}
