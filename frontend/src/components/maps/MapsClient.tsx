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
      icon: <Search className="icon-md" aria-hidden="true" />,
      label: dict.maps.searchTextTab,
      activeClassName: 'bg-accent-red',
    },
    {
      value: 'voice',
      icon: <Mic className="icon-md" aria-hidden="true" />,
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

  // Retired maps are listed but never opened, so voice must not match them (it would announce a map it cannot open).
  const openableMaps = useMemo(() => availableMaps.filter((m) => !m.is_retired), [availableMaps]);

  const voiceBanner = useMemo(
    () => (
      <VoiceCommandBanner
        locale={locale}
        onSelectMap={handleSelectMap}
        onAction={handleAction}
        availableMaps={openableMaps}
        active={searchMode === 'voice'}
        centerHeaderSlot={toggleSwitchElement}
        embedded={true}
      />
    ),
    [locale, handleSelectMap, handleAction, openableMaps, searchMode, toggleSwitchElement]
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
