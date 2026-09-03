'use client';
// frontend/src/components/maps/MapExplorer.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, ImageOff, ChevronDown, MapPin } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { MapRealm } from '@/types/map';
import { useMapExplorerData, type SelectedMapRequest } from '@/hooks/useMapExplorerData';
import { getMapImageSrc } from '@/utils/mapUtils';
import { MapCard } from './MapCard';

const FullscreenMapEngine = dynamic(
  () => import('./FullscreenMapEngine').then((m) => m.FullscreenMapEngine),
  { ssr: false }
);

// Must mirror the grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 classes below.
const REALM_GRID_BREAKPOINTS: { minWidth: number; columns: number }[] = [
  { minWidth: 1024, columns: 6 },
  { minWidth: 768, columns: 4 },
  { minWidth: 640, columns: 3 },
];

// Must match the panel wrapper's transition-duration below.
const PANEL_EXIT_MS = 300;

function useRealmGridColumns(): number {
  const [columns, setColumns] = useState(2);
  useEffect(() => {
    function computeColumns() {
      const match = REALM_GRID_BREAKPOINTS.find((bp) => window.innerWidth >= bp.minWidth);
      setColumns(match ? match.columns : 2);
    }
    computeColumns();
    window.addEventListener('resize', computeColumns);
    return () => window.removeEventListener('resize', computeColumns);
  }, []);
  return columns;
}

/**
 * A navigation command issued from outside the explorer (today: voice).
 * `timestamp` is what makes a repeated command fire again - saying "close" twice
 * must close twice, and an unchanged object would be dropped as no-op state.
 */
export interface MapViewCommand {
  action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close';
  timestamp: number;
}

export interface MapExplorerProps {
  initialMapName?: string;
  selectedMap?: SelectedMapRequest | string;
  onAvailableMapsLoaded?: (maps: MapRealm[]) => void;
  backendBase: string;
  dict?: Dictionary;
  hideSearch?: boolean;
  /**
   * Zoom / fullscreen / close issued by voice. The explorer owns the open-map
   * state and the map engine, so it is the only place that can act on these -
   * the maps page used to receive them and drop them on the floor.
   */
  viewCommand?: MapViewCommand | null;
  /** Rendered in the same slot as the search header (e.g. a voice command
   * banner) when `hideSearch` is true. Overlaid in the same grid cell as
   * the search header -- see the render below -- so the taller of the two
   * sets the slot's height instead of the shorter one collapsing to its
   * own height and shifting the map grid below on every swap. */
  voiceSlot?: React.ReactNode;
}

