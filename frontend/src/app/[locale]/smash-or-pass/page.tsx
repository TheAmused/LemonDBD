// frontend/src/app/[locale]/smash-or-pass/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { SmashOrPassHub } from '@/components/smash-or-pass/SmashOrPassHub';
import { QuestsModal } from '@/components/QuestsModal';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { useSidebarState } from '@/hooks/useSidebarState';
import { PerkItem, CharacterItem } from '@/components/character-detail/types';
import { getBackendBaseUrl } from '@/utils/perkUtils';

export default function SmashOrPassPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const { isCollapsed } = useSidebarState();

  const [dict, setDict] = useState<Record<string, any> | null>(null);
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);

  // Vault Stats for Sidebar
  const [totalPerksCount, setTotalPerksCount] = useState<number>(0);
  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);

  const backendBase = getBackendBaseUrl();

  useEffect(() => {
    document.title = 'LemonDBD - Smash or Pass | Dead by Daylight Romance';
    getDictionary(locale).then(setDict);
  }, [locale]);

  useEffect(() => {
    async function loadVaultStats() {
      try {
        const [perksRes, charsRes] = await Promise.all([
          fetch(`${backendBase}/api/v1/perks?limit=1000`),
          fetch(`${backendBase}/api/v1/characters`),
        ]);
        if (perksRes.ok) {
          const pData = await perksRes.json();
          const list: PerkItem[] = pData.data || [];
          setTotalPerksCount(pData.pagination?.total || list.length);
          setSurvivorCount(list.filter((p) => p.category === 'Survivor').length);
          setKillerCount(list.filter((p) => p.category === 'Killer').length);
        }
        if (charsRes.ok) {
          const cData = await charsRes.json();
          const charList: CharacterItem[] = cData.data || [];
          setCharacterCount(cData.count || charList.length);
        }
      } catch (err: unknown) {
        console.error('Failed to load sidebar vault stats:', err);
      }
    }
    loadVaultStats();
  }, [backendBase]);

  if (!dict) {
    return (
      <div className="min-h-screen bg-[#070b12] text-slate-400 flex items-center justify-center font-mono text-xs">
        Loading Smash or Pass...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="smash-or-pass"
        onOpenQuests={() => setIsQuestsOpen(true)}
        totalPerksCount={totalPerksCount}
        survivorCount={survivorCount}
        killerCount={killerCount}
        characterCount={characterCount}
      />

      <main
        className={`flex-1 w-full overflow-y-auto transition-all duration-300 p-4 sm:p-6 lg:p-8 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        <SmashOrPassHub dict={dict} locale={locale} />
        <QuestsModal isOpen={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} dict={dict} />
      </main>
    </div>
  );
}
