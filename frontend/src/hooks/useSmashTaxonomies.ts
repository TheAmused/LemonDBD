// frontend/src/hooks/useSmashTaxonomies.ts
'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { apiUrl, authHeaders } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { readStoredItem, useStoredItem, writeStoredItem } from '@/hooks/useStoredItem';

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

/** This browser's term cache, or null when there is none (or it holds junk). */
function parseTaxonomies(raw: string | null): TaxonomiesState | null {
  try {
    const parsed = JSON.parse(raw ?? 'null');
    if (Array.isArray(parsed?.roles) && Array.isArray(parsed?.genders)) {
      return {
        roles: withDefaults(DEFAULT_ROLES, parsed.roles),
        genders: withDefaults(DEFAULT_GENDERS, parsed.genders),
      };
    }
  } catch {
    // junk in storage
  }
  return null;
}

function storeTaxonomies(state: TaxonomiesState): void {
  writeStoredItem(STORAGE_KEY, JSON.stringify(state));
}

export function useSmashTaxonomies() {
  const { isAdmin } = useAuth();
  // The defaults on the server and during hydration (useStoredItem), then this browser's cache.
  const [stored] = useStoredItem(STORAGE_KEY);
  const taxonomies = useMemo(() => parseTaxonomies(stored) ?? DEFAULT_STATE, [stored]);

  const fetchTaxonomies = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/v1/smash-or-pass/taxonomies'));
      if (!res.ok) return;
      const json = await res.json();
      if (json?.data?.roles && json?.data?.genders) {
        // Merged, not replaced: terms added in this browser must not vanish from the filters.
        const local = parseTaxonomies(readStoredItem(STORAGE_KEY)) ?? DEFAULT_STATE;
        storeTaxonomies({
          roles: withDefaults(DEFAULT_ROLES, json.data.roles, local.roles),
          genders: withDefaults(DEFAULT_GENDERS, json.data.genders, local.genders),
        });
      }
    } catch {
      // Best-effort: failure here is non-fatal.
    }
  }, []);

  useEffect(() => {
    void fetchTaxonomies();
  }, [fetchTaxonomies]);

  const registerTerm = useCallback(async (type: 'role' | 'gender', name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Store it at once so the filters show it immediately.
    const current = parseTaxonomies(readStoredItem(STORAGE_KEY)) ?? DEFAULT_STATE;
    const key = type === 'role' ? 'roles' : 'genders';
    if (!current[key].includes(trimmed)) {
      storeTaxonomies({ ...current, [key]: [...current[key], trimmed] });
    }

    // Only an admin's term joins the shared list every visitor's filters show; anyone else's stays
    // in this browser's term cache (above) and in their own roster.
    if (!isAdmin) return;
    try {
      await fetch(apiUrl('/api/v1/smash-or-pass/taxonomies'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ type, name: trimmed }),
      });
    } catch {
      // Offline or network error; local state already updated
    }
  }, [isAdmin]);

  return {
    roles: taxonomies.roles,
    genders: taxonomies.genders,
    registerTerm,
    refreshTaxonomies: fetchTaxonomies,
  };
}
