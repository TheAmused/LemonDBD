// frontend/src/hooks/useMapExplorerData.ts
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { MapRealm, Realm } from '@/types/map';
import { fetchMaps, fetchRealms } from '@/services/mapApi';

const SEARCH_MIN_CHARS = 3;
const SEARCH_DEBOUNCE_MS = 300;

export interface UseMapExplorerDataOptions {
  initialMapName?: string;
  selectedMap?: { mapName: string; timestamp: number } | string;
  onAvailableMapsLoaded?: (maps: MapRealm[]) => void;
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

  return maps.find(
    (m) =>
      m.name.toLowerCase().includes(needle) ||
      needle.includes(m.name.toLowerCase()) ||
      normalizeMapSearch(m.name) === normNeedle ||
      normalizeMapSearch(m.name).includes(normNeedle) ||
      normNeedle.includes(normalizeMapSearch(m.name))
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
  openMapId: string | null;
  setOpenMapId: (id: string | null) => void;
}

export function useMapExplorerData(options: UseMapExplorerDataOptions = {}): UseMapExplorerDataReturn {
  const { initialMapName = '', selectedMap, onAvailableMapsLoaded } = options;

  const [maps, setMaps] = useState<MapRealm[]>([]);
  const [realmImages, setRealmImages] = useState<Record<string, Realm>>({});
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
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
        setLoading(true);
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
    const targetMapName =
      typeof rawTarget === 'object' && rawTarget !== null ? rawTarget.mapName : rawTarget;
    if (!targetMapName || !targetMapName.trim() || maps.length === 0) return;

    const targetKey =
      typeof rawTarget === 'object' && rawTarget !== null
        ? `${rawTarget.mapName}:${rawTarget.timestamp}`
        : rawTarget;
    if (lastHandledTargetRef.current === targetKey) return;

    const match = findMapByName(maps, targetMapName);
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