export const MapExplorer: React.FC<MapExplorerProps> = ({
  initialMapName = '',
  selectedMap,
  onAvailableMapsLoaded,
  backendBase,
  dict,
  hideSearch = false,
  viewCommand = null,
  voiceSlot,
}) => {
  const {
    maps,
    loading,
    search,
    setSearch,
    activeSearch,
    groupedMapsByRealm,
    realmImages,
    openMapId,
    setOpenMapId,
  } = useMapExplorerData({
    initialMapName,
    selectedMap,
    onAvailableMapsLoaded,
  });

  // Forwarded to the map engine, which applies one zoom step per new timestamp.
  const [zoomCommand, setZoomCommand] = useState<MapViewCommand | null>(null);
  const lastViewCommandRef = useRef<number>(0);
  const lastOpenedMapIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (openMapId) lastOpenedMapIdRef.current = openMapId;
  }, [openMapId]);

  useEffect(() => {
    if (!viewCommand || viewCommand.timestamp === lastViewCommandRef.current) return;
    lastViewCommandRef.current = viewCommand.timestamp;

    switch (viewCommand.action) {
      case 'close':
        setOpenMapId(null);
        break;
      case 'fullscreen':
        // "Fullscreen" with nothing open reopens the last map the user looked at;
        // with a map already open it is a no-op rather than an error.
        if (!openMapId && lastOpenedMapIdRef.current) setOpenMapId(lastOpenedMapIdRef.current);
        break;
      case 'zoom_in':
      case 'zoom_out':
        if (openMapId) setZoomCommand(viewCommand);
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewCommand]);

  const [expandedRealm, setExpandedRealm] = useState<string | null>(null);
  const [realmFilter, setRealmFilter] = useState<string | null>(null);
  const columns = useRealmGridColumns();

  // The full realm roster, independent of the current search text -- unlike
  // groupedMapsByRealm (built from the search-filtered `maps` list), this
  // doesn't shrink as soon as a query narrows results to fewer realms, so
  // the filter chips stay put while searching instead of disappearing.
  const allRealmNames = useMemo(
    () => Object.keys(realmImages).sort((a, b) => a.localeCompare(b)),
    [realmImages]
  );

  useEffect(() => {
    if (hideSearch) {
      if (search) setSearch('');
      if (realmFilter) setRealmFilter(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideSearch]);

  useEffect(() => {
    if (realmFilter && !groupedMapsByRealm.some((g) => g.realm === realmFilter)) {
      setRealmFilter(null);
    }
  }, [groupedMapsByRealm, realmFilter]);

  const isSearching = activeSearch.trim().length > 0;
  const isRealmExpanded = (realm: string) =>
    isSearching || expandedRealm === realm || (realmFilter !== null && realmFilter === realm);

  const pendingOpenRef = useRef<string | null>(null);
  const toggleRealm = (realm: string) => {
    setExpandedRealm((prev) => {
      if (prev === realm) {
        pendingOpenRef.current = null;
        return null;
      }
      if (prev !== null) {
        pendingOpenRef.current = realm;
        return null;
      }
      pendingOpenRef.current = null;
      return realm;
    });
  };

  const displayedGroups = realmFilter ? groupedMapsByRealm.filter((g) => g.realm === realmFilter) : groupedMapsByRealm;

  const activeRealms = useMemo(() => {
    const set = new Set<string>();
    displayedGroups.forEach(({ realm }) => {
      if (isRealmExpanded(realm)) set.add(realm);
    });
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedGroups, isSearching, expandedRealm, realmFilter]);
  const activeRealmsSignature = [...activeRealms].sort().join('|');

  const [renderedRealms, setRenderedRealms] = useState<Set<string>>(new Set());
  const [openRealms, setOpenRealms] = useState<Set<string>>(new Set());
  const exitTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const toEnter = [...activeRealms].filter((r) => !renderedRealms.has(r));
    const toExit = [...renderedRealms].filter((r) => !activeRealms.has(r));
    if (toEnter.length === 0 && toExit.length === 0) return;

    toEnter.forEach((r) => {
      const timer = exitTimers.current.get(r);
      if (timer) {
        clearTimeout(timer);
        exitTimers.current.delete(r);
      }
    });

    if (toEnter.length > 0) {
      setRenderedRealms((prev) => {
        const next = new Set(prev);
        toEnter.forEach((r) => next.add(r));
        return next;
      });
      requestAnimationFrame(() => {
        setOpenRealms((prev) => {
          const next = new Set(prev);
          toEnter.forEach((r) => next.add(r));
          return next;
        });
      });
    }

    if (toExit.length > 0) {
      setOpenRealms((prev) => {
        const next = new Set(prev);
        toExit.forEach((r) => next.delete(r));
        return next;
      });
      toExit.forEach((r) => {
        const timer = setTimeout(() => {
          setRenderedRealms((prev) => {
            const next = new Set(prev);
            next.delete(r);
            return next;
          });
          exitTimers.current.delete(r);
          if (pendingOpenRef.current) {
            const next = pendingOpenRef.current;
            pendingOpenRef.current = null;
            setExpandedRealm(next);
          }
        }, PANEL_EXIT_MS);
        exitTimers.current.set(r, timer);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRealmsSignature]);

  useEffect(() => {
    const present = new Set(displayedGroups.map((g) => g.realm));
    setRenderedRealms((prev) => {
      const next = new Set([...prev].filter((r) => present.has(r)));
      return next.size === prev.size ? prev : next;
    });
    setOpenRealms((prev) => {
      const next = new Set([...prev].filter((r) => present.has(r)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedGroups]);

  const rowPanels = useMemo(() => {
    const panels = new Map<number, { realm: string; maps: MapRealm[]; open: boolean }[]>();
    displayedGroups.forEach(({ realm, maps: realmMaps }, index) => {
      if (!renderedRealms.has(realm)) return;
      const rowEnd = Math.min(columns * (Math.floor(index / columns) + 1) - 1, displayedGroups.length - 1);
      const list = panels.get(rowEnd) ?? [];
      list.push({ realm, maps: realmMaps, open: openRealms.has(realm) });
      panels.set(rowEnd, list);
    });
    return panels;
  }, [displayedGroups, columns, renderedRealms, openRealms]);

  return (
    <div className="w-full space-y-6" data-testid="map-explorer-root">
      <div className="grid">
        <div className={`[grid-area:1/1] flex flex-col justify-center space-y-6 ${hideSearch ? 'invisible' : 'visible'}`}>
          <div className="relative w-full sm:max-w-lg sm:mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={dict?.maps?.searchPlaceholder || 'Search...'}
              aria-label={dict?.maps?.searchAria || 'Search map or realm'}
              tabIndex={hideSearch ? -1 : undefined}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {allRealmNames.length > 1 && (
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                tabIndex={hideSearch ? -1 : undefined}
                onClick={() => setRealmFilter(null)}
                aria-pressed={realmFilter === null}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  realmFilter === null
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {dict?.maps?.all || 'All'}
              </button>
              {allRealmNames.map((realm) => (
                <button
                  key={realm}
                  type="button"
                  tabIndex={hideSearch ? -1 : undefined}
                  onClick={() => setRealmFilter(realm)}
                  aria-pressed={realmFilter === realm}
                  className={`cursor-pointer inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                    realmFilter === realm
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {realm}
                </button>
              ))}
            </div>
          )}
        </div>

        {voiceSlot && (
          <div className={`[grid-area:1/1] flex ${hideSearch ? 'visible' : 'invisible'}`}>
            {voiceSlot}
          </div>
        )}
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

      {!loading && groupedMapsByRealm.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {displayedGroups.map(({ realm, maps: realmMaps }, index) => {
            const realmImage = realmImages[realm];
            const bannerSrc = realmImage
              ? getMapImageSrc({ callout_image_local_path: realmImage.image_local_path, callout_image_url: realmImage.image_url }, backendBase)
              : '';
            const expanded = isRealmExpanded(realm);
            const panelGroups = rowPanels.get(index);
            const showPanel = !!panelGroups && panelGroups.length > 0;
            const isOpen = showPanel && panelGroups!.some((g) => g.open);

            return (
              <React.Fragment key={realm}>
                <button
                  type="button"
                  onClick={() => toggleRealm(realm)}
                  aria-expanded={expanded}
                  aria-controls={`realm-panel-${realm}`}
                  aria-label={`${expanded ? dict?.maps?.collapseRealmAria || 'Collapse realm' : dict?.maps?.expandRealmAria || 'Expand realm'}: ${realm}`}
                  className={`group relative aspect-square w-full min-h-[48px] touch-manipulation overflow-hidden rounded-2xl border-2 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 ${expanded ? 'border-amber-400' : 'border-slate-200 dark:border-slate-800'}`}
                >
                  {bannerSrc ? (
                    <img
                      src={bannerSrc}
                      alt={realm}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                      <ImageOff className="h-8 w-8 text-slate-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent" />
                  <h2 className="absolute bottom-2 left-2 right-2 text-sm sm:text-base font-black text-white tracking-tight line-clamp-2">
                    {realm}
                  </h2>
                  <span className="absolute top-2 left-2 rounded-full bg-slate-950/60 px-2 py-0.5 text-xs font-mono text-white/90">
                    {realmMaps.length}
                  </span>
                  <ChevronDown
                    className={`absolute top-2 right-2 h-5 w-5 text-white drop-shadow transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {showPanel && (
                  <div
                    id={`realm-panel-${realm}`}
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridColumn: '1 / -1', gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                  >
                    <div className="overflow-hidden">
                      <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3">
                        {(panelGroups ?? []).map((group) => (
                          <div key={group.realm} className="space-y-2">
                            {(panelGroups?.length ?? 0) > 1 && (
                              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                {group.realm}
                              </h3>
                            )}
                            <div className="flex flex-wrap gap-3">
                              {group.maps.map((m) => (
                                <MapCard key={m.id} map={m} backendBase={backendBase} onSelect={(map) => setOpenMapId(map.id)} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {openMapId && (
        <FullscreenMapEngine
          mapId={openMapId}
          availableMaps={maps}
          onClose={() => setOpenMapId(null)}
          backendBase={backendBase}
          zoomCommand={zoomCommand}
          dict={dict}
        />
      )}
    </div>
  );
};
