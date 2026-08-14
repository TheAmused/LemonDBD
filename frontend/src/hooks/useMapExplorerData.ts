'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapRealm } from '@/types/map';
import { fetchMaps, fetchMapDetail } from '@/services/mapApi';
import { getVariantsForMap } from '@/utils/mapVoiceMatcher';

export type MapSource = 'all' | 'hens333' | 'samoelcolt';

export interface UseMapExplorerDataOptions {
  initialMapName?: string;
  selectedMap?: { mapName: string; timestamp: number } | string;
  selectedSource?: MapSource;
  onSourceChange?: (source: MapSource) => void;
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

export function groupMapsByRealm(maps: MapRealm[]): Record<string, MapRealm[]> {
  const grouped: Record<string, MapRealm[]> = {};
  if (!maps || !Array.isArray(maps)) return grouped;
  maps.forEach((m) => {
    const realm = m.realm || 'Unknown';
    if (!grouped[realm]) {
      grouped[realm] = [];
    }
    grouped[realm].push(m);
  });
  return grouped;
}

export function extractUniqueRealms(maps: MapRealm[]): string[] {
  if (!maps || !Array.isArray(maps)) return [];
  const realmSet = new Set<string>();
  maps.forEach((m) => {
    if (m.realm) realmSet.add(m.realm);
  });
  return Array.from(realmSet).sort();
}

export function findMapByNameAndSource(
  maps: MapRealm[],
  targetMapName: string,
  activeSource: MapSource = 'all'
): MapRealm | undefined {
  if (!targetMapName || !targetMapName.trim() || !maps || maps.length === 0) return undefined;
  const needle = targetMapName.toLowerCase().trim();
  const normNeedle = normalizeMapSearch(needle);

  // Priority 1: Match within active source
  if (activeSource !== 'all') {
    const matchInSource = maps.find(
      (m) =>
        m.source === activeSource &&
        (m.name.toLowerCase().includes(needle) ||
          needle.includes(m.name.toLowerCase()) ||
          normalizeMapSearch(m.name) === normNeedle ||
          normalizeMapSearch(m.name).includes(normNeedle) ||
          normNeedle.includes(normalizeMapSearch(m.name)))
    );
    if (matchInSource) return matchInSource;
  }

  // Priority 2: Match across any source in loaded maps
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
  setMaps: React.Dispatch<React.SetStateAction<MapRealm[]>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  activeMap: MapRealm | null;
  setActiveMap: React.Dispatch<React.SetStateAction<MapRealm | null>>;
  selectedMapId: string;
  setSelectedMapId: React.Dispatch<React.SetStateAction<string>>;
  selectedRealm: string;
  setSelectedRealm: (realm: string) => void;
  search: string;
  setSearch: (search: string) => void;
  activeSource: MapSource;
  setActiveSource: (source: MapSource) => void;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  uniqueRealms: string[];
  groupedMaps: Record<string, MapRealm[]>;
  variants: string[];
  selectMapById: (id: string) => void;
  selectVariantByName: (variantName: string) => void;
}

export function useMapExplorerData(options: UseMapExplorerDataOptions = {}): UseMapExplorerDataReturn {
  const {
    initialMapName = '',
    selectedMap,
    selectedSource: propSelectedSource,
    onSourceChange,
    onAvailableMapsLoaded,
  } = options;

  const [maps, setMaps] = useState<MapRealm[]>([]);
  const [selectedRealm, setSelectedRealm] = useState<string>('all');
  const [internalSource, setInternalSource] = useState<MapSource>(propSelectedSource || 'hens333');
  const [selectedMapId, setSelectedMapId] = useState<string>('hens_azarovs_resting_place');
  const [activeMap, setActiveMap] = useState<MapRealm | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const onAvailableMapsLoadedRef = useRef(onAvailableMapsLoaded);
  useEffect(() => {
    onAvailableMapsLoadedRef.current = onAvailableMapsLoaded;
  }, [onAvailableMapsLoaded]);

  const activeSource = propSelectedSource !== undefined ? propSelectedSource : internalSource;

  useEffect(() => {
    if (propSelectedSource !== undefined) {
      setInternalSource(propSelectedSource);
    }
  }, [propSelectedSource]);

  const setActiveSource = useCallback(
    (source: MapSource) => {
      setInternalSource(source);
      onSourceChange?.(source);
    },
    [onSourceChange]
  );

  // Fetch maps list on realm/search/source change
  useEffect(() => {
    let isCancelled = false;
    async function loadMaps() {
      try {
        setLoading(true);
        const data = await fetchMaps(selectedRealm, search, activeSource);
        const loaded: MapRealm[] = data?.maps || [];
        if (!isCancelled) {
          setMaps(loaded);
          onAvailableMapsLoadedRef.current?.(loaded);

          if (loaded.length > 0) {
            setSelectedMapId((prevId) =>
              !loaded.some((m) => m.id === prevId) ? loaded[0].id : prevId
            );
          }
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
  }, [selectedRealm, search, activeSource]);

  // Handle initialMapName / selectedMap changes: search maps matching name & active source, select, and open detail modal
  useEffect(() => {
    const rawTarget = selectedMap !== undefined ? selectedMap : initialMapName;
    const targetMapName =
      typeof rawTarget === 'object' && rawTarget !== null ? rawTarget.mapName : rawTarget;
    if (!targetMapName || !targetMapName.trim() || maps.length === 0) return;

    const match = findMapByNameAndSource(maps, targetMapName, activeSource);
    if (match) {
      setSelectedMapId(match.id);
      setIsDetailModalOpen(true);
    }
  }, [initialMapName, selectedMap, maps, activeSource]);

  // Load Map Detail when selectedMapId changes
  useEffect(() => {
    if (!selectedMapId) return;
    let isCancelled = false;
    async function loadDetail() {
      try {
        const data = await fetchMapDetail(selectedMapId);
        if (!isCancelled) {
          setActiveMap(data?.map || null);
        }
      } catch (err) {
        console.error('Failed loading map detail:', err);
      }
    }
    loadDetail();
    return () => {
      isCancelled = true;
    };
  }, [selectedMapId]);

  // Extract unique realms
  const uniqueRealms = useMemo(() => extractUniqueRealms(maps), [maps]);

  // Group maps by realm
  const groupedMaps = useMemo(() => groupMapsByRealm(maps), [maps]);

  // Map variants for active map
  const variants = useMemo(() => {
    if (!activeMap) return [];
    return getVariantsForMap(activeMap.name);
  }, [activeMap]);

  const selectMapById = useCallback((id: string) => {
    setSelectedMapId(id);
  }, []);

  const selectVariantByName = useCallback(
    (variantName: string) => {
      if (!activeMap || maps.length === 0) return;
      const match = findMapByNameAndSource(maps, variantName, activeMap.source as MapSource);
      if (match) {
        setSelectedMapId(match.id);
      }
    },
    [activeMap, maps]
  );

  return {
    maps,
    setMaps,
    loading,
    setLoading,
    activeMap,
    setActiveMap,
    selectedMapId,
    setSelectedMapId,
    selectedRealm,
    setSelectedRealm,
    search,
    setSearch,
    activeSource,
    setActiveSource,
    isDetailModalOpen,
    setIsDetailModalOpen,
    uniqueRealms,
    groupedMaps,
    variants,
    selectMapById,
    selectVariantByName,
  };
}
