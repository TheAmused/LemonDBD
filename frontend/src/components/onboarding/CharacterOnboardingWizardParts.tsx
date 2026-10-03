'use client';

import dynamic from 'next/dynamic';
import { ownsPerk, isSurvivor } from '@/utils/characterUtils';
import { getAvatarUrl } from '@/components/character-detail/types';

export const AuthModal = dynamic(() => import('@/components/AuthModal').then((m) => m.AuthModal), { ssr: false });

/** Which step to resume on after a language-triggered locale redirect.
 * `dict`/`locale` are resolved server-side by the `[locale]` layout, so
 * navigating to a different `/[locale]/welcome` remounts this component fresh
 * and the step it was on has to survive the reload. */
export const RESUME_VIEW_KEY = 'onboarding_view_after_language_redirect';

export type OnboardingView = 'intro' | 'language' | 'roster';

export function resolveOnboardingView(stored: string | null): OnboardingView {
  return stored === 'roster' || stored === 'language' ? stored : 'intro';
}

/** Ace Visconti, by convention -- matched by id, which is the stable identity
 * of a content row. His display name is translated, so it is not usable as a
 * key; the previous `wiki_slug` match was that same idea, but `wiki_slug` was
 * only `name` with underscores and no longer exists. */
/** Ace Visconti, matched by key rather than by name because the name is
 *  translated. Survivor 7 -- killer 7 is The Doctor. */
export const LEGEND_SURVIVOR_ID = 7;

// Minimum 3 columns on mobile small screens as requested.
export const CHAPTER_GRID_BREAKPOINTS: { minWidth: number; columns: number }[] = [
  { minWidth: 1720, columns: 7 },
  { minWidth: 1440, columns: 6 },
  { minWidth: 1180, columns: 5 },
  { minWidth: 880, columns: 4 },
  { minWidth: 0, columns: 3 },
];

export interface OnboardingCharacter {
  id: number;
  name: string;
  role: string;
  category: string;
  chapter_name: string | null;
  release_number: number | null;
  release_date: string | null;
  is_owned: boolean;
  is_free: boolean;
  avatar_url?: string;
  avatar_local_path?: string;
}

export interface OnboardingPerk {
  perk_id: number;
  name: string;
  character_id: number | null;
  role?: string;
  survivor_id?: number | null;
  killer_id?: number | null;
  is_teachable: boolean;
  is_unlocked: boolean;
  is_general?: boolean;
  is_generic_counterpart?: boolean;
  icon_url?: string;
  icon_local_path?: string;
}

/**
 * Determines whether a perk is unlocked by default based on model/API data attributes:
 * - Generic counterpart perks (perk.is_generic_counterpart)
 * - General baseline perks (perk.is_general)
 * - Free base game character perks (char.is_free)
 *
 * Driven strictly by data attributes rather than hardcoded character/chapter names.
 */
export function isDefaultUnlockedPerk(
  perk: OnboardingPerk,
  characters: OnboardingCharacter[]
): boolean {
  if (perk.is_generic_counterpart || perk.is_general) {
    return true;
  }
  const char = characters.find((c) => ownsPerk(perk, c.id, c.category));
  return Boolean(char?.is_free);
}

export interface ChapterGroup {
  chapterName: string;
  releaseTimestamp: number;
  characters: OnboardingCharacter[];
}

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** Parses the backend scraper's `release_date` format -- always either
 * "<day> <Month name> <year>" (e.g. "14 June 2016") or, in its year-only
 * fallback case, a bare 4-digit year -- into a UTC timestamp for sorting.
 * Hand-rolled rather than `Date.parse(release_date)`: that string isn't
 * ISO-8601, and per spec, non-ISO date-string parsing is
 * implementation-defined, so relying on it risks a browser/engine that
 * parses it differently (or not at all) silently mis-sorting that chapter
 * instead of erroring loudly. Returns 0 (sorts first) when unparseable. */
function parseReleaseDate(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const trimmed = dateStr.trim();

  const dayMonthYear = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(trimmed);
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const monthIndex = MONTH_NAMES.indexOf(dayMonthYear[2].toLowerCase());
    const year = Number(dayMonthYear[3]);
    if (monthIndex !== -1) return Date.UTC(year, monthIndex, day);
  }

  const yearOnly = /^(\d{4})$/.exec(trimmed);
  if (yearOnly) return Date.UTC(Number(yearOnly[1]), 0, 1);

  return 0;
}

/** Groups characters by `chapter_name` (falling back to "Base Game" for
 * null, matching the backend's own default in Character.to_dict), ordered
 * by each chapter's real release date ascending.
 *
 * Sorts by `release_date` (an actual calendar date), not `release_number` --
 * release_number is meant to be a sequential release index but isn't
 * reliable across chapters (e.g. Chucky's single character carries
 * release_number 34, same as Forged in Fog, even though Chucky actually
 * released a full year later per its release_date; the two fields disagree
 * for reasons that look like a scraper data-quality issue rather than
 * anything this grouping can correct for). release_date is read off every
 * character in the group and the latest one wins, for the same reason
 * described below for why a single first-seen character isn't enough. */
export function groupCharactersByChapter(characters: OnboardingCharacter[]): ChapterGroup[] {
  const byChapter = new Map<string, ChapterGroup>();

  for (const c of characters) {
    const chapterName = c.chapter_name || 'Base Game';
    if (!byChapter.has(chapterName)) {
      byChapter.set(chapterName, {
        chapterName,
        releaseTimestamp: 0,
        characters: [],
      });
    }
    const group = byChapter.get(chapterName)!;
    // A chapter's killer and survivor don't always both have this populated
    // (scraper gaps), so it's read off every character in the group rather
    // than just whichever happens to be first.
    const parsed = parseReleaseDate(c.release_date);
    if (parsed > group.releaseTimestamp) {
      group.releaseTimestamp = parsed;
    }
    group.characters.push(c);
  }

  return Array.from(byChapter.values()).sort((a, b) => a.releaseTimestamp - b.releaseTimestamp);
}

/** Turns a chapter name into an id-safe token for the accordion header's
 * `aria-controls`/panel `id` pair -- chapter names contain spaces and
 * punctuation, which are not valid inside an HTML id. */
export function slugifyChapterName(chapterName: string): string {
  return chapterName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Normalizes a chapter name for matching a character's `chapter_name`
 * against the `chapters` banner lookup's `name` -- the two come from
 * separate scrapers that don't always agree on a leading "The " or a
 * trailing "(Chapter)"/" Chapter" suffix, so an exact-string key would miss
 * real matches. */
export function normalizeChapterKey(chapterName: string): string {
  return chapterName
    .trim()
    .toLowerCase()
    .replace(/\s*\(chapter\)\s*$/, '')
    .replace(/\s+chapter\s*$/, '')
    .replace(/^the\s+/, '')
    .trim();
}

export function resolveOnboardingAvatar(backendBase: string, c: OnboardingCharacter): string {
  return getAvatarUrl(
    backendBase,
    {
      name: c.name,
      category: c.category,
      avatar_url: c.avatar_url,
      avatar_local_path: c.avatar_local_path,
    },
    isSurvivor(c.role)
  );
}
