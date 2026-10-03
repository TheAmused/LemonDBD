// frontend/src/hooks/useSmashTaxonomies.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '@/utils/api';

const DEFAULT_ROLES = ['Survivor', 'Killer'];
const DEFAULT_GENDERS = ['female', 'male', 'monster_other'];
const STORAGE_KEY = 'lemondbd_smash_taxonomies_cache';

interface TaxonomiesState {
  roles: string[];
  genders: string[];
}

export function useSmashTaxonomies() {
  const [taxonomies, setTaxonomies] = useState<TaxonomiesState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed?.roles) && Array.isArray(parsed?.genders)) {
            return {
              roles: Array.from(new Set([...DEFAULT_ROLES, ...parsed.roles])),
              genders: Array.from(new Set([...DEFAULT_GENDERS, ...parsed.genders])),
            };
          }
        }
      } catch {
        // fallback
      }
    }
    return { roles: DEFAULT_ROLES, genders: DEFAULT_GENDERS };
  });

  const fetchTaxonomies = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/v1/smash-or-pass/taxonomies'));
      if (!res.ok) return;
      const json = await res.json();
      if (json?.data?.roles && json?.data?.genders) {
        const mergedRoles = Array.from(new Set([...DEFAULT_ROLES, ...json.data.roles]));
        const mergedGenders = Array.from(new Set([...DEFAULT_GENDERS, ...json.data.genders]));
        const next = { roles: mergedRoles, genders: mergedGenders };
        setTaxonomies(next);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // quota or private mode
        }
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
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // Best-effort sync with backend
    try {
      await fetch(apiUrl('/api/v1/smash-or-pass/taxonomies'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
