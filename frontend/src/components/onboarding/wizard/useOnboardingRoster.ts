// frontend/src/components/onboarding/wizard/useOnboardingRoster.ts
import { useEffect, useMemo, useState } from 'react';
import { ownershipKey, ownsPerk } from '@/utils/characterUtils';
import { useAuth } from '@/context/AuthContext';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { CATALOG_TTL_MS, fetchCached } from '@/services/dataCache';
import { loadOnboardingDraft, saveOnboardingDraft } from '@/utils/onboardingStorage';
import { authHeaders } from '@/utils/api';
import {
  type ChapterGroup,
  type OnboardingCharacter,
  type OnboardingPerk,
  groupCharactersByChapter,
  isDefaultUnlockedPerk,
  LEGEND_SURVIVOR_ID,
  normalizeChapterKey,
} from '../CharacterOnboardingWizardParts';

export interface ChapterBanner {
  banner_url: string | null;
  banner_local_path: string | null;
}

/** Loads the signed-in user's roster plus the public chapter catalog, and owns the unsaved
 * ownership / perk-unlock drafts (mirrored to storage) with every toggle that edits them. */
export function useOnboardingRoster(locale: string) {
  const { user, token } = useAuth();
  const backendBase = getBackendBaseUrl();

  const [characters, setCharacters] = useState<OnboardingCharacter[]>([]);
  const [allPerks, setAllPerks] = useState<OnboardingPerk[]>([]);
  // Keyed "survivor:7" / "killer:7": the two rosters are numbered separately.
  const [ownershipDraft, setOwnershipDraft] = useState<Record<string, boolean>>({});
  const [perkUnlockDraft, setPerkUnlockDraft] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [chapterBanners, setChapterBanners] = useState<Record<string, ChapterBanner>>({});
  const [translatedChapterNames, setTranslatedChapterNames] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

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
    const headers = authHeaders(token);
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

  return {
    backendBase,
    characters,
    allPerks,
    ownershipDraft,
    perkUnlockDraft,
    loading,
    chapterBanners,
    translatedChapterNames,
    searchQuery,
    setSearchQuery,
    chapterGroups,
    filteredChapterGroups,
    ownedChaptersCount,
    isCharacterOwned,
    isAllOwned,
    hasAnySelection,
    legendCharacter,
    setCharacterOwned,
    toggleChapter,
    handleDeselectAllChapters,
    handleToggleAllChapters,
    togglePerkUnlocked,
    getCharacterPerkStats,
  };
}
