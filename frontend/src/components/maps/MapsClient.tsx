'use client';
// frontend/src/components/maps/MapsClient.tsx

import React, { Suspense, useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Search, Mic } from 'lucide-react';
import type { SegmentedControlOption } from '@/components/common/SegmentedControl';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { MapExplorer } from '@/components/maps/MapExplorer';
import { MapsPageSkeleton } from '@/components/maps/MapsSkeleton';
import type { Locale } from '@/i18n/config';
import type { MapRealm } from '@/types/map';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { usePersistentString } from '@/hooks/usePersistentString';
import { useOnValueChange } from '@/hooks/useOnValueChange';

const isValidSearchMode = (v: string): v is 'text' | 'voice' => v === 'text' || v === 'voice';
const isValidMapSource = (v: string): v is 'lemondbd' | 'hens333' => v === 'lemondbd' || v === 'hens333';

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
  const [mapSource, setMapSource] = usePersistentString<'lemondbd' | 'hens333'>('lemondbd_maps_source', 'lemondbd', isValidMapSource);

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
  // A new link target (client navigation to another map) is handled like a fresh selection:
  // the bumped timestamp makes it a new target even when it names the map already open.
  useOnValueChange(`${initialMapName}|${initialMapId ?? ''}`, () => {
    if (initialMapName || initialMapId !== undefined) {
      setSelectedMap((prev) => ({ mapName: initialMapName, mapId: initialMapId, timestamp: prev.timestamp + 1, via: 'link' }));
    }
  });

  const backendBase = getBackendBaseUrl();

  const searchModeOptions: readonly [
    SegmentedControlOption<'text' | 'voice'>,
    SegmentedControlOption<'text' | 'voice'>,
  ] = useMemo(() => [
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
  ], [dict.maps.searchTextTab, dict.maps.searchVoiceTab]);

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

  const handleSourceChange = useCallback(
    (src: 'all' | 'lemondbd' | 'hens333' | 'samoelcolt') => {
      setMapSource(src === 'hens333' ? 'hens333' : 'lemondbd');
    },
    [setMapSource]
  );

  const voiceBanner = useMemo(
    () => (
      <VoiceCommandBanner
        locale={locale}
        currentSource={mapSource}
        onSourceChange={handleSourceChange}
        onSelectMap={handleSelectMap}
        onAction={handleAction}
        availableMaps={availableMaps}
        active={searchMode === 'voice'}
        centerHeaderSlot={toggleSwitchElement}
        embedded={true}
      />
    ),
    [locale, mapSource, handleSourceChange, handleSelectMap, handleAction, availableMaps, searchMode, toggleSwitchElement]
  );

  return (
    <div className="relative z-10 flex flex-col gap-4">
      <MapExplorer
        initialMapName={selectedMap.mapName}
        selectedMap={selectedMap}
        onAvailableMapsLoaded={(maps) => {
          setAvailableMaps(maps);
        }}
        backendBase={backendBase}
        locale={locale}
        source={mapSource}
        onSourceChange={setMapSource}
        hideSearch={searchMode === 'voice'}
        voiceSlot={voiceBanner}
        modeSwitcherSlot={toggleSwitchElement}
      />
    </div>
  );
}

export function MapsClient() {
  return (
    <Suspense fallback={<MapsPageSkeleton />}>
      <MapsClientInner />
    </Suspense>
  );
}
