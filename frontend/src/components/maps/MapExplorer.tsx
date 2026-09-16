'use client';
// frontend/src/components/maps/MapExplorer.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, ImageOff, Compass, Layers, Maximize2, Building2, ArrowDownAZ, X } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { MapRealm } from '@/types/map';
import { useMapExplorerData } from '@/hooks/useMapExplorerData';
import { useResponsiveGridColumns } from '@/hooks/useResponsiveGridColumns';
import {
  EMPTY_MAP_FILTERS,
  filterAndSortRealmGroups,
  getLayoutTypeOptions,
  getMapImageSrc,
  getPalletDensityOptions,
  hasActiveMapFilters,
  type MapAttributeFilters,
  type MapSizeBucket,
  type MapSortOrder,
  type MapStructureFilter,
} from '@/utils/mapUtils';
import { CustomDropdown, type DropdownOption } from '@/components/common/CustomDropdown';
import { MapCard } from './MapCard';

// Sentinel dropdown value for "no filter"; real attribute values never collide with it.
const ANY = '__any__';

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

export interface MapExplorerProps {
  initialMapName?: string;
  selectedMap?: { mapName: string; timestamp: number } | string;
  onAvailableMapsLoaded?: (maps: MapRealm[]) => void;
  backendBase: string;
  dict?: Dictionary;
  locale?: string;
  hideSearch?: boolean;
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
  locale,
  hideSearch = false,
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
    locale,
  });

  const [expandedRealm, setExpandedRealm] = useState<string | null>(null);
  const [filters, setFilters] = useState<MapAttributeFilters>(EMPTY_MAP_FILTERS);
  const [sortOrder, setSortOrder] = useState<MapSortOrder>('az');
  const columns = useResponsiveGridColumns(REALM_GRID_BREAKPOINTS, 2);
  const filtersActive = hasActiveMapFilters(filters);

  useEffect(() => {
    if (hideSearch) {
      if (search) setSearch('');
      setFilters(EMPTY_MAP_FILTERS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideSearch]);

  const setFilter = <K extends keyof MapAttributeFilters>(key: K, value: MapAttributeFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const mapsDict = dict?.maps;
  const layoutOptions: DropdownOption[] = useMemo(
    () => [
      { value: ANY, label: mapsDict?.filterAnyLayout || 'Any layout' },
      ...getLayoutTypeOptions(maps).map((v) => ({ value: v, label: v })),
    ],
    [maps, mapsDict]
  );
  const palletOptions: DropdownOption[] = useMemo(
    () => [
      { value: ANY, label: mapsDict?.filterAnyPallets || 'Any pallets' },
      ...getPalletDensityOptions(maps).map((v) => ({
        value: v,
        label: (mapsDict?.palletsSuffix || '{density} Pallets').replace('{density}', v),
      })),
    ],
    [maps, mapsDict]
  );
  const sizeOptions: DropdownOption<MapSizeBucket | typeof ANY>[] = [
    { value: ANY, label: mapsDict?.filterAnySize || 'Any size' },
    { value: 'small', label: mapsDict?.sizeSmall || 'Small', sublabel: mapsDict?.sizeSmallHint || 'under 9000 m²' },
    { value: 'medium', label: mapsDict?.sizeMedium || 'Medium', sublabel: mapsDict?.sizeMediumHint || '9000 to 9999 m²' },
    { value: 'large', label: mapsDict?.sizeLarge || 'Large', sublabel: mapsDict?.sizeLargeHint || '10000 m² and up' },
  ];
  const structureOptions: DropdownOption<MapStructureFilter | typeof ANY>[] = [
    { value: ANY, label: mapsDict?.filterAnyStructure || 'Any buildings' },
    { value: 'shack', label: mapsDict?.shackYes || 'Shack' },
    { value: 'no_shack', label: mapsDict?.shackNo || 'No Shack' },
    { value: 'main_building', label: mapsDict?.mainBuildingYes || 'Main Building' },
    { value: 'no_main_building', label: mapsDict?.mainBuildingNo || 'No Main Building' },
  ];
  const sortOptions: DropdownOption<MapSortOrder>[] = [
    { value: 'az', label: mapsDict?.sortAz || 'Name A to Z' },
    { value: 'za', label: mapsDict?.sortZa || 'Name Z to A' },
  ];

  const isSearching = activeSearch.trim().length > 0;
  const isRealmExpanded = (realm: string) => isSearching || expandedRealm === realm;

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

  const displayedGroups = useMemo(
    () => filterAndSortRealmGroups(groupedMapsByRealm, filters, sortOrder),
    [groupedMapsByRealm, filters, sortOrder]
  );

  const activeRealms = useMemo(() => {
    const set = new Set<string>();
    displayedGroups.forEach(({ realm }) => {
      if (isRealmExpanded(realm)) set.add(realm);
    });
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedGroups, isSearching, expandedRealm]);
  const activeRealmsSignature = [...activeRealms].sort().join('|');
  const activeRealmsRef = useRef(activeRealms);
  activeRealmsRef.current = activeRealms;

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
      // Double rAF: guarantees the closed state actually paints before flipping open, or the transition can silently skip.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOpenRealms((prev) => {
            const next = new Set(prev);
            // Re-check against the latest activeRealms: if the user toggled this
            // realm shut again before these frames fired, don't reopen it.
            toEnter.forEach((r) => {
              if (activeRealmsRef.current.has(r)) next.add(r);
            });
            return next;
          });
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={dict?.maps?.searchPlaceholder || 'Search...'}
              aria-label={dict?.maps?.searchAria || 'Search map or realm'}
              tabIndex={hideSearch ? -1 : undefined}
              className="w-full rounded-2xl border border-border-color bg-bg-surface py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-red"
            />
          </div>

          {/* `inert` keeps the hidden filter row out of the tab order while the voice slot is shown. */}
          <div className="flex flex-wrap items-center justify-center gap-2" data-testid="map-filters" inert={hideSearch}>
            <CustomDropdown
              value={filters.layoutType ?? ANY}
              onChange={(v) => setFilter('layoutType', v === ANY ? null : v)}
              options={layoutOptions}
              icon={<Compass className="h-3.5 w-3.5" />}
              ariaLabel={mapsDict?.layoutLabel || 'Layout'}
            />
            <CustomDropdown
              value={filters.palletDensity ?? ANY}
              onChange={(v) => setFilter('palletDensity', v === ANY ? null : v)}
              options={palletOptions}
              icon={<Layers className="h-3.5 w-3.5" />}
              ariaLabel={mapsDict?.palletDensityLabel || 'Pallet Density'}
            />
            <CustomDropdown
              value={filters.size ?? ANY}
              onChange={(v) => setFilter('size', v === ANY ? null : v)}
              options={sizeOptions}
              icon={<Maximize2 className="h-3.5 w-3.5" />}
              ariaLabel={mapsDict?.surfaceArea || 'Surface Area'}
              minWidthClass="min-w-[220px]"
            />
            <CustomDropdown
              value={filters.structure ?? ANY}
              onChange={(v) => setFilter('structure', v === ANY ? null : v)}
              options={structureOptions}
              icon={<Building2 className="h-3.5 w-3.5" />}
              ariaLabel={mapsDict?.structureAria || 'Buildings'}
              minWidthClass="min-w-[200px]"
            />
            <CustomDropdown
              value={sortOrder}
              onChange={setSortOrder}
              options={sortOptions}
              icon={<ArrowDownAZ className="h-3.5 w-3.5" />}
              ariaLabel={mapsDict?.sortAria || 'Sort maps'}
              align="right"
            />
            {filtersActive && (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_MAP_FILTERS)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-xl px-3 py-2 text-xs font-mono font-bold text-text-secondary transition-colors hover:bg-bg-elevated hover:text-accent-red"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                {mapsDict?.clearFilters || 'Clear filters'}
              </button>
            )}
          </div>
        </div>

        {voiceSlot && (
          <div className={`[grid-area:1/1] flex ${hideSearch ? 'visible' : 'invisible'}`}>
            {voiceSlot}
          </div>
        )}
      </div>

      {loading && (
        <div className="py-16 text-center text-xs text-text-muted font-mono">
          {dict?.maps?.loadingTacticalMaps || 'Loading Tactical Maps...'}
        </div>
      )}

      {!loading && displayedGroups.length === 0 && (
        <div className="py-16 text-center text-xs text-text-muted font-mono">
          {dict?.maps?.noMapsFound || 'No Maps Found'}
        </div>
      )}

      {!loading && displayedGroups.length > 0 && (
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
                  className={`group relative aspect-square w-full min-h-[48px] touch-manipulation overflow-hidden rounded-2xl border-2 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-red ${expanded ? 'border-accent-red' : 'border-border-color'}`}
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
                    <div className="absolute inset-0 flex items-center justify-center bg-bg-elevated">
                      <ImageOff className="h-8 w-8 text-text-muted" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/90 via-bg-primary/20 to-transparent" />
                  <h2 className="absolute bottom-2 left-2 right-2 text-sm sm:text-base font-black text-text-inverted tracking-tight line-clamp-2">
                    {realm}
                  </h2>
                  <span className="absolute top-2 left-2 rounded-full bg-bg-primary/70 px-2 py-0.5 text-xs font-mono text-text-inverted">
                    {realmMaps.length}
                  </span>
                </button>

                {showPanel && (
                  <div
                    id={`realm-panel-${realm}`}
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridColumn: '1 / -1', gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                  >
                    <div className="overflow-hidden">
                      <div className="space-y-4 rounded-2xl border border-border-color bg-bg-surface/50 p-3">
                        {(panelGroups ?? []).map((group) => (
                          <div key={group.realm} className="space-y-2">
                            {(panelGroups?.length ?? 0) > 1 && (
                              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wide">
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

      {/* `!== null` rather than a truthiness check: the id is an integer now,
          and a falsy check would swallow id 0 if the sequence ever issued it. */}
      {openMapId !== null && (
        <FullscreenMapEngine
          mapId={openMapId}
          availableMaps={maps}
          onClose={() => setOpenMapId(null)}
          backendBase={backendBase}
          dict={dict}
        />
      )}
    </div>
  );
};
