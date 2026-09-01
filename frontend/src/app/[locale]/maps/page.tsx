'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/app/[locale]/maps/page.tsx

import React, { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { MapExplorer } from '@/components/maps/MapExplorer';
import { MapsPageSkeleton } from '@/components/maps/MapsSkeleton';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { useSidebarState } from '@/hooks/useSidebarState';
import { MapRealm } from '@/types/map';
import { Perk } from '@/types/perks';
import { getBackendBaseUrl } from '@/utils/perkUtils';

const VoiceCommandBanner = dynamic(
  () => import('@/components/maps/VoiceCommandBanner').then((m) => m.VoiceCommandBanner),
  { ssr: false }
);
const QuestsModal = dynamic(
  () => import('@/components/QuestsModal').then((m) => m.QuestsModal),
  { ssr: false }
);

function MapsPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as Locale) || 'en';
  const { isCollapsed } = useSidebarState();

  const [dict, setDict] = useState<Dictionary | null>(null);
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);
  const initialMapName = searchParams?.get('mapName') || '';

  const [searchMode, setSearchMode] = useState<'text' | 'voice'>('text');
  const [availableMaps, setAvailableMaps] = useState<MapRealm[]>([]);
  const [selectedMap, setSelectedMap] = useState<{
    mapName: string;
    timestamp: number;
  }>({
    mapName: initialMapName,
    timestamp: Date.now(),
  });
  useEffect(() => {
    if (initialMapName) {
      setSelectedMap({ mapName: initialMapName, timestamp: Date.now() });
    }
  }, [initialMapName]);

  const [totalPerksCount, setTotalPerksCount] = useState<number>(0);
  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);

  const backendBase = getBackendBaseUrl();

  useEffect(() => {
    getDictionary(locale)
      .then((d) => {
        setDict(d as any);
        document.title = d?.maps?.pageTitle || 'LemonDBD - Tactical Map Command Explorer';
      })
      .catch((err: unknown) => console.error('Failed to load maps dictionary:', err));
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
          const list: Perk[] = pData.data || [];
          setTotalPerksCount(pData.pagination?.total || list.length);
          setSurvivorCount(list.filter((p) => p.category === 'Survivor').length);
          setKillerCount(list.filter((p) => p.category === 'Killer').length);
        }
        if (charsRes.ok) {
          const cData = await charsRes.json();
          setCharacterCount(cData.count || (cData.data || []).length);
        }
      } catch (err: unknown) {
        console.error('Failed to load sidebar vault stats:', err);
      }
    }
    loadVaultStats();
  }, [backendBase]);

  const handleSelectCategory = () => {
    if (typeof window !== 'undefined') {
      window.location.href = `/${locale}`;
    }
  };

  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
        <aside className="hidden lg:flex w-72 flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 bg-[#0a0f18]/90 p-4 space-y-4 select-none animate-pulse" />
        <main className="flex-1 w-full min-h-screen p-4 sm:p-6 lg:p-7 flex flex-col gap-4 lg:pl-72">
          <MapsPageSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="maps"
        onSelectCategory={handleSelectCategory}
        onOpenQuests={() => setIsQuestsOpen(true)}
        totalPerksCount={totalPerksCount}
        survivorCount={survivorCount}
        killerCount={killerCount}
        characterCount={characterCount}
      />

      <main
        className={`flex-1 w-full min-h-screen transition-all duration-300 p-4 sm:p-6 lg:p-7 flex flex-col gap-4 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        <div className="flex items-center gap-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 w-fit">
          <button
            type="button"
            onClick={() => setSearchMode('text')}
            aria-pressed={searchMode === 'text'}
            className={`rounded-xl px-4 py-2 min-h-[44px] touch-manipulation text-xs font-bold transition-colors cursor-pointer ${
              searchMode === 'text'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {dict?.maps?.searchTextTab || 'Search'}
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('voice')}
            aria-pressed={searchMode === 'voice'}
            className={`rounded-xl px-4 py-2 min-h-[44px] touch-manipulation text-xs font-bold transition-colors cursor-pointer ${
              searchMode === 'voice'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {dict?.maps?.searchVoiceTab || 'Voice'}
          </button>
        </div>

        {searchMode === 'voice' && (
          <VoiceCommandBanner
            locale={locale}
            dict={dict}
            currentSource="hens333"
            onSourceChange={() => {}}
            onSelectMap={(name) => {
              setSelectedMap({ mapName: name, timestamp: Date.now() });
            }}
            onAction={() => {
              // Voice zoom/fullscreen/close actions have no target in the redesigned
              // realm-grid layout (no single "active" map). Intentionally unwired
              // pending a follow-up to re-home this behavior, matching how
              // VariantSwitcherBar was deferred in the same redesign.
            }}
            availableMaps={availableMaps}
          />
        )}

        <MapExplorer
          initialMapName={selectedMap.mapName}
          selectedMap={selectedMap}
          onAvailableMapsLoaded={(maps) => {
            setAvailableMaps(maps);
          }}
          backendBase={backendBase}
          dict={dict}
          hideSearch={searchMode === 'voice'}
        />

        <QuestsModal isOpen={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} dict={dict} />
      </main>
    </div>
  );
}

export default function MapsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
          <aside className="hidden lg:flex w-72 flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 bg-[#0a0f18]/90 p-4 space-y-4 select-none animate-pulse" />
          <main className="flex-1 w-full min-h-screen p-4 sm:p-6 lg:p-7 flex flex-col gap-4 lg:pl-72">
            <MapsPageSkeleton />
          </main>
        </div>
      }
    >
      <MapsPageInner />
    </Suspense>
  );
}
