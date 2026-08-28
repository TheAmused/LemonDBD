import type { Dictionary } from '@/locales/types';
// frontend/src/app/[locale]/killer-calculator/page.tsx
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { KillerCalculator } from '@/components/killer/KillerCalculator';
import { QuestsModal } from '@/components/QuestsModal';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { useSidebarState } from '@/hooks/useSidebarState';

export default function KillerCalculatorPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const { isCollapsed } = useSidebarState();

  const [dict, setDict] = useState<Dictionary | null>(null);
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);

  // Vault Stats for Sidebar
  const [totalPerksCount, setTotalPerksCount] = useState<number>(0);
  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    getDictionary(locale).then((d) => {
      setDict(d);
      document.title = d?.app?.killerCalculatorPageTitle || 'LemonDBD - Killer Calculator';
    });
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
          const list = pData.data || [];
          setTotalPerksCount(pData.pagination?.total || list.length);
          setSurvivorCount(list.filter((p: any) => p.category === 'Survivor').length);
          setKillerCount(list.filter((p: any) => p.category === 'Killer').length);
        }
        if (charsRes.ok) {
          const cData = await charsRes.json();
          setCharacterCount(cData.count || (cData.data || []).length);
        }
      } catch (err) {
        console.error('Failed to load sidebar vault stats:', err);
      }
    }
    loadVaultStats();
  }, [backendBase]);

  const handleSelectCategory = (cat: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/${locale}`;
    }
  };

  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">
        'Loading...'
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="killer-calculator"
        onSelectCategory={handleSelectCategory}
        onOpenQuests={() => setIsQuestsOpen(true)}
        totalPerksCount={totalPerksCount}
        survivorCount={survivorCount}
        killerCount={killerCount}
        characterCount={characterCount}
      />

      <main
        className={`flex-1 w-full overflow-y-auto transition-all duration-300 p-5 sm:p-7 lg:p-9 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        <Suspense fallback={<div className="p-8 text-center text-slate-400">{dict?.characterDetail?.loading || 'Loading...'}</div>}>
          <KillerCalculator dict={dict} />
        </Suspense>
        <QuestsModal isOpen={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} dict={dict} />
      </main>
    </div>
  );
}
