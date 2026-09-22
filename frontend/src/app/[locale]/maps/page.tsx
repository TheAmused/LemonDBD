'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/app/[locale]/maps/page.tsx

import React, { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useSearchParams } from 'next/navigation';
import { Search, Mic } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { PageShellFallback } from '@/components/layout/PageShellFallback';
import { ToggleSwitch, ToggleSwitchOption } from '@/components/common/ToggleSwitch';
import { MapExplorer } from '@/components/maps/MapExplorer';
import { MapsPageSkeleton } from '@/components/maps/MapsSkeleton';
import { Locale } from '@/i18n/config';
import { MapRealm } from '@/types/map';
import { Perk } from '@/types/perks';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { useDictionary } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePersistentString } from '@/hooks/usePersistentString';

const isValidSearchMode = (v: string): v is 'text' | 'voice' => v === 'text' || v === 'voice';

const VoiceCommandBanner = dynamic(
  () => import('@/components/maps/VoiceCommandBanner').then((m) => m.VoiceCommandBanner),
  { ssr: false }
);
const CampfireParticles = dynamic(
  () => import('@/components/common/CampfireParticles').then((m) => m.CampfireParticles),
  { ssr: false }
);

function MapsPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as Locale) || 'en';

  const dict = useDictionary();
  const initialMapName = searchParams?.get('mapName') || '';

  const [searchMode, setSearchMode] = usePersistentString('lemondbd_maps_search_mode', 'text', isValidSearchMode);

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


  const backendBase = getBackendBaseUrl();

  const searchModeOptions: readonly [
    ToggleSwitchOption<'text' | 'voice'>,
    ToggleSwitchOption<'text' | 'voice'>,
  ] = [
    {
      value: 'text',
      icon: <Search className="h-4 w-4" aria-hidden="true" />,
      label: dict?.maps?.searchTextTab || 'Search',
      activeClassName: 'bg-accent-red',
    },
    {
      value: 'voice',
      icon: <Mic className="h-4 w-4" aria-hidden="true" />,
      label: dict?.maps?.searchVoiceTab || 'Voice',
      activeClassName: 'bg-accent-red',
    },
  ];

  useDocumentTitle(dict?.maps?.pageTitle || 'LemonDBD - Tactical Map Command Explorer');

  const voiceBanner = (
    <VoiceCommandBanner
      locale={locale}
      dict={dict}
      currentSource="hens333"
      onSourceChange={() => {}}
      onSelectMap={(name) => {
        setSelectedMap({ mapName: name, timestamp: Date.now() });
      }}
      onAction={() => {
        // Voice zoom/fullscreen/close actions have no target in the
        // realm-grid layout -- there's no single "active" map to apply them to.
      }}
      availableMaps={availableMaps}
      active={searchMode === 'voice'}
    />
  );

  const handleSelectCategory = () => {
    if (typeof window !== 'undefined') {
      window.location.href = `/${locale}`;
    }
  };

  return (
    <PageShell
      locale={locale}
      dict={dict}
      activeCategory="maps"
      onSelectCategory={handleSelectCategory}
      customPadding="p-4 sm:p-6 lg:p-7"
      mainClassName="relative min-h-screen flex flex-col gap-4"
    >
      <CampfireParticles />
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex justify-center">
          <ToggleSwitch
            value={searchMode}
            onChange={setSearchMode}
            ariaLabel={dict?.maps?.searchModeAria || 'Search mode'}
            options={searchModeOptions}
          />
        </div>

        <MapExplorer
          initialMapName={selectedMap.mapName}
          selectedMap={selectedMap}
          onAvailableMapsLoaded={(maps) => {
            setAvailableMaps(maps);
          }}
          backendBase={backendBase}
          dict={dict}
          locale={locale}
          hideSearch={searchMode === 'voice'}
          voiceSlot={voiceBanner}
        />
      </div>
    </PageShell>
  );
}

export default function MapsPage() {
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
      <MapsPageInner />
    </Suspense>
  );
}
