// frontend/src/hooks/useSmashTaxonomies.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiUrl, authHeaders } from '@/utils/api';

const DEFAULT_ROLES = ['Survivor', 'Killer'];
const DEFAULT_GENDERS = ['female', 'male', 'monster_other'];
const STORAGE_KEY = 'lemondbd_smash_taxonomies_cache';

interface TaxonomiesState {
  roles: string[];
  genders: string[];
}

const DEFAULT_STATE: TaxonomiesState = { roles: DEFAULT_ROLES, genders: DEFAULT_GENDERS };

/** The defaults, then every term from `lists` in order, without repeats. */
function withDefaults(defaults: string[], ...lists: string[][]): string[] {
  return Array.from(new Set([...defaults, ...lists.flat()]));
}

/** This browser's term cache, or null when there is none (or storage is unavailable). */
function readStoredTaxonomies(): TaxonomiesState | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Array.isArray(parsed?.roles) && Array.isArray(parsed?.genders)) {
      return {
        roles: withDefaults(DEFAULT_ROLES, parsed.roles),
        genders: withDefaults(DEFAULT_GENDERS, parsed.genders),
      };
    }
  } catch {
    // no storage, or junk in it
  }
  return null;
}

function storeTaxonomies(state: TaxonomiesState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota or private mode
  }
}

export function useSmashTaxonomies() {
  // The defaults render first, on the server and in the first client render
  // alike; the stored list is read in an effect so a browser that holds custom
  // terms does not hydrate into different markup.
  const [taxonomies, setTaxonomies] = useState<TaxonomiesState>(DEFAULT_STATE);

  useEffect(() => {
    const stored = readStoredTaxonomies();
    if (stored) setTaxonomies(stored);
  }, []);

  const fetchTaxonomies = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/v1/smash-or-pass/taxonomies'));
      if (!res.ok) return;
      const json = await res.json();
      if (json?.data?.roles && json?.data?.genders) {
        // Merged with this browser's own terms rather than replacing them: a
        // role or gender added here lives in the term cache until the server
        // list catches up, and must not vanish from the filters meanwhile.
        const local = readStoredTaxonomies() ?? DEFAULT_STATE;
        const next = {
          roles: withDefaults(DEFAULT_ROLES, json.data.roles, local.roles),
          genders: withDefaults(DEFAULT_GENDERS, json.data.genders, local.genders),
        };
        setTaxonomies(next);
        storeTaxonomies(next);
      }
    } catch {
      // Best-effort: failure here is non-fatal.
    }
  }, []);

  useEffect(() => {
    fetchTaxonomies();
  }, [fetchTaxonomies]);

  const registerTerm = useCallback(async (type: 'role' | 'gender', name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Immediately update local state so user gets instant UI feedback
    setTaxonomies((prev) => {
      const key = type === 'role' ? 'roles' : 'genders';
      if (prev[key].includes(trimmed)) return prev;
      const nextList = [...prev[key], trimmed];
      const next = { ...prev, [key]: nextList };
      storeTaxonomies(next);
      return next;
    });

    // Best-effort sync with backend
    try {
      await fetch(apiUrl('/api/v1/smash-or-pass/taxonomies'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ type, name: trimmed }),
      });
    } catch {
      // Offline or network error; local state already updated
    }
  }, []);

  return {
    roles: taxonomies.roles,
    genders: taxonomies.genders,
    registerTerm,
    refreshTaxonomies: fetchTaxonomies,
  };
}
