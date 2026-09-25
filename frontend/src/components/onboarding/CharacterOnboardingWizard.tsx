'use client';
// frontend/src/components/onboarding/CharacterOnboardingWizard.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ownershipKey, ownsPerk } from '@/utils/characterUtils';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Loader2, Search, User as UserIcon, X } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { useAuth } from '@/context/AuthContext';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { getAvatarUrl } from '@/components/character-detail/types';
import { CharacterOwnershipOverlay, OwnershipClipOverlay } from '@/components/characters/CharacterOwnershipOverlay';
import { PerksTogglePopup } from '@/components/characters/PerksTogglePopup';
import { SkipOnboardingModal } from '@/components/onboarding/SkipOnboardingModal';
import { CATALOG_TTL_MS, fetchCached, invalidate } from '@/services/dataCache';
import { getChapterBannerSrc } from '@/utils/mapUtils';
import { LANGUAGES } from '@/components/sidebar/SidebarBottomControls';
import { FlagIcon } from '@/components/sidebar/FlagIcon';
import { useResponsiveGridColumns } from '@/hooks/useResponsiveGridColumns';
import { LemonIcon } from '@/components/LemonIcon';
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from '@/utils/onboardingStorage';

const AuthModal = dynamic(() => import('@/components/AuthModal').then((m) => m.AuthModal), { ssr: false });

/** Which step to resume on after a language-triggered locale redirect.
 * `dict`/`locale` are resolved server-side by the `[locale]` layout, so
 * navigating to a different `/[locale]/welcome` remounts this component fresh
 * and the step it was on has to survive the reload. */
const RESUME_VIEW_KEY = 'onboarding_view_after_language_redirect';

type OnboardingView = 'intro' | 'language' | 'roster';

export function resolveOnboardingView(stored: string | null): OnboardingView {
  return stored === 'roster' || stored === 'language' ? stored : 'intro';
}

/** Ace Visconti, by convention -- matched by id, which is the stable identity
 * of a content row. His display name is translated, so it is not usable as a
 * key; the previous `wiki_slug` match was that same idea, but `wiki_slug` was
 * only `name` with underscores and no longer exists. */
/** Ace Visconti, matched by key rather than by name because the name is
 *  translated. Survivor 7 -- killer 7 is The Doctor. */
const LEGEND_SURVIVOR_ID = 7;

// Minimum 3 columns on mobile small screens as requested.
const CHAPTER_GRID_BREAKPOINTS: { minWidth: number; columns: number }[] = [
  { minWidth: 1720, columns: 7 },
  { minWidth: 1440, columns: 6 },
  { minWidth: 1180, columns: 5 },
  { minWidth: 880, columns: 4 },
  { minWidth: 0, columns: 3 },
];

