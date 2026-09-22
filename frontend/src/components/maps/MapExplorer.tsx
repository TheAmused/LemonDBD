'use client';
// frontend/src/components/maps/MapExplorer.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, ImageOff, Compass, Maximize2, ArrowDownAZ, X } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { MapRealm } from '@/types/map';
import { useMapExplorerData } from '@/hooks/useMapExplorerData';
import { useResponsiveGridColumns } from '@/hooks/useResponsiveGridColumns';
import { usePersistentString } from '@/hooks/usePersistentString';
import {
  filterAndSortRealmGroups,
  getLayoutTypeLabel,
  getLayoutTypeOptions,
  getMapImageSrc,
  hasActiveMapFilters,
  type MapAttributeFilters,
  type MapSizeBucket,
  type MapSortOrder,
} from '@/utils/mapUtils';
import { CustomDropdown, type DropdownOption } from '@/components/common/CustomDropdown';
import { MapCard } from './MapCard';

// Sentinel dropdown value for "no filter"; real attribute values never collide with it.
// Also what "no filter" persists as in localStorage, since the filter fields
// themselves are `string | null` and usePersistentString only stores strings.
const ANY = '__any__';
// Sentinel for "no realm expanded" in persisted storage; a real realm name never collides with it.
const NONE = '__none__';

const isValidLayoutFilter = (v: string): v is string =>
  v === ANY || v === 'Indoor' || v === 'Outdoor' || v === 'Hybrid';
const isValidSizeFilter = (v: string): v is MapSizeBucket | typeof ANY =>
  v === ANY || v === 'small' || v === 'medium' || v === 'large';
const isValidSortOrder = (v: string): v is MapSortOrder => v === 'az' || v === 'za';

const FullscreenMapEngine = dynamic(
  () => import('./FullscreenMapEngine').then((m) => m.FullscreenMapEngine),
  { ssr: false }
);

