'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { ItemsAddonsViewer } from '@/components/ItemsAddonsViewer';
import { QuestsModal } from '@/components/QuestsModal';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { useSidebarState } from '@/hooks/useSidebarState';

export default function ItemsPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const { isCollapsed } = useSidebarState();

  const [dict, setDict] = useState<any>(null);
  const [category, setCategory] = useState<string>('items');
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);

  // Vault Stats for Sidebar
  const [totalPerksCount, setTotalPerksCount] = useState<number>(0);
  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    document.title = 'LemonDBD - Items & Add-ons';
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

  if (!dict) return null;

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-300">
      <Sidebar
        dict={dict}
        activeCategory={category}
        onSelectCategory={setCategory}
        currentLocale={locale}
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
        <ItemsAddonsViewer />
        <QuestsModal isOpen={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} dict={dict} />
      </main>
    </div>
  );
}
