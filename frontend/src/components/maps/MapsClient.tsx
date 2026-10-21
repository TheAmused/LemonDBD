'use client';
// frontend/src/components/maps/MapsClient.tsx

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Mic } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { PageShellFallback } from '@/components/layout/PageShellFallback';
import { SegmentedControl, SegmentedControlOption } from '@/components/common/SegmentedControl';
import { MapExplorer } from '@/components/maps/MapExplorer';
import { MapsPageSkeleton } from '@/components/maps/MapsSkeleton';
import { Locale } from '@/i18n/config';
import { MapRealm } from '@/types/map';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { usePersistentString } from '@/hooks/usePersistentString';

const isValidSearchMode = (v: string): v is 'text' | 'voice' => v === 'text' || v === 'voice';

const VoiceCommandBanner = dynamic(
  () => import('@/components/maps/VoiceCommandBanner').then((m) => m.VoiceCommandBanner),
  { ssr: false }
);

function MapsClientInner() {
  const searchParams = useSearchParams();
  const locale = useLocale() as Locale;

  const dict = useDictionary();
  const initialMapId = searchParams?.get('mapId') ? Number(searchParams.get('mapId')) : undefined;
  const initialMapName = searchParams?.get('mapName') || '';

  const [searchMode, setSearchMode] = usePersistentString('lemondbd_maps_search_mode', 'text', isValidSearchMode);

  const [availableMaps, setAvailableMaps] = useState<MapRealm[]>([]);
  const [selectedMap, setSelectedMap] = useState<{
    mapName: string;
    mapId?: number;
    timestamp: number;
    via?: 'voice' | 'link';
  }>(() => ({
    mapName: initialMapName,
    mapId: initialMapId,
    timestamp: Date.now(),
    via: 'link',
  }));
  useEffect(() => {
    if (initialMapName || initialMapId !== undefined) {
      setSelectedMap({ mapName: initialMapName, mapId: initialMapId, timestamp: Date.now(), via: 'link' });
    }
  }, [initialMapName, initialMapId]);

  const backendBase = getBackendBaseUrl();

  const searchModeOptions: readonly [
    SegmentedControlOption<'text' | 'voice'>,
    SegmentedControlOption<'text' | 'voice'>,
  ] = [
    {
      value: 'text',
      icon: <Search className="h-4 w-4" aria-hidden="true" />,
      label: dict.maps.searchTextTab,
      activeClassName: 'bg-accent-red',
    },
    {
      value: 'voice',
      icon: <Mic className="h-4 w-4" aria-hidden="true" />,
      label: dict.maps.searchVoiceTab,
      activeClassName: 'bg-accent-red',
    },
  ];

  const router = useRouter();

  const handleSelectMap = useCallback((name: string, mapId?: number) => {
    setSelectedMap({ mapName: name, mapId, timestamp: Date.now(), via: 'voice' });
  }, []);
  const handleAction = useCallback((action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close') => {
    if (action === 'close') {
      setSelectedMap((prev) => ({ ...prev, mapName: '', mapId: undefined, timestamp: Date.now() }));
    }
  }, []);

  const toggleSwitchElement = useMemo(
    () => (
      <SegmentedControl
        value={searchMode}
        onChange={setSearchMode}
        ariaLabel={dict.maps.searchModeAria}
        options={searchModeOptions}
      />
    ),
    [searchMode, setSearchMode, dict.maps.searchModeAria, searchModeOptions]
  );

  const voiceBanner = useMemo(
    () => (
      <VoiceCommandBanner
        locale={locale}
        currentSource="hens333"
        onSelectMap={handleSelectMap}
        onAction={handleAction}
        availableMaps={availableMaps}
        active={searchMode === 'voice'}
        centerHeaderSlot={toggleSwitchElement}
        embedded={true}
      />
    ),
    [locale, handleSelectMap, handleAction, availableMaps, searchMode, toggleSwitchElement]
  );

  const handleSelectCategory = useCallback(() => {
    router.push(`/${locale}`);
  }, [router, locale]);

  return (
    <PageShell
      locale={locale}
      activeCategory="maps"
      onSelectCategory={handleSelectCategory}
      customPadding="p-4 sm:p-6 lg:p-7"
      mainClassName="relative min-h-screen flex flex-col gap-4"
    >
      <div className="relative z-10 flex flex-col gap-4">
        <MapExplorer
          initialMapName={selectedMap.mapName}
          selectedMap={selectedMap}
          onAvailableMapsLoaded={(maps) => {
            setAvailableMaps(maps);
          }}
          backendBase={backendBase}
          locale={locale}
          hideSearch={searchMode === 'voice'}
          voiceSlot={voiceBanner}
          modeSwitcherSlot={toggleSwitchElement}
        />
      </div>
    </PageShell>
  );
}

export function MapsClient() {
  return (
    <Suspense
      fallback={
        <PageShellFallback
          customPadding="p-4 sm:p-6 lg:p-7"
          mainClassName="min-h-screen flex flex-col gap-4"
          skeleton={<MapsPageSkeleton />}
        />
      }
    >
      <MapsClientInner />
    </Suspense>
  );
}
