'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { MapExplorer } from '@/components/maps/MapExplorer';
import { VoiceCommandBanner } from '@/components/maps/VoiceCommandBanner';
import { QuestsModal } from '@/components/QuestsModal';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { Compass } from 'lucide-react';
import { useSidebarState } from '@/hooks/useSidebarState';
import { MapRealm } from '@/types/map';

function MapsPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as Locale) || 'en';
  const { isCollapsed } = useSidebarState();

  const [dict, setDict] = useState<any>(null);
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);
  const initialMapName = searchParams?.get('mapName') || '';

  // Voice Navigation & Source State
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

  // Sync selectedMap if URL parameter changes
  useEffect(() => {
    if (initialMapName) {
      setSelectedMap({ mapName: initialMapName, timestamp: Date.now() });
    }
  }, [initialMapName]);

  // Vault Stats for Sidebar
  const [totalPerksCount, setTotalPerksCount] = useState<number>(0);
  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    document.title = 'LemonDBD - Map Explorer';
    getDictionary(locale)
      .then(setDict)
      .catch((err) => console.error('Failed to load maps dictionary:', err));
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

  const handleSelectCategory = () => {
    if (typeof window !== 'undefined') {
      window.location.href = `/${locale}`;
    }
  };

  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">
        Loading...
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
        className={`flex-1 w-full overflow-y-auto transition-all duration-300 p-5 sm:p-7 lg:p-9 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        {/* ── Page Header ── */}
        <div className="mb-7 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 shadow-sm">
              <Compass className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Map Explorer
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Browse DBD maps, callouts, and guides with real-time voice navigation
              </p>
            </div>
          </div>

          {/* ── Voice Command Banner ── */}
          <VoiceCommandBanner
            locale={locale}
            currentSource={currentSource}
            onSourceChange={(src) => {
              console.log('[MapsPage] Source changed to:', src);
              setCurrentSource(src);
            }}
            onSelectMap={(name, id, src) => {
              console.log('[MapsPage] onSelectMap called with:', { name, id, src });
              if (src) setCurrentSource(src as any);
              setSelectedMap({ mapName: name, timestamp: Date.now() });
            }}
            onAction={(act) => {
              console.log('[MapsPage] onAction called with:', act);
              setTriggerAction({ action: act, timestamp: Date.now() });
            }}
            availableMaps={availableMaps}
          />
        </div>

        <MapExplorer
          initialMapName={selectedMap.mapName}
          selectedMap={selectedMap}
          selectedSource={currentSource}
          onSourceChange={(src) => {
            console.log('[MapsPage] Explorer source changed to:', src);
            setCurrentSource(src);
          }}
          onAvailableMapsLoaded={(maps) => {
            console.log('[MapsPage] Loaded available maps count:', maps.length);
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">
          Loading...
        </div>
      }
    >
      <MapsPageInner />
    </Suspense>
  );
}