// Must mirror the grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 classes below.
const REALM_GRID_BREAKPOINTS: { minWidth: number; columns: number }[] = [
  { minWidth: 1024, columns: 6 },
  { minWidth: 768, columns: 5 },
  { minWidth: 640, columns: 4 },
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
  /** Optional mode switcher (e.g. Search / Voice ToggleSwitch) rendered centered at the top of the command deck */
  modeSwitcherSlot?: React.ReactNode;
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
  modeSwitcherSlot,
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

  // Persisted so a refresh reopens whichever realm you had expanded. Stored
  // as a plain string (NONE sentinel for "nothing open") since a realm name
  // isn't a fixed enum to validate against -- a stale name just harmlessly
  // matches nothing in isRealmExpanded below.
  const [expandedRealmRaw, setExpandedRealmRaw] = usePersistentString<string>('lemondbd_maps_expanded_realm', NONE);
  const expandedRealm = expandedRealmRaw === NONE ? null : expandedRealmRaw;
  // Persisted: these are genuine preferences (which layout/size you're
  // usually looking for, how you like the list sorted), not per-visit
  // state, so they survive a refresh. Stored as plain strings (ANY sentinel
  // for "no filter") since that's all usePersistentString handles; `filters`
  // below is the `MapAttributeFilters` shape the rest of this file expects.
  const [layoutTypeRaw, setLayoutTypeRaw] = usePersistentString(
    'lemondbd_maps_filter_layout',
    ANY,
    isValidLayoutFilter
  );
  const [sizeRaw, setSizeRaw] = usePersistentString(
    'lemondbd_maps_filter_size',
    ANY as MapSizeBucket | typeof ANY,
    isValidSizeFilter
  );
  const [sortOrder, setSortOrder] = usePersistentString(
    'lemondbd_maps_sort_order',
    'az' as MapSortOrder,
    isValidSortOrder
  );
  const filters: MapAttributeFilters = useMemo(
    () => ({
      layoutType: layoutTypeRaw === ANY ? null : layoutTypeRaw,
      size: sizeRaw === ANY ? null : sizeRaw,
    }),
    [layoutTypeRaw, sizeRaw]
  );
  const clearFilters = () => {
    setLayoutTypeRaw(ANY);
    setSizeRaw(ANY);
  };
  const columns = useResponsiveGridColumns(REALM_GRID_BREAKPOINTS, 3);
  const filtersActive = hasActiveMapFilters(filters);

  // Deliberately do not clear search or filters when toggling modes;
  // doing so causes synchronous localStorage writes, realm re-filtering,
  // and animation timer cascades that freeze the UI on rapid switching.

  const mapsDict = dict?.maps;
  const layoutOptions: DropdownOption[] = useMemo(
    () => [
      { value: ANY, label: mapsDict?.filterAnyLayout || 'Any layout' },
      ...getLayoutTypeOptions(maps).map((v) => ({ value: v, label: getLayoutTypeLabel(v, mapsDict) })),
    ],
    [maps, mapsDict]
  );
  const sizeOptions: DropdownOption<MapSizeBucket | typeof ANY>[] = [
    { value: ANY, label: mapsDict?.filterAnySize || 'Any size' },
    { value: 'small', label: mapsDict?.sizeSmall || 'Small', sublabel: mapsDict?.sizeSmallHint || 'under 9000 m²' },
    { value: 'medium', label: mapsDict?.sizeMedium || 'Medium', sublabel: mapsDict?.sizeMediumHint || '9000 to 9999 m²' },
    { value: 'large', label: mapsDict?.sizeLarge || 'Large', sublabel: mapsDict?.sizeLargeHint || '10000 m² and up' },
  ];
  const sortOptions: DropdownOption<MapSortOrder>[] = [
    { value: 'az', label: mapsDict?.sortAz || 'Name A to Z' },
    { value: 'za', label: mapsDict?.sortZa || 'Name Z to A' },
  ];

  const isSearching = activeSearch.trim().length > 0;
  const isRealmExpanded = (realm: string) => isSearching || expandedRealm === realm;

  const pendingOpenRef = useRef<string | null>(null);
  const toggleRealm = (realm: string) => {
    setExpandedRealmRaw((prev) => {
      if (prev === realm) {
        pendingOpenRef.current = null;
        return NONE;
      }
      if (prev !== NONE) {
        pendingOpenRef.current = realm;
        return NONE;
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
            setExpandedRealmRaw(next);
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
      <section
        aria-label={dict?.maps?.pageTitle || 'Tactical Map Command'}
        className="relative flex w-full flex-col justify-center overflow-hidden rounded-3xl border border-border-color bg-bg-surface p-4 sm:p-6 md:min-h-[14.5rem] backdrop-blur-xl shadow-xl dark:shadow-2xl transition-all duration-300"
      >
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-accent-red/5 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-accent-red/5 blur-3xl" />

        <div className="relative z-10 grid grid-cols-[minmax(0,1fr)] items-center">
          <div
            className={`[grid-area:1/1] flex flex-col justify-center space-y-4 transition-opacity duration-200 ${
              hideSearch ? 'invisible pointer-events-none opacity-0' : 'visible opacity-100'
            }`}
          >
            {modeSwitcherSlot && (
              <div className="relative z-20 flex flex-col md:flex-row items-center justify-between gap-3 w-full mb-2">
                <div className="hidden md:flex md:flex-1" />
                <div className="flex items-center justify-center shrink-0">
                  {modeSwitcherSlot}
                </div>
                <div className="hidden md:flex md:flex-1" />
              </div>
            )}

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
            <div
              className="flex flex-wrap items-center justify-center gap-2"
              data-testid="map-filters"
              inert={hideSearch}
            >
              <CustomDropdown
                value={layoutTypeRaw}
                onChange={setLayoutTypeRaw}
                options={layoutOptions}
                icon={<Compass className="h-3.5 w-3.5" />}
                ariaLabel={mapsDict?.layoutLabel || 'Layout'}
                label={
                  filters.layoutType == null ? (
                    <>
                      <span className="hidden sm:inline">{mapsDict?.filterAnyLayout || 'Any layout'}</span>
                      <span className="sm:hidden">{mapsDict?.layoutLabel || 'Layout'}</span>
                    </>
                  ) : undefined
                }
              />
              <CustomDropdown
                value={sizeRaw}
                onChange={setSizeRaw}
                options={sizeOptions}
                icon={<Maximize2 className="h-3.5 w-3.5" />}
                ariaLabel={mapsDict?.surfaceArea || 'Surface Area'}
                minWidthClass="min-w-[220px]"
                label={
                  filters.size == null ? (
                    <>
                      <span className="hidden sm:inline">{mapsDict?.filterAnySize || 'Any size'}</span>
                      <span className="sm:hidden">{mapsDict?.sizeLabel || 'Size'}</span>
                    </>
                  ) : undefined
                }
              />
              <CustomDropdown
                value={sortOrder}
                onChange={setSortOrder}
                options={sortOptions}
                icon={<ArrowDownAZ className="h-3.5 w-3.5" />}
                ariaLabel={mapsDict?.sortAria || 'Sort maps'}
                align="right"
                label={
                  <>
                    <span className="hidden sm:inline">
                      {sortOrder === 'az' ? mapsDict?.sortAz || 'Name A to Z' : mapsDict?.sortZa || 'Name Z to A'}
                    </span>
                    <span className="sm:hidden">
                      {sortOrder === 'az' ? mapsDict?.sortAzShort || 'A-Z' : mapsDict?.sortZaShort || 'Z-A'}
                    </span>
                  </>
                }
              />
              {filtersActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl px-3 py-2 text-xs font-mono font-bold text-text-secondary transition-colors hover:bg-bg-elevated hover:text-accent-red"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  {mapsDict?.clearFilters || 'Clear filters'}
                </button>
              )}
            </div>
          </div>

          {voiceSlot && (
            <div
              className={`[grid-area:1/1] flex flex-col justify-center transition-opacity duration-200 ${
                hideSearch ? 'visible opacity-100' : 'invisible pointer-events-none opacity-0'
              }`}
            >
              {voiceSlot}
            </div>
          )}
        </div>
      </section>

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
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
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
                  className={`group relative aspect-square w-full min-h-[48px] touch-manipulation overflow-hidden rounded-2xl border-2 text-left cursor-pointer transition-transform duration-200 hover:scale-[1.03] active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-red ${expanded ? 'border-accent-red' : 'border-border-color hover:border-accent-red/60'}`}
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
                  <div className="absolute inset-0 bg-gradient-to-b from-bg-primary/90 via-bg-primary/20 to-transparent" />
                  <h2 className="absolute top-2 left-2 right-2 text-center text-sm sm:text-base font-black text-text-inverted tracking-tight line-clamp-2">
                    {realm}
                  </h2>
                  <span className="absolute bottom-2 right-2 rounded-full bg-bg-primary/70 px-2 py-0.5 text-xs font-mono text-text-inverted">
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
                            <div className="grid grid-cols-3 gap-2 justify-items-center sm:flex sm:flex-wrap sm:justify-start sm:gap-3">
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
