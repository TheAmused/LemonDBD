// frontend/src/hooks/useMapExplorerData.ts
'use client';

import { logger } from '@/utils/logger';
import { SEARCH_DEBOUNCE_MS } from '@/constants/timing';
import { useState, useEffect, useMemo, useRef } from 'react';
import { MapRealm, Realm } from '@/types/map';
import { fetchMaps, fetchRealms, mapsCacheKey, realmsCacheKey } from '@/services/mapApi';
import { readCache } from '@/services/dataCache';

const SEARCH_MIN_CHARS = 3;

export interface UseMapExplorerDataOptions {
  initialMapName?: string;
  selectedMap?: { mapName: string; mapId?: number; timestamp: number; via?: 'voice' | 'link' } | string;
  onAvailableMapsLoaded?: (maps: MapRealm[]) => void;
  /** Called when a map opens by itself (a voice command or a `?mapName=` link), not from a card click. */
  onAutoOpen?: (map: MapRealm, via: 'voice' | 'link') => void;
  locale?: string;
}

export function normalizeMapSearch(s: string): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function groupMapsByRealmSorted(maps: MapRealm[]): { realm: string; maps: MapRealm[] }[] {
  if (!maps || !Array.isArray(maps)) return [];
  const grouped: Record<string, MapRealm[]> = {};
  maps.forEach((m) => {
    const realm = m.realm || 'Unknown';
    if (!grouped[realm]) {
      grouped[realm] = [];
    }
    grouped[realm].push(m);
  });
  return Object.keys(grouped)
    .sort((a, b) => a.localeCompare(b))
    .map((realm) => ({ realm, maps: grouped[realm] }));
}

export function findMapByName(maps: MapRealm[], targetMapName: string): MapRealm | undefined {
  if (!targetMapName || !targetMapName.trim() || !maps || maps.length === 0) return undefined;
  const needle = targetMapName.toLowerCase().trim();
  const normNeedle = normalizeMapSearch(needle);
  // An empty normalized needle matches every string via includes('') — reject it
  // (this happens for all-Japanese strings which normalize to empty).
  if (!normNeedle) return undefined;

  return maps.find(
    (m) =>
      m.name.toLowerCase().includes(needle) ||
      needle.includes(m.name.toLowerCase()) ||
      normalizeMapSearch(m.name) === normNeedle ||
      normalizeMapSearch(m.name).includes(normNeedle) ||
      normNeedle.includes(normalizeMapSearch(m.name)) ||
      // Also check raw_name (English canonical) for voice commands on non-English locales
      (m.raw_name ? normalizeMapSearch(m.raw_name).includes(normNeedle) : false) ||
      (m.raw_name ? normNeedle.includes(normalizeMapSearch(m.raw_name)) && normNeedle.length >= 3 : false)
  );
}

export interface UseMapExplorerDataReturn {
  maps: MapRealm[];
  loading: boolean;
  search: string;
  setSearch: (search: string) => void;
  /** Debounced, 3-char-minimum value actually sent to the backend; unlike `search`, safe to treat as "search is active". */
  activeSearch: string;
  groupedMapsByRealm: { realm: string; maps: MapRealm[] }[];
  realmImages: Record<string, Realm>;
  openMapId: number | null;
  setOpenMapId: (id: number | null) => void;
  allMaps?: MapRealm[];
}

