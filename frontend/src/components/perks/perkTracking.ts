'use client';
// frontend/src/components/perks/perkTracking.ts
//
// What the Perks page tells Umami (see utils/analytics.ts for the catalogue). A search is reported once
// it has settled: the term as typed (normalized), how many perks it found and, when it narrowed to
// exactly one, which perk that was.
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Perk, RoleCategory } from '@/types/perks';
import type { AnalyticsEvents } from '@/utils/analytics';

/** A search counts once the text has not changed for this long (people type, pause, fix a typo). */
const SEARCH_SETTLE_MS = 3000;
/** Shorter texts are still a half typed word. */
const MIN_SEARCH_CHARS = 3;
/** Longer than any perk name or alias; what is beyond is not a search for a perk. */
const MAX_SEARCH_TERM_CHARS = 40;

export function roleTag(role: RoleCategory): AnalyticsEvents['perk_open']['role'] {
  return role === 'Killer' ? 'killer' : 'survivor';
}

/** The English name, falling back to the shown one on cached data from before `raw_name` existed. */
export function perkEnglishName(perk: Pick<Perk, 'name' | 'raw_name'>): string {
  return perk.raw_name || perk.name;
}

export function isSearchWorthReporting(text: string): boolean {
  return text.trim().length >= MIN_SEARCH_CHARS;
}

/** The props of `perk_open`, or null for a perk without an id (nothing stable to count it by). */
export function buildPerkOpenProps(perk: Perk, role: RoleCategory, searching: boolean): AnalyticsEvents['perk_open'] | null {
  if (perk.id === undefined) return null;
  return { perk_id: perk.id, perk: perkEnglishName(perk), role: roleTag(role), via: searching ? 'search' : 'grid' };
}

/** The search as it is counted: lower case, single spaces, cut short, so "Dead  Hard" and "dead hard" are one term. */
export function normalizeSearchTerm(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, MAX_SEARCH_TERM_CHARS);
}

/** The props of `perk_search` for the text a settled search was typed as and the perks it left on the page. */
export function buildPerkSearchProps(role: RoleCategory, matches: readonly Perk[], text: string): AnalyticsEvents['perk_search'] {
  const base = { role: roleTag(role), results: matches.length, query: normalizeSearchTerm(text) };
  const only = matches.length === 1 ? matches[0] : undefined;
  if (!only || only.id === undefined) return base;
  return { ...base, perk_id: only.id, perk: perkEnglishName(only) };
}

/**
 * Calls `report` once per search text that stayed put for SEARCH_SETTLE_MS. `report` is read when the
 * timer fires, so it sees the results as they are by then. Clearing the field (or going under the
 * minimum) lets the same text be reported again later.
 */
export function useSettledPerkSearch(search: string, report: () => void): void {
  const reportRef = useRef(report);
  useLayoutEffect(() => {
    reportRef.current = report;
  });
  const lastReportedRef = useRef('');
  const text = search.trim();

  useEffect(() => {
    if (!isSearchWorthReporting(text)) {
      lastReportedRef.current = '';
      return undefined;
    }
    if (text === lastReportedRef.current) return undefined;
    const timer = setTimeout(() => {
      lastReportedRef.current = text;
      reportRef.current();
    }, SEARCH_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [text]);
}
