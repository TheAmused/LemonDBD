// frontend/src/hooks/useMapExplorerData.ts
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { MapRealm, Realm } from '@/types/map';
import { fetchMaps, fetchRealms, mapsCacheKey, realmsCacheKey } from '@/services/mapApi';
import { readCache } from '@/services/dataCache';

const SEARCH_MIN_CHARS = 3;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * A map selection request. `mapId` is set whenever the caller already knows which
 * map it wants - voice navigation resolves one - and is the only locale-safe way
 * to identify a map: the backend translates `name` per locale, so a name-only
 * request cannot be resolved on /de, /es, /pl or /ja.
 */
export interface SelectedMapRequest {
  mapName: string;
  mapId?: string;
  timestamp: number;
}

export interface UseMapExplorerDataOptions {
  initialMapName?: string;
  selectedMap?: SelectedMapRequest | string;
  onAvailableMapsLoaded?: (maps: MapRealm[]) => void;
}

export function normalizeMapSearch(s: string): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0142/gi, 'l')
    .toLowerCase()
    // Kana and CJK ideographs survive; the katakana middle dot and the double
    // hyphen do not, matching utils/mapVoiceMatcher.normalizeForComparison.
    // Stripping to [a-z0-9] reduced every Japanese map name to '' , at which
    // point every Japanese map compared equal to every other.
    .replace(/[^a-z0-9\u3041-\u3096\u30a1-\u30fa\u30fc\u3400-\u4dbf\u4e00-\u9fff]/g, '');
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

/**
 * Resolves a map from a spoken or typed name.
 *
 * Ordered from most to least certain. The previous single `find` mixed five
 * conditions in one predicate, so a two-way `includes` on a short name could
 * win over an exact match on a later map purely because of array order - and it
 * checked containment before equality.
 *
 * The id-slug pass is what makes this work outside English: map ids are built as
 * `hens_<realm slug>_<map slug>` from the English name and are never translated,
 * so an English canonical name still finds its map on /de/maps where every
 * `m.name` is German.
 */
export function findMapByName(maps: MapRealm[], targetMapName: string): MapRealm | undefined {
  if (!targetMapName || !targetMapName.trim() || !maps || maps.length === 0) return undefined;
  const normNeedle = normalizeMapSearch(targetMapName);
  if (!normNeedle) return undefined;

  const exact = maps.find((m) => normalizeMapSearch(m.name) === normNeedle);
  if (exact) return exact;

  // endsWith, not includes: `..._coal_tower_ii` must not answer to "Coal Tower".
  const byId = maps.find((m) => normalizeMapSearch(m.id).endsWith(normNeedle));
  if (byId) return byId;

  // Containment, longest candidate first so the most specific name wins.
  const contained = maps
    .filter((m) => {
      const normName = normalizeMapSearch(m.name);
      if (normName.length < 4 || normNeedle.length < 4) return false;
      return normNeedle.includes(normName) || normName.includes(normNeedle);
    })
    .sort((a, b) => normalizeMapSearch(b.name).length - normalizeMapSearch(a.name).length);

  return contained[0];
}

/** Resolves by id first, falling back to the name. Ids are locale-invariant. */
export function findMapForRequest(
  maps: MapRealm[],
  mapId: string | undefined,
  mapName: string
): MapRealm | undefined {
  if (mapId) {
    const byId = maps.find((m) => m.id === mapId);
    if (byId) return byId;
  }
  return findMapByName(maps, mapName);
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
  openMapId: string | null;
  setOpenMapId: (id: string | null) => void;
}

export function useMapExplorerData(options: UseMapExplorerDataOptions = {}): UseMapExplorerDataReturn {
  const { initialMapName = '', selectedMap, onAvailableMapsLoaded } = options;

  // Seed straight from the cache during the first render. Waiting for the
  // effect below would repaint the spinner for a frame on every return visit,
  // even though the data is already in memory.
  const cachedMaps = readCache<{ maps: MapRealm[] }>(mapsCacheKey('', 'hens333'))?.maps;

  const [maps, setMaps] = useState<MapRealm[]>(cachedMaps ?? []);
  const [realmImages, setRealmImages] = useState<Record<string, Realm>>(() => {
    const cached = readCache<{ realms: Realm[] }>(realmsCacheKey())?.realms;
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
  const [openMapId, setOpenMapId] = useState<string | null>(null);
  const lastHandledTargetRef = useRef<string | null>(null);

  const onAvailableMapsLoadedRef = useRef(onAvailableMapsLoaded);
  useEffect(() => {
    onAvailableMapsLoadedRef.current = onAvailableMapsLoaded;
  }, [onAvailableMapsLoaded]);

  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length > 0 && trimmed.length < SEARCH_MIN_CHARS) {
      setDebouncedSearch('');
      return;
    }
    const timeoutId = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    let isCancelled = false;
    async function loadMaps() {
      try {
        // Only show the spinner when there is genuinely nothing to display;
        // a cached result should swap in without a loading flash.
        if (readCache(mapsCacheKey(debouncedSearch, 'hens333')) === undefined) {
          setLoading(true);
        }
        const data = await fetchMaps(undefined, debouncedSearch, 'hens333');
        const loaded: MapRealm[] = data?.maps || [];
        if (!isCancelled) {
          setMaps(loaded);
          onAvailableMapsLoadedRef.current?.(loaded);
        }
      } catch (err) {
        console.error('Failed loading maps:', err);
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
  }, [debouncedSearch]);

  useEffect(() => {
    let isCancelled = false;
    async function loadRealms() {
      try {
        const data = await fetchRealms();
        if (!isCancelled) {
          const byName: Record<string, Realm> = {};
          (data?.realms || []).forEach((r) => {
            byName[r.name] = r;
          });
          setRealmImages(byName);
        }
      } catch (err) {
        console.error('Failed loading realm images:', err);
      }
    }
    loadRealms();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const rawTarget = selectedMap !== undefined ? selectedMap : initialMapName;
    const isRequest = typeof rawTarget === 'object' && rawTarget !== null;
    const targetMapName = isRequest ? rawTarget.mapName : rawTarget;
    const targetMapId = isRequest ? rawTarget.mapId : undefined;

    if (!targetMapId && (!targetMapName || !targetMapName.trim())) return;
    if (maps.length === 0) return;

    const targetKey = isRequest
      ? `${rawTarget.mapId || ''}:${rawTarget.mapName}:${rawTarget.timestamp}`
      : rawTarget;
    if (lastHandledTargetRef.current === targetKey) return;

    const match = findMapForRequest(maps, targetMapId, targetMapName);
    if (match) {
      setOpenMapId(match.id);
      lastHandledTargetRef.current = targetKey;
    }
  }, [initialMapName, selectedMap, maps]);

  const groupedMapsByRealm = useMemo(() => groupMapsByRealmSorted(maps), [maps]);

  return {
    maps,
    loading,
    search,
    setSearch,
    activeSearch: debouncedSearch,
    groupedMapsByRealm,
    realmImages,
    openMapId,
    setOpenMapId,
  };
}
