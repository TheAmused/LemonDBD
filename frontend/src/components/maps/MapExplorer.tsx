'use client';
// frontend/src/components/maps/MapExplorer.tsx

import React from 'react';
import { Search, ImageOff } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { MapRealm } from '@/types/map';
import { useMapExplorerData } from '@/hooks/useMapExplorerData';
import { getMapImageSrc } from '@/utils/mapUtils';
import { MapCard } from './MapCard';
import { FullscreenMapEngine } from './FullscreenMapEngine';

export interface MapExplorerProps {
  initialMapName?: string;
  selectedMap?: { mapName: string; timestamp: number } | string;
  onAvailableMapsLoaded?: (maps: MapRealm[]) => void;
  backendBase: string;
  dict?: Dictionary;
}

export const MapExplorer: React.FC<MapExplorerProps> = ({
  initialMapName = '',
  selectedMap,
  onAvailableMapsLoaded,
  backendBase,
  dict,
}) => {
  const {
    maps,
    loading,
    search,
    setSearch,
    groupedMapsByRealm,
    realmImages,
    openMapId,
    setOpenMapId,
  } = useMapExplorerData({
    initialMapName,
    selectedMap,
    onAvailableMapsLoaded,
  });

  return (
    <div className="w-full space-y-6" data-testid="map-explorer-root">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={dict?.maps?.searchPlaceholder || 'Search...'}
          aria-label={dict?.maps?.searchAria || 'Search map or realm'}
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {loading && (
        <div className="py-16 text-center text-xs text-slate-500 font-mono">
          {dict?.maps?.loadingTacticalMaps || 'Loading Tactical Maps...'}
        </div>
      )}

      {!loading && groupedMapsByRealm.length === 0 && (
        <div className="py-16 text-center text-xs text-slate-500 font-mono">
          {dict?.maps?.noMapsFound || 'No Maps Found'}
        </div>
      )}

      {!loading &&
        groupedMapsByRealm.map(({ realm, maps: realmMaps }) => {
          const realmImage = realmImages[realm];
          const bannerSrc = realmImage
            ? getMapImageSrc({ callout_image_local_path: realmImage.image_local_path, callout_image_url: realmImage.image_url } as MapRealm, backendBase)
            : '';

          return (
            <section key={realm} className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                {bannerSrc ? (
                  <div className="relative h-20 sm:h-24 w-full">
                    <img src={bannerSrc} alt={realm} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-slate-950/20" />
                    <h2 className="absolute bottom-2 left-4 text-lg sm:text-xl font-black text-white tracking-tight">
                      {realm}
                    </h2>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-900">
                    <ImageOff className="h-4 w-4 text-slate-400" />
                    <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                      {realm}
                    </h2>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {realmMaps.map((m) => (
                  <MapCard key={m.id} map={m} backendBase={backendBase} onSelect={(map) => setOpenMapId(map.id)} />
                ))}
              </div>
            </section>
          );
        })}

      {openMapId && (
        <FullscreenMapEngine
          mapId={openMapId}
          availableMaps={maps}
          onSelectMapId={(id) => setOpenMapId(id)}
          onClose={() => setOpenMapId(null)}
          dict={dict}
        />
      )}
    </div>
  );
};