export function useMapExplorerData(options: UseMapExplorerDataOptions = {}): UseMapExplorerDataReturn {
  const { initialMapName = '', selectedMap, onAvailableMapsLoaded, onAutoOpen, locale } = options;

  // Seed straight from the cache during the first render. Waiting for the
  // effect below would repaint the spinner for a frame on every return visit,
  // even though the data is already in memory.
  const cachedMaps = readCache<{ maps: MapRealm[] }>(mapsCacheKey('', 'hens333', undefined, locale))?.maps;

  const [maps, setMaps] = useState<MapRealm[]>(cachedMaps ?? []);
  const [realmImages, setRealmImages] = useState<Record<string, Realm>>(() => {
    const cached = readCache<{ realms: Realm[] }>(realmsCacheKey(locale))?.realms;
    if (!cached) return {};
    const byName: Record<string, Realm> = {};
    cached.forEach((r) => {
      byName[r.name] = r;
    });
    return byName;
  });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(cachedMaps === undefined);
  const [openMapId, setOpenMapId] = useState<number | null>(null);

  const onAvailableMapsLoadedRef = useRef(onAvailableMapsLoaded);
  useEffect(() => {
    onAvailableMapsLoadedRef.current = onAvailableMapsLoaded;
  }, [onAvailableMapsLoaded]);

  const onAutoOpenRef = useRef(onAutoOpen);
  useEffect(() => {
    onAutoOpenRef.current = onAutoOpen;
  }, [onAutoOpen]);

  // Below the minimum length there is no search at once; otherwise it settles after the debounce.
  const trimmedSearch = search.trim();
  const searchTooShort = trimmedSearch.length > 0 && trimmedSearch.length < SEARCH_MIN_CHARS;
  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(searchTooShort ? '' : search), searchTooShort ? 0 : SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [search, searchTooShort]);
  const settledSearch = searchTooShort ? '' : debouncedSearch;

  useEffect(() => {
    let isCancelled = false;
    async function loadMaps() {
      try {
        // Only show the spinner when there is genuinely nothing to display;
        // a cached result should swap in without a loading flash.
        if (readCache(mapsCacheKey('', 'hens333', undefined, locale)) === undefined) {
          setLoading(true);
        }
        // Fetch the full list once; filtering is done client-side (M4: backend only
        // searches the English name column, so non-English searches produce 0 results)
        const data = await fetchMaps(undefined, '', 'hens333', locale);
        const loaded: MapRealm[] = data?.maps || [];
        if (!isCancelled) {
          setMaps(loaded);
          onAvailableMapsLoadedRef.current?.(loaded);
        }
      } catch (err) {
        logger.error('Failed loading maps:', err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }
    loadMaps();
    return () => {
      isCancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    let isCancelled = false;
    async function loadRealms() {
      try {
        const data = await fetchRealms(locale);
        if (!isCancelled) {
          const byName: Record<string, Realm> = {};
          (data?.realms || []).forEach((r) => {
            byName[r.name] = r;
          });
          setRealmImages(byName);
        }
      } catch (err) {
        logger.error('Failed loading realm images:', err);
      }
    }
    loadRealms();
    return () => {
      isCancelled = true;
    };
  }, [locale]);

  // A link or voice command names a map to open. It is handled once per target (a voice command can
  // repeat itself), while rendering, so the map opens in the same paint; reopening the map that is
  // already open is not an open, so only a real one is reported through onAutoOpen.
  const rawTarget = selectedMap !== undefined ? selectedMap : initialMapName;
  const rawObj = typeof rawTarget === 'object' && rawTarget !== null ? rawTarget : null;
  const targetMapName = typeof rawTarget === 'object' && rawTarget !== null ? rawTarget.mapName : rawTarget;
  const hasTarget = (!!targetMapName && !!targetMapName.trim()) || !!rawObj?.mapId;
  const targetKey =
    !hasTarget || maps.length === 0
      ? null
      : typeof rawTarget === 'object' && rawTarget !== null
        ? `${rawTarget.mapName}::${rawTarget.timestamp}`
        : rawTarget;
  const [handledTargetKey, setHandledTargetKey] = useState<string | null>(null);
  const [autoOpened, setAutoOpened] = useState<{ map: MapRealm; via: 'voice' | 'link' } | null>(null);
  if (targetKey !== null && targetKey !== handledTargetKey) {
    // Prefer a direct id lookup (set by voice commands on non-English locales) over name matching.
    const directId = rawObj?.mapId as number | undefined;
    const match = directId ? maps.find((m) => m.id === directId) : findMapByName(maps, targetMapName ?? '');
    if (match) {
      setHandledTargetKey(targetKey);
      if (openMapId !== match.id) {
        setOpenMapId(match.id);
        setAutoOpened({ map: match, via: rawObj ? rawObj.via ?? 'link' : 'link' });
      }
    }
  }

  useEffect(() => {
    if (autoOpened) onAutoOpenRef.current?.(autoOpened.map, autoOpened.via);
  }, [autoOpened]);

  const filteredMaps = useMemo(() => {
    if (!settledSearch || settledSearch.length < SEARCH_MIN_CHARS) return maps;
    const needle = normalizeMapSearch(settledSearch);
    if (!needle) return maps;
    return maps.filter(
      (m) =>
        normalizeMapSearch(m.name).includes(needle) ||
        (m.raw_name ? normalizeMapSearch(m.raw_name).includes(needle) : false)
    );
  }, [maps, settledSearch]);

  const groupedMapsByRealm = useMemo(() => groupMapsByRealmSorted(filteredMaps), [filteredMaps]);

  return {
    maps: filteredMaps,
    allMaps: maps,
    loading,
    search,
    setSearch,
    activeSearch: settledSearch,
    groupedMapsByRealm,
    realmImages,
    openMapId,
    setOpenMapId,
  };
}