export interface ChapterBanner {
  banner_url: string | null;
  banner_local_path: string | null;
}

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
function slugifyChapterName(chapterName: string): string {
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

function resolveOnboardingAvatar(backendBase: string, c: OnboardingCharacter): string {
  return getAvatarUrl(
    backendBase,
    {
      name: c.name,
      category: c.category,
      avatar_url: c.avatar_url,
      avatar_local_path: c.avatar_local_path,
    },
    c.role === 'Survivor'
  );
}

export interface CharacterOnboardingWizardProps {
  locale: string;
  dict?: Dictionary;
  onFinished: () => void;
}

export const CharacterOnboardingWizard: React.FC<CharacterOnboardingWizardProps> = ({
  locale,
  dict,
  onFinished,
}) => {
  const {
    user,
    token,
    isAuthenticated,
    isLoading: authLoading,
    bulkUpdateCharacterOwnership,
    bulkUpdatePerkOwnership,
    markOnboardingComplete,
    setPreferredLanguage,
  } = useAuth();
  const router = useRouter();
  const backendBase = getBackendBaseUrl();
  const t = dict?.onboarding;

  const [characters, setCharacters] = useState<OnboardingCharacter[]>([]);
  const [allPerks, setAllPerks] = useState<OnboardingPerk[]>([]);
  // Keyed "survivor:7" / "killer:7": the two rosters are numbered separately.
  const [ownershipDraft, setOwnershipDraft] = useState<Record<string, boolean>>({});
  const [perkUnlockDraft, setPerkUnlockDraft] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [perksPopupCharacter, setPerksPopupCharacter] = useState<OnboardingCharacter | null>(null);
  const [chapterBanners, setChapterBanners] = useState<Record<string, ChapterBanner>>({});
  const [translatedChapterNames, setTranslatedChapterNames] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  // A chapter's expand panel only ever occupies a grid row while it's
  // mounted -- see chapterRowEndIndex below -- so it can't just track
  // `expandedChapter` directly: the panel's own row position is keyed off
  // `renderedChapter`, which framer-motion's `onExitComplete` (not a guessed
  // setTimeout) keeps mounted for exactly as long as the close animation
  // actually takes. Switching straight from one open chapter to another
  // (different row) goes through pendingChapterOpenRef so the old panel gets
  // to fully close before the new one's row position takes over.
  const [renderedChapter, setRenderedChapter] = useState<string | null>(null);
  const pendingChapterOpenRef = useRef<string | null>(null);

  const toggleChapterExpanded = (chapterName: string) => {
    setExpandedChapter((prev) => {
      if (prev === chapterName) {
        pendingChapterOpenRef.current = null;
        return null;
      }
      // Also queues (rather than opening immediately) while something is
      // still mounted-but-closing (renderedChapter set, expandedChapter
      // already null) -- e.g. chapter A is closing after B was clicked,
      // and C gets clicked before A's exit animation finishes. Gating on
      // `prev` alone would open C right away, forcing A's still-animating
      // panel (whose row position is keyed off renderedChapter) to get
      // yanked out from under framer-motion instead of finishing its exit.
      if (prev !== null || renderedChapter !== null) {
        pendingChapterOpenRef.current = chapterName;
        return null;
      }
      pendingChapterOpenRef.current = null;
      return chapterName;
    });
  };

  useEffect(() => {
    if (expandedChapter !== null) setRenderedChapter(expandedChapter);
    // When expandedChapter goes null, renderedChapter is left as-is --
    // handleChapterPanelExitComplete clears it once the close transition
    // genuinely finishes, and opens any pending chapter at that point.
  }, [expandedChapter]);

  const handleChapterPanelExitComplete = () => {
    setRenderedChapter(null);
    if (pendingChapterOpenRef.current) {
      const next = pendingChapterOpenRef.current;
      pendingChapterOpenRef.current = null;
      setExpandedChapter(next);
    }
  };
  const [view, setView] = useState<OnboardingView>(() =>
    resolveOnboardingView(typeof window !== 'undefined' ? sessionStorage.getItem(RESUME_VIEW_KEY) : null)
  );
  // The locale in the URL is the language the site is already being read in,
  // and after a flag redirect it is the one just picked -- right in both cases.
  const [selectedLanguage, setSelectedLanguage] = useState<string>(locale);
  const [savingLanguage, setSavingLanguage] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem(RESUME_VIEW_KEY);
  }, []);

  /** Switches the whole wizard into the picked language right away: the
   * dictionary comes from the `[locale]` segment, so the only way to
   * re-translate what is on screen is to navigate there. */
  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    if (language !== locale) {
      sessionStorage.setItem(RESUME_VIEW_KEY, 'language');
      router.push(`/${language}/welcome`);
    }
  };

  const handleLanguageContinue = async () => {
    setSavingLanguage(true);
    // Set before awaiting: a redirect from a flag picked moments ago may still
    // be in flight, and whichever mount wins has to land on the roster rather
    // than bounce back to the language step.
    sessionStorage.setItem(RESUME_VIEW_KEY, 'roster');
    await setPreferredLanguage(selectedLanguage);
    if (selectedLanguage !== locale) {
      router.push(`/${selectedLanguage}/welcome`);
    }
    setSavingLanguage(false);
    setView('roster');
  };

  useEffect(() => {
    // Unlike the characters/perks fetch below, /api/v1/chapters is public and
    // not scoped to the signed-in user, so it doesn't belong inside that
    // user/token-gated effect -- it can run unconditionally on mount.
    //
    // Being public is also why it goes through the shared cache: the banner
    // list is catalog data that only moves on a re-seed, and someone who backs
    // out of the wizard and returns should not re-download it.
    let cancelled = false;
    const chaptersKey = `${backendBase}/api/v1/chapters`;
    fetchCached<{ chapters?: Array<{ name: string; banner_url: string | null; banner_local_path: string | null }> }>(
      chaptersKey,
      () => fetch(chaptersKey).then((res) => res.json()),
      { ttlMs: CATALOG_TTL_MS }
    )
      .then((json: { chapters?: Array<{ name: string; banner_url: string | null; banner_local_path: string | null }> }) => {
        if (cancelled) return;
        const byName: Record<string, ChapterBanner> = {};
        (json.chapters || []).forEach((chapter) => {
          byName[normalizeChapterKey(chapter.name)] = {
            banner_url: chapter.banner_url,
            banner_local_path: chapter.banner_local_path,
          };
        });
        setChapterBanners(byName);
      })
      .catch(() => setChapterBanners({}));
    return () => {
      cancelled = true;
    };
  }, [backendBase]);

  useEffect(() => {
    // The ownership characters fetch deliberately stays untranslated: its
    // chapter_name is the canonical (English) DLC name this component groups
    // by and matches against the chapters banner lookup -- Chapter has no
    // translations table, so a translated chapter_name here would silently
    // break every banner match. Display names/titles instead come from the
    // public, already-translated /api/v1/characters catalog, merged in below
    // by id, so the canonical structure used for grouping never changes.
    if (!user || !token) return;
    let cancelled = false;
    const headers = { Authorization: `Bearer ${token}` };
    // The two /users/... reads stay bare: they carry the bearer token, so they
    // are personalised and neither cache will touch them. The third is the
    // public catalog under the same key the roster page uses, so a visitor who
    // has already loaded /characters pays nothing for it here.
    const translatedCharsKey = `${backendBase}/api/v1/characters?lang=${locale}`;
    Promise.all([
      fetch(`${backendBase}/api/v1/users/${user.id}/characters`, { headers }).then((res) => res.json()),
      fetch(`${backendBase}/api/v1/users/${user.id}/perks?lang=${locale}`, { headers }).then((res) => res.json()),
      fetchCached(translatedCharsKey, () => fetch(translatedCharsKey).then((res) => res.json()), {
        ttlMs: CATALOG_TTL_MS,
      }),
    ])
      .then(
        ([charsJson, perksJson, translatedCharsJson]: [
          { data?: OnboardingCharacter[] },
          { data?: OnboardingPerk[] },
          { data?: Array<{ id: number; name: string; category: string; chapter_name: string | null }> },
        ]) => {
          if (cancelled) return;
          const chars = charsJson.data || [];
          const perks = perksJson.data || [];
          // Keyed by role + id, not id alone: survivor 7 and killer 7 are
          // different characters.
          const translatedByKey = new Map(
            (translatedCharsJson.data || []).map((c) => [ownershipKey(c.id, c.category), c])
          );

          const chapterNameTranslations: Record<string, string> = {};
          const localizedChars = chars.map((c) => {
            const translated = translatedByKey.get(ownershipKey(c.id, c.category));
            if (!translated) return c;
            const canonicalChapterName = c.chapter_name || 'Base Game';
            if (translated.chapter_name && !chapterNameTranslations[canonicalChapterName]) {
              chapterNameTranslations[canonicalChapterName] = translated.chapter_name;
            }
            return { ...c, name: translated.name || c.name };
          });

          setCharacters(localizedChars);
          setAllPerks(perks);
          setTranslatedChapterNames(chapterNameTranslations);

          const charDraft: Record<string, boolean> = {};
          chars.forEach((c) => {
            charDraft[ownershipKey(c.id, c.category)] = c.is_free ? true : c.is_owned;
          });

          const perkDraft: Record<number, boolean> = {};
          perks.forEach((p) => {
            perkDraft[p.perk_id] = isDefaultUnlockedPerk(p, chars) ? true : p.is_unlocked;
          });

          const storedDraft = loadOnboardingDraft(user.id);
          const finalCharDraft = storedDraft?.ownershipDraft
            ? { ...charDraft, ...storedDraft.ownershipDraft }
            : charDraft;
          // Free base-game characters are always unlocked by default:
          chars.forEach((c) => {
            if (c.is_free) {
              finalCharDraft[ownershipKey(c.id, c.category)] = true;
            }
          });

          const finalPerkDraft = storedDraft?.perkUnlockDraft
            ? { ...perkDraft, ...storedDraft.perkUnlockDraft }
            : perkDraft;
          // Free characters and default unlocked perks (Halloween, Hellraiser, generic counterparts) always stay unlocked:
          perks.forEach((p) => {
            if (isDefaultUnlockedPerk(p, chars)) {
              finalPerkDraft[p.perk_id] = true;
            }
          });

          setOwnershipDraft(finalCharDraft);
          setPerkUnlockDraft(finalPerkDraft);

          setLoading(false);
        }
      )
      .catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user, token, backendBase, locale]);

  /** Free characters are always owned the moment someone owns the game
   * itself, so they're excluded from the roster entirely. A chapter whose
   * entire cast is free (e.g. "Base Game") drops out on its own once its
   * characters are filtered out here. */
  const chapterGroups = useMemo(
    () => groupCharactersByChapter(characters.filter((c) => !c.is_free)),
    [characters]
  );

  const isCharacterOwned = (c: OnboardingCharacter) =>
    ownershipDraft[ownershipKey(c.id, c.category)] ?? c.is_owned;

  const ownedChaptersCount = useMemo(() => {
    return chapterGroups.filter((g) => g.characters.every(isCharacterOwned)).length;
  }, [chapterGroups, ownershipDraft]);

  const filteredChapterGroups = useMemo(() => {
    if (!searchQuery.trim()) return chapterGroups;
    const q = searchQuery.toLowerCase().trim();
    return chapterGroups.filter((g) => {
      const localized = (translatedChapterNames[g.chapterName] || g.chapterName).toLowerCase();
      const canonical = g.chapterName.toLowerCase();
      const hasChar = g.characters.some((c) => c.name.toLowerCase().includes(q));
      return localized.includes(q) || canonical.includes(q) || hasChar;
    });
  }, [chapterGroups, searchQuery, translatedChapterNames]);

  // Chapters can legitimately disappear between renders (e.g. a refetch of
  // /users/{id}/characters returning a different roster) -- without this,
  // `renderedChapter`/`expandedChapter` referencing a now-gone chapter would
  // drive chapterRowEndIndex below to a permanent -1, so the expand panel's
  // AnimatePresence host stops rendering, its onExitComplete never fires,
  // renderedChapter never clears, and every future chapter click gets stuck
  // queued in pendingChapterOpenRef instead of opening.
  useEffect(() => {
    const stillExists = (name: string | null) =>
      name === null || filteredChapterGroups.some((g) => g.chapterName === name);
    if (!stillExists(expandedChapter) || !stillExists(renderedChapter)) {
      setExpandedChapter(null);
      setRenderedChapter(null);
      pendingChapterOpenRef.current = null;
    }
  }, [filteredChapterGroups, expandedChapter, renderedChapter]);

  // Needed so the expand panel below can be placed after the last card of
  // its row instead of right after whichever card was clicked -- otherwise
  // the other cards sharing that row get shoved onto a new row too (there's
  // no room left for a full-width item mid-row), which reads as unrelated
  // cards randomly jumping instead of the row smoothly growing.
  const chapterColumns = useResponsiveGridColumns(CHAPTER_GRID_BREAKPOINTS, 3);
  const renderedGroup = renderedChapter
    ? filteredChapterGroups.find((g) => g.chapterName === renderedChapter)
    : undefined;
  const renderedChapterIndex = renderedGroup ? filteredChapterGroups.indexOf(renderedGroup) : -1;
  const chapterRowEndIndex =
    renderedChapterIndex === -1
      ? -1
      : Math.min(
          chapterColumns * (Math.floor(renderedChapterIndex / chapterColumns) + 1) - 1,
          filteredChapterGroups.length - 1
        );

  /** The legend's example swatches show a real portrait -- Ace Visconti by
   * convention, matched by id since `name` is translated and therefore not
   * stable across locales. Falls back to whichever character loaded first if
   * he isn't present. */
  const legendCharacter = useMemo(
    () =>
      characters.find(
        (c) => c.id === LEGEND_SURVIVOR_ID && (c.category ?? '').toLowerCase() === 'survivor',
      ) ?? characters[0],
    [characters]
  );

  /** Whole-character toggle cascades to that character's teachable perks in
   * the draft too, mirroring the backend's own cascade in
   * mutate_character_ownership -- so a chapter-level "I own this" click
   * unlocks its perks immediately instead of leaving them stuck locked
   * until the next save round-trip. */
  const setCharacterOwned = (characterId: number, role: string, owned: boolean) => {
    const key = ownershipKey(characterId, role);
    setOwnershipDraft((prev) => {
      const nextChar = { ...prev, [key]: owned };
      setPerkUnlockDraft((perkPrev) => {
        const nextPerk = { ...perkPrev };
        allPerks
          .filter((p) => ownsPerk(p, characterId, role))
          .forEach((p) => {
            nextPerk[p.perk_id] = owned ? true : isDefaultUnlockedPerk(p, characters);
          });
        saveOnboardingDraft(user?.id, { ownershipDraft: nextChar, perkUnlockDraft: nextPerk });
        return nextPerk;
      });
      return nextChar;
    });
  };

  const toggleChapter = (group: ChapterGroup, own: boolean) => {
    setOwnershipDraft((prevChar) => {
      const nextChar = { ...prevChar };
      setPerkUnlockDraft((prevPerk) => {
        const nextPerk = { ...prevPerk };
        group.characters.forEach((c) => {
          nextChar[ownershipKey(c.id, c.category)] = own;
          allPerks
            .filter((p) => ownsPerk(p, c.id, c.category))
            .forEach((p) => {
              nextPerk[p.perk_id] = own ? true : isDefaultUnlockedPerk(p, characters);
            });
        });
        saveOnboardingDraft(user?.id, { ownershipDraft: nextChar, perkUnlockDraft: nextPerk });
        return nextPerk;
      });
      return nextChar;
    });
  };

  /** Marks every loaded chapter owned in one shot, for players who own most
   * or all of them and don't want to click through each row. */
  const handleSelectAllChapters = () => {
    setOwnershipDraft((prevChar) => {
      const nextChar = { ...prevChar };
      setPerkUnlockDraft((prevPerk) => {
        const nextPerk = { ...prevPerk };
        characters.forEach((c) => {
          nextChar[ownershipKey(c.id, c.category)] = true;
        });
        allPerks.forEach((p) => {
          nextPerk[p.perk_id] = true;
        });
        saveOnboardingDraft(user?.id, { ownershipDraft: nextChar, perkUnlockDraft: nextPerk });
        return nextPerk;
      });
      return nextChar;
    });
  };

  const handleDeselectAllChapters = () => {
    setOwnershipDraft((prevChar) => {
      const nextChar = { ...prevChar };
      setPerkUnlockDraft((prevPerk) => {
        const nextPerk = { ...prevPerk };
        characters.forEach((c) => {
          nextChar[ownershipKey(c.id, c.category)] = Boolean(c.is_free);
        });
        allPerks.forEach((p) => {
          nextPerk[p.perk_id] = isDefaultUnlockedPerk(p, characters);
        });
        saveOnboardingDraft(user?.id, { ownershipDraft: nextChar, perkUnlockDraft: nextPerk });
        return nextPerk;
      });
      return nextChar;
    });
  };

  const isAllOwned = chapterGroups.length > 0 && ownedChaptersCount === chapterGroups.length;
  const hasAnySelection =
    ownedChaptersCount > 0 ||
    characters.some((c) => !c.is_free && (ownershipDraft[ownershipKey(c.id, c.category)] ?? c.is_owned)) ||
    allPerks.some((p) => !isDefaultUnlockedPerk(p, characters) && (perkUnlockDraft[p.perk_id] ?? false));

  const handleToggleAllChapters = () => {
    if (isAllOwned) {
      handleDeselectAllChapters();
    } else {
      handleSelectAllChapters();
    }
  };

  const togglePerkUnlocked = (perkId: number) => {
    const perk = allPerks.find((p) => p.perk_id === perkId);
    if (perk && isDefaultUnlockedPerk(perk, characters)) {
      return;
    }
    setPerkUnlockDraft((prev) => {
      const nextPerk = { ...prev, [perkId]: !(prev[perkId] ?? true) };
      saveOnboardingDraft(user?.id, { ownershipDraft, perkUnlockDraft: nextPerk });
      return nextPerk;
    });
  };

  const getCharacterPerkStats = (characterId: number, role: string) => {
    const perksForChar = allPerks.filter((p) => ownsPerk(p, characterId, role));
    const unlocked = perksForChar.filter((p) => perkUnlockDraft[p.perk_id] ?? true).length;
    return { total: perksForChar.length, unlocked };
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      const characterUpdates = characters.map((c) => ({
        character_id: c.id,
        role: c.category,
        is_owned: c.is_free ? true : (ownershipDraft[ownershipKey(c.id, c.category)] ?? c.is_owned),
      }));
      const perkUpdates = allPerks.map((p) => ({
        perk_id: p.perk_id,
        is_unlocked: isDefaultUnlockedPerk(p, characters)
          ? true
          : (perkUnlockDraft[p.perk_id] ?? p.is_unlocked),
      }));
      await bulkUpdateCharacterOwnership(characterUpdates);
      await bulkUpdatePerkOwnership(perkUpdates);
      invalidate(`${backendBase}/api/v1/perks`);
      invalidate(`${backendBase}/api/v1/characters`);
      await markOnboardingComplete();
      clearOnboardingDraft(user?.id);
      setSaving(false);
      onFinished();
    } catch {
      setSaving(false);
    }
  };

  const handleSkipConfirm = async () => {
    setSaving(true);
    try {
      await markOnboardingComplete();
      clearOnboardingDraft(user?.id);
    } finally {
      setSaving(false);
      onFinished();
    }
  };

  // Auth finished resolving and there's no session -- the fetch below never
  // runs without a user/token, so this must render something other than the
  // loading spinner below.
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md space-y-4 rounded-3xl border border-border-color bg-bg-surface p-8 shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-red/30 bg-accent-red/15">
            <LemonIcon className="h-10 w-10 text-accent-red" />
          </div>
          <h1 className="text-xl font-black tracking-wider text-text-primary">
            {dict?.user?.authRequiredTitle || 'Authentication Required'}
          </h1>
          <p className="text-xs leading-relaxed text-text-secondary">
            {dict?.user?.authRequiredDesc ||
              'Please sign in or create an account to view your LemonDBD profile, manage your teachables, and track game challenges.'}
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent-red hover:bg-accent-red-hover py-3 text-xs font-black uppercase tracking-wider text-text-inverted shadow-xs transition-all"
            >
              <UserIcon className="h-4 w-4" />
              <span>{dict?.user?.signIn || 'Sign In / Register'}</span>
            </button>
            <Link
              href={`/${locale}`}
              className="py-1 text-xs text-text-muted transition-colors hover:text-accent-red"
            >
              {dict?.user?.returnToHome || 'Return to Home'}
            </Link>
          </div>
        </div>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} dict={dict} />
      </div>
    );
  }

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-red" />
      </div>
    );
  }

  if (view === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
        <div className="w-full max-w-md rounded-2xl border border-border-color bg-bg-surface p-8 text-center space-y-4 shadow-2xl">
          <h1 className="text-xl font-black">{t?.introTitle || 'Welcome to LemonDBD'}</h1>
          <p className="text-sm text-text-secondary">
            {t?.introBody ||
              'To tailor the site to your progress in the game, please mark which chapters, characters, and perks you already own.'}
          </p>
          <button
            type="button"
            onClick={() => setView('language')}
            className="w-full rounded-xl bg-accent-red hover:bg-accent-red-hover py-3 text-sm font-black uppercase tracking-wider text-text-inverted cursor-pointer"
          >
            {t?.introContinueButton || 'Get Started'}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'language') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
        <div className="w-full max-w-md rounded-2xl border border-border-color bg-bg-surface p-8 text-center space-y-4 shadow-2xl">
          <h1 className="text-xl font-black">{t?.languageStepTitle || 'Choose your language'}</h1>
          <p className="text-sm text-text-secondary">
            {t?.languageStepBody || 'Pick the language you want to use across the site. You can change this again later.'}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageSelect(lang.code)}
                aria-pressed={selectedLanguage === lang.code}
                className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer ${
                  selectedLanguage === lang.code
                    ? 'border-accent-red bg-accent-red/10 text-accent-red'
                    : 'border-border-color text-text-secondary hover:border-accent-red/50'
                }`}
              >
                <FlagIcon code={lang.code} className="h-4 w-[22px] rounded-sm shrink-0" />
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={savingLanguage}
            onClick={handleLanguageContinue}
            className="w-full rounded-xl bg-accent-red hover:bg-accent-red-hover py-3 text-sm font-black uppercase tracking-wider text-text-inverted disabled:opacity-50 cursor-pointer"
          >
            {savingLanguage
              ? t?.savingLabel || 'Saving...'
              : t?.languageContinueButton || 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary p-2.5 sm:p-5 lg:p-6 pb-28">
      <div className="mx-auto w-full max-w-[96rem] 2xl:max-w-[110rem] 3xl:max-w-[124rem]">
        {/* Unified Card Container */}
        <div className="rounded-2xl border border-border-color bg-bg-surface p-3 sm:p-5 lg:p-6 shadow-2xl space-y-3.5 sm:space-y-4">
          {/* Header Section */}
          <header className="relative flex flex-col items-center text-center space-y-1.5 sm:space-y-2">
            <div className="sm:absolute sm:right-0 sm:top-0 hidden sm:block">
              <button
                type="button"
                onClick={() => setIsSkipModalOpen(true)}
                className="shrink-0 rounded-xl border border-accent-amber/50 bg-accent-amber/10 px-4 py-2 sm:px-5 sm:py-2.5 lg:px-6 lg:py-3 text-xs sm:text-sm lg:text-base font-bold text-accent-amber hover:bg-accent-amber/20 hover:border-accent-amber transition-all cursor-pointer shadow-xs"
              >
                {t?.skipButton || 'Skip'}
              </button>
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-black font-mono tracking-tight text-text-primary px-2">
              {t?.heading || 'Which characters do you already own?'}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-xl mx-auto px-2">
              {t?.subheading ||
                'Pick the chapters you own so the perk randomizer and streaks only offer you perks you can actually use. You can always change this later from your Characters page.'}
            </p>
            <div className="sm:hidden pt-0.5">
              <button
                type="button"
                onClick={() => setIsSkipModalOpen(true)}
                className="shrink-0 rounded-xl border border-accent-amber/50 bg-accent-amber/10 px-3 py-1 text-xs font-bold text-accent-amber hover:bg-accent-amber/20 transition-colors cursor-pointer"
              >
                {t?.skipButton || 'Skip'}
              </button>
            </div>
          </header>

          <hr className="border-t border-border-color/60 my-0.5" />

          {/* Legend Section ("Jak to działa") */}
          <section className="flex flex-col items-center text-center space-y-2 sm:space-y-2.5">
            <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-accent-red font-mono">
              {t?.legendTitle || 'How this works'}
            </h2>
            <div className="grid grid-cols-3 items-start justify-items-center gap-2 sm:gap-6 w-full max-w-xl mx-auto">
              {/* Owned */}
              <div className="flex flex-col items-center text-center gap-2 w-full max-w-[150px]">
                <span className="relative flex aspect-[3/4] w-14 sm:w-16 md:w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-accent-green/60 bg-accent-green/20 shadow-sm">
                  {legendCharacter && (
                    <img
                      src={resolveOnboardingAvatar(backendBase, legendCharacter)}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover object-top"
                    />
                  )}
                  <CharacterOwnershipOverlay
                    isOwned
                    hasPartialPerks={false}
                    avatarSrc={legendCharacter ? resolveOnboardingAvatar(backendBase, legendCharacter) : undefined}
                    badgeSize="sm"
                  />
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-text-primary leading-tight">
                  {t?.legendOwned || 'Owned - fully available'}
                </span>
              </div>

              {/* Locked */}
              <div className="flex flex-col items-center text-center gap-2 w-full max-w-[150px]">
                <span className="relative flex aspect-[3/4] w-14 sm:w-16 md:w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-accent-red bg-bg-elevated shadow-sm">
                  {legendCharacter && (
                    <img
                      src={resolveOnboardingAvatar(backendBase, legendCharacter)}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover object-top"
                    />
                  )}
                  <CharacterOwnershipOverlay
                    isOwned={false}
                    hasPartialPerks={false}
                    avatarSrc={legendCharacter ? resolveOnboardingAvatar(backendBase, legendCharacter) : undefined}
                    badgeSize="sm"
                  />
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-text-primary leading-tight">
                  {t?.legendLocked || 'Locked - not available yet'}
                </span>
              </div>

              {/* Partial */}
              <div className="flex flex-col items-center text-center gap-2 w-full max-w-[150px]">
                <span className="relative flex aspect-[3/4] w-14 sm:w-16 md:w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-accent-amber bg-bg-elevated shadow-sm">
                  {legendCharacter && (
                    <img
                      src={resolveOnboardingAvatar(backendBase, legendCharacter)}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover object-top"
                    />
                  )}
                  <CharacterOwnershipOverlay
                    isOwned={false}
                    hasPartialPerks
                    avatarSrc={legendCharacter ? resolveOnboardingAvatar(backendBase, legendCharacter) : undefined}
                    badgeSize="sm"
                  />
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-text-primary leading-tight">
                  {t?.legendPartial || 'Partially unlocked - some perks unlocked by hand'}
                </span>
              </div>
            </div>
            <p className="text-[10px] sm:text-[11px] text-text-secondary max-w-lg mx-auto leading-normal">
              {t?.legendCustomizeHint ||
                "Tap a locked character's Perks button to unlock individual perks without owning the whole character."}
            </p>
          </section>

          <hr className="border-t border-border-color/60 my-0.5" />

          {/* DLC / Chapters Section */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-text-secondary font-mono">
                  {t?.chaptersTitle || 'Chapters'}
                </span>
                <span className="rounded-full border border-border-color bg-bg-elevated px-2 py-0.5 text-[11px] font-bold text-text-secondary">
                  {ownedChaptersCount} / {chapterGroups.length}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t?.searchPlaceholder || 'Search chapters or characters...'}
                    className="w-full rounded-lg border border-border-color bg-bg-elevated pl-8 pr-7 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-red focus:outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isAllOwned}
                    onClick={handleToggleAllChapters}
                    className={`group relative flex items-center gap-2 rounded-lg border px-2.5 sm:px-3 py-1.5 transition-all select-none cursor-pointer ${
                      isAllOwned
                        ? 'border-accent-red/80 bg-accent-red/15 text-accent-red shadow-md shadow-accent-red/30'
                        : 'border-border-color bg-bg-surface text-text-secondary hover:border-accent-red/60 hover:text-text-primary'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`relative flex h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0 items-center justify-center rounded-[3px] border transition-all duration-150 ${
                        isAllOwned
                          ? 'border-accent-red bg-accent-red text-text-inverted shadow-xs shadow-accent-red/50'
                          : 'border-border-color/80 bg-bg-elevated/80 group-hover:border-accent-red/80'
                      }`}
                    >
                      {isAllOwned && <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[3] drop-shadow-xs" />}
                    </span>
                    <span className="text-xs font-bold font-mono tracking-tight">
                      {t?.selectAllButton || 'I own everything'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={!hasAnySelection}
                    onClick={handleDeselectAllChapters}
                    className={`rounded-lg border px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all ${
                      !hasAnySelection
                        ? 'border-border-color/40 bg-bg-surface/40 text-text-muted/40 cursor-not-allowed'
                        : 'border-border-color bg-bg-surface text-text-muted hover:border-accent-red hover:text-accent-red cursor-pointer'
                    }`}
                  >
                    {t?.deselectAllButton || 'Clear all'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 md:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {filteredChapterGroups.map((group, index) => {
            const isExpanded = expandedChapter === group.chapterName;
            const banner = chapterBanners[normalizeChapterKey(group.chapterName)];
            const bannerSrc = getChapterBannerSrc(banner, backendBase);
            const isCharacterOwned = (c: OnboardingCharacter) =>
              ownershipDraft[ownershipKey(c.id, c.category)] ?? c.is_owned;
            const ownedCharacterCount = group.characters.filter(isCharacterOwned).length;
            const chapterOwned = ownedCharacterCount === group.characters.length;
            const chapterHasPartialSignal =
              ownedCharacterCount > 0 ||
              group.characters.some(
                (c) => !isCharacterOwned(c) && getCharacterPerkStats(c.id, c.category).unlocked > 0,
              );
            const chapterPartiallyOwned = !chapterOwned && chapterHasPartialSignal;
            // Display only -- expandedChapter/aria-id/banner lookups all key off
            // the canonical group.chapterName above, never this localized text.
            const chapterDisplayName = translatedChapterNames[group.chapterName] || group.chapterName;
            const chapterSwitchLabel = `${t?.ownChapterButton || 'I own this chapter'}: ${chapterDisplayName}`;
            const chapterPanelId = `chapter-panel-${slugifyChapterName(group.chapterName)}`;

            return (
              <React.Fragment key={group.chapterName}>
                <div className={`flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border sm:border-2 bg-bg-surface ${isExpanded ? 'border-accent-red' : 'border-border-color'}`}>
                  <button
                    type="button"
                    onClick={() => toggleChapterExpanded(group.chapterName)}
                    aria-expanded={isExpanded}
                    aria-controls={chapterPanelId}
                    className="group relative flex aspect-video w-full items-center justify-center overflow-hidden bg-bg-elevated cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-red"
                  >
                    {bannerSrc ? (
                      // object-cover, not object-contain -- these are ~616x353
                      // (16:9-ish) capsule art from wiki.gg, so contain-fitted
                      // into a differently-proportioned box left visible
                      // letterboxing on the sides, reading as a small floating
                      // image rather than art that fills the card.
                      <img
                        src={bannerSrc}
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="px-1 sm:px-2 text-center text-[10px] sm:text-sm font-extrabold text-text-secondary line-clamp-2">{chapterDisplayName}</span>
                    )}
                    <OwnershipClipOverlay
                      isOwned={chapterOwned}
                      isPartial={chapterPartiallyOwned}
                      imageSrc={bannerSrc}
                    />
                    <ChevronDown
                      className={`absolute top-1 right-1 sm:top-2 sm:right-2 h-3.5 w-3.5 sm:h-5 sm:w-5 text-text-inverted drop-shadow transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {/* The whole footer toggles ownership, not just the small
                      switch -- Switch renders its own <button>, so it can't
                      be nested here; its visuals are reproduced on a plain
                      <span> instead. */}
                  <button
                    type="button"
                    onClick={() => toggleChapter(group, !chapterOwned)}
                    role="switch"
                    aria-checked={chapterOwned}
                    aria-label={chapterSwitchLabel}
                    className="flex w-full items-center justify-between gap-1 sm:gap-2 border-t border-border-color px-1.5 py-1 sm:px-2.5 sm:py-2 text-left cursor-pointer hover:bg-bg-elevated transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-red"
                  >
                    <h3 className="flex-1 text-[9px] sm:text-xs font-bold sm:font-extrabold leading-tight line-clamp-2 min-h-[22px] sm:min-h-[32px] flex items-center text-text-primary break-words">
                      {chapterDisplayName}
                    </h3>
                    <span
                      aria-hidden="true"
                      className={`relative inline-flex h-3.5 w-6 sm:h-5 sm:w-9 shrink-0 items-center rounded-full transition-colors ${
                        chapterOwned ? 'bg-accent-green' : 'bg-bg-elevated border border-border-color'
                      }`}
                    >
                      <span
                        className={`inline-block h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 transform rounded-full bg-text-inverted shadow transition-transform ${
                          chapterOwned ? 'translate-x-2.5 sm:translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </span>
                  </button>
                </div>

                {/* Placed after the last card of the *row*, not right after
                    whichever card was clicked -- otherwise the other cards
                    sharing that row have nowhere to go but a new row of
                    their own, which reads as unrelated cards randomly
                    jumping instead of the row smoothly growing beneath
                    itself. Wrapping div only mounts for as long as a chapter
                    in this row is expanding/expanded/collapsing
                    (`renderedGroup`); AnimatePresence/motion.div do the
                    actual measured-height enter/exit animation. */}
                {index === chapterRowEndIndex && renderedGroup && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    {/* No initial={false} here on purpose -- unlike a
                        persistently-mounted AnimatePresence, this one is
                        conditionally rendered (mounts exactly when a chapter
                        in this row starts expanding), so initial={false}
                        would skip the enter animation on every single open,
                        not just on page load. */}
                    <AnimatePresence onExitComplete={handleChapterPanelExitComplete}>
                      {expandedChapter === renderedGroup.chapterName && (
                        <motion.div
                          key={`chapter-panel-${slugifyChapterName(renderedGroup.chapterName)}`}
                          id={`chapter-panel-${slugifyChapterName(renderedGroup.chapterName)}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-3 rounded-2xl border border-border-color bg-bg-surface p-3">
                      {renderedGroup.characters.map((c) => {
                        const isOwned =
                          ownershipDraft[ownershipKey(c.id, c.category)] ?? c.is_owned;
                        const perkStats = getCharacterPerkStats(c.id, c.category);
                        const hasPartialPerks = !isOwned && perkStats.unlocked > 0;
                        return (
                          <div
                            key={c.id}
                            className="group relative flex flex-col overflow-hidden rounded-xl border border-border-color bg-bg-surface"
                          >
                            <button
                              type="button"
                              onClick={() => setCharacterOwned(c.id, c.category, !isOwned)}
                              className="relative aspect-[3/4] w-full cursor-pointer"
                            >
                              <img
                                src={resolveOnboardingAvatar(backendBase, c)}
                                alt=""
                                aria-hidden="true"
                                className="absolute inset-0 h-full w-full object-cover object-top"
                              />
                              <CharacterOwnershipOverlay
                                isOwned={isOwned}
                                hasPartialPerks={hasPartialPerks}
                                avatarSrc={resolveOnboardingAvatar(backendBase, c)}
                                lockedTitle={dict?.modal?.unownedPerk}
                                ownedTitle={dict?.filters?.ownedOnly}
                              />
                              <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-bg-primary/80 px-1.5 py-0.5 text-[10px] font-bold text-text-inverted text-center">
                                {c.name}
                              </span>
                            </button>
                            {!isOwned && perkStats.total > 0 && (
                              <button
                                type="button"
                                onClick={() => setPerksPopupCharacter(c)}
                                className="w-full border-t border-border-color bg-accent-amber/10 px-1.5 py-1 text-[10px] font-bold text-accent-amber hover:bg-accent-amber/20 transition-colors cursor-pointer"
                              >
                                {t?.perksButton || 'Perks'} ({perkStats.unlocked}/{perkStats.total})
                              </button>
                            )}
                          </div>
                        );
                      })}
                      </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </section>

      <div className="h-2" />
    </div>
  </div>

      {/* Sticky full-screen bottom continue banner so Continue stays reachable while scrolling */}
      <div className="fixed bottom-0 inset-x-0 z-30 w-full border-t border-border-color bg-bg-surface/95 backdrop-blur-md shadow-2xl">
        <div className="mx-auto flex w-full max-w-7xl justify-center px-4 py-3 sm:py-4">
          <button
            type="button"
            disabled={saving}
            onClick={handleContinue}
            className="w-full max-w-md sm:max-w-lg rounded-xl bg-accent-red hover:bg-accent-red-hover px-6 py-3.5 text-sm sm:text-base font-black uppercase tracking-wider text-text-inverted disabled:opacity-50 cursor-pointer shadow-lg transition-colors"
          >
            {saving ? t?.savingLabel || 'Saving...' : t?.continueButton || 'Continue'}
          </button>
        </div>
      </div>

      <PerksTogglePopup
        character={perksPopupCharacter}
        perks={allPerks}
        isPerkUnlocked={(perkId) => perkUnlockDraft[perkId] ?? true}
        isPerkLockedAlways={(p) => isDefaultUnlockedPerk(p as OnboardingPerk, characters)}
        onTogglePerk={togglePerkUnlocked}
        onClose={() => setPerksPopupCharacter(null)}
        backendBase={backendBase}
        perksLabel={t?.perksButton || 'Perks'}
        dict={dict}
      />

      <SkipOnboardingModal
        isOpen={isSkipModalOpen}
        onCancel={() => setIsSkipModalOpen(false)}
        onConfirm={handleSkipConfirm}
        dict={dict}
      />
    </div>
  );
};

export default CharacterOnboardingWizard;
