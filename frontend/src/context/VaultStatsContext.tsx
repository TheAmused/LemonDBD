// frontend/src/context/VaultStatsContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { fetchCached, fetchJson } from '@/services/dataCache';

/** Counts move on patch days; an hour of staleness is fine. */
const STATS_TTL_MS = 60 * 60 * 1000;

export interface VaultStats {
  totalPerksCount: number;
  survivorCount: number;
  killerCount: number;
  characterCount: number;
}

const EMPTY_STATS: VaultStats = {
  totalPerksCount: 0,
  survivorCount: 0,
  killerCount: 0,
  characterCount: 0,
};

const VaultStatsContext = createContext<VaultStats>(EMPTY_STATS);

/**
 * Backed by the shared dataCache, so the fallback path below shares its keys
 * (and therefore its in-flight requests and its cached results) with the perk
 * vault, the roster and the randomizer -- whichever page loads first pays.
 */
async function loadVaultStats(): Promise<VaultStats> {
  const backendBase = getBackendBaseUrl();
  const summaryKey = `${backendBase}/api/v1/stats/summary`;

  // Preferred path: a ~100 byte counts endpoint.
  try {
    const json = await fetchCached<any>(summaryKey, () => fetchJson(summaryKey), {
      ttlMs: STATS_TTL_MS,
    });
    if (json?.perks) {
      return {
        totalPerksCount: json.perks.total ?? 0,
        survivorCount: json.perks.survivor ?? 0,
        killerCount: json.perks.killer ?? 0,
        characterCount: json.characters?.total ?? 0,
      };
    }
  } catch {
    // Fall through to the legacy path below.
  }

  // Fallback for a backend that predates /api/v1/stats/summary. Same cache keys
  // the pages use, so on a warm cache this costs nothing.
  try {
    const perksKey = `${backendBase}/api/v1/perks?limit=1000`;
    const charsKey = `${backendBase}/api/v1/characters`;
    const [pData, cData] = await Promise.all([
      fetchCached<any>(perksKey, () => fetchJson(perksKey), { ttlMs: STATS_TTL_MS }),
      fetchCached<any>(charsKey, () => fetchJson(charsKey), { ttlMs: STATS_TTL_MS }),
    ]);

    const list: Array<{ category?: string }> = pData?.data || [];
    return {
      totalPerksCount: pData?.pagination?.total || list.length,
      survivorCount: list.filter((p) => p.category === 'Survivor').length,
      killerCount: list.filter((p) => p.category === 'Killer').length,
      characterCount: cData?.count || (cData?.data || []).length,
    };
  } catch (err) {
    console.error('Failed to load sidebar vault stats:', err);
    return EMPTY_STATS;
  }
}

/**
 * Fetches the sidebar's perk/character counts once for the whole app.
 *
 * Fifteen separate files used to run this exact `perks?limit=1000` +
 * `characters` pair in their own `useEffect`, so every navigation re-downloaded
 * the full perk table to render three numbers that never change between pages.
 */
export const VaultStatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<VaultStats>(EMPTY_STATS);

  useEffect(() => {
    let active = true;
    loadVaultStats().then((next) => {
      if (active) setStats(next);
    });
    return () => {
      active = false;
    };
  }, []);

  return <VaultStatsContext value={stats}>{children}</VaultStatsContext>;
};

export function useVaultStats(): VaultStats {
  return useContext(VaultStatsContext);
}
