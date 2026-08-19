'use client';
// frontend/src/app/[locale]/maps/page.tsx

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { MapExplorer } from '@/components/maps/MapExplorer';
import { VoiceCommandBanner } from '@/components/maps/VoiceCommandBanner';
import { QuestsModal } from '@/components/QuestsModal';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { useSidebarState } from '@/hooks/useSidebarState';
import { MapRealm } from '@/types/map';
import { Perk, PerkDictionary } from '@/types/perks';
import { getBackendBaseUrl } from '@/utils/perkUtils';

function MapsPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as Locale) || 'en';
  const { isCollapsed } = useSidebarState();

  const [dict, setDict] = useState<PerkDictionary | null>(null);
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);
  const initialMapName = searchParams?.get('mapName') || '';

  const [currentSource, setCurrentSource] = useState<'all' | 'hens333' | 'samoelcolt'>('hens333');
  const [availableMaps, setAvailableMaps] = useState<MapRealm[]>([]);
  const [selectedMap, setSelectedMap] = useState<{
    mapName: string;
    timestamp: number;
  }>({
    mapName: initialMapName,
    timestamp: Date.now(),
  });
  const [triggerAction, setTriggerAction] = useState<{
    action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close';
    timestamp: number;
  } | null>(null);

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
    document.title = 'LemonDBD - Tactical Map Command Explorer';
    getDictionary(locale)
      .then((d) => setDict(d as PerkDictionary))
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400 font-mono text-xs">
        Initializing Tactical Map Command...
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
        <VoiceCommandBanner
          locale={locale}
          dict={dict}
          currentSource={currentSource}
          onSourceChange={(src) => {
            setCurrentSource(src);
          }}
          onSelectMap={(name, id, src) => {
            if (src) setCurrentSource(src as 'all' | 'hens333' | 'samoelcolt');
            setSelectedMap({ mapName: name, timestamp: Date.now() });
          }}
          onAction={(act) => {
            setTriggerAction({ action: act, timestamp: Date.now() });
          }}
          availableMaps={availableMaps}
        />

        <MapExplorer
          initialMapName={selectedMap.mapName}
          selectedMap={selectedMap}
          selectedSource={currentSource}
          onSourceChange={(src) => {
            setCurrentSource(src);
          }}
          onAvailableMapsLoaded={(maps) => {
            setAvailableMaps(maps);
          }}
          onActionTriggered={(act) => setTriggerAction({ action: act, timestamp: Date.now() })}
          triggerAction={triggerAction}
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400 font-mono text-xs">
          Loading Tactical Maps...
        </div>
      }
    >
      <MapsPageInner />
    </Suspense>
  );
}
