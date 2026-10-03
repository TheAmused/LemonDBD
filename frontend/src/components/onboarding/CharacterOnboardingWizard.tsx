'use client';
// frontend/src/components/onboarding/CharacterOnboardingWizard.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ownershipKey, ownsPerk } from '@/utils/characterUtils';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Info, Search, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getBackendBaseUrl } from '@/utils/perkUtils';
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
import { Spinner } from '@/components/common/Spinner';
import { SwitchTrack } from '@/components/common/Switch';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { type OnboardingCharacter, type OnboardingPerk, type OnboardingView, resolveOnboardingView, RESUME_VIEW_KEY, normalizeChapterKey, isDefaultUnlockedPerk, groupCharactersByChapter, CHAPTER_GRID_BREAKPOINTS, LEGEND_SURVIVOR_ID, type ChapterGroup, AuthModal, resolveOnboardingAvatar, slugifyChapterName } from "./CharacterOnboardingWizardParts";
import { authHeaders } from '@/utils/api';
import { useDictionary } from "@/context/DictionaryContext";
// Minimum 3 columns on mobile small screens as requested.

export interface ChapterBanner {
  banner_url: string | null;
  banner_local_path: string | null;
}

export interface CharacterOnboardingWizardProps {
  locale: string;
  onFinished: () => void;
}

export const CharacterOnboardingWizard: React.FC<CharacterOnboardingWizardProps> = ({ locale, onFinished }) => {
  const dict = useDictionary();
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
  const t = dict.onboarding;

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
            {dict.user.authRequiredTitle}
          </h1>
          <p className="type-body text-text-secondary">
            {dict.user.authRequiredDesc}
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="primary"
              onClick={() => setIsAuthModalOpen(true)}
              leftIcon={<UserIcon className="h-4 w-4" />}
              className="w-full"
            >
              <span>{dict.user.signIn}</span>
            </Button>
            <Link
              href={`/${locale}`}
              className="py-1 text-xs text-text-muted transition-colors hover:text-accent-red"
            >
              {dict.user.returnToHome}
            </Link>
          </div>
        </div>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </div>
    );
  }

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" tone="accent" />
      </div>
    );
  }

  if (view === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border-color bg-bg-surface p-8 text-center space-y-4 shadow-2xl">
          <h1 className="text-xl font-black">{t.introTitle}</h1>
          <p className="text-sm text-text-secondary">
            {t.introBody}
          </p>
          <Button variant="primary" onClick={() => setView('language')} className="w-full">
            {t.introContinueButton}
          </Button>
        </div>
      </div>
    );
  }

  if (view === 'language') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border-color bg-bg-surface p-8 text-center space-y-4 shadow-2xl">
          <h1 className="text-xl font-black">{t.languageStepTitle}</h1>
          <p className="text-sm text-text-secondary">
            {t.languageStepBody}
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
          <Button variant="primary" disabled={savingLanguage} onClick={handleLanguageContinue} className="w-full">
            {savingLanguage
              ? t.savingLabel
              : t.languageContinueButton}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2.5 sm:p-5 lg:p-6 pb-32 sm:pb-36 lg:pb-36">
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
                {t.skipButton}
              </button>
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-text-primary px-2">
              {t.heading}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-xl mx-auto px-2">
              {t.subheading}
            </p>
            <div className="sm:hidden pt-0.5">
              <button
                type="button"
                onClick={() => setIsSkipModalOpen(true)}
                className="shrink-0 rounded-xl border border-accent-amber/50 bg-accent-amber/10 px-3 py-1 type-strong text-accent-amber hover:bg-accent-amber/20 transition-colors cursor-pointer"
              >
                {t.skipButton}
              </button>
            </div>
          </header>

          <hr className="border-t border-border-color/60 mt-0.5 mb-3 sm:mb-5 lg:mb-6" />

          {/* Legend Section ("Jak to działa") */}
          <section className="flex flex-col items-center text-center space-y-1.5 sm:space-y-2">
            <h2 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wider text-text-primary">
              {t.legendTitle}
            </h2>
            <div className="grid grid-cols-3 items-start justify-items-center gap-2 sm:gap-6 w-full max-w-xl mx-auto">
              {/* Locked */}
              <div className="flex flex-col items-center text-center gap-2 w-full max-w-[150px]">
                <span className="relative flex aspect-[3/4] w-14 sm:w-16 md:w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-color bg-bg-surface shadow-sm">
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
                <span className="text-tiny sm:text-xs font-semibold text-text-primary leading-tight">
                  {t.legendLocked}
                </span>
              </div>

              {/* Partial */}
              <div className="flex flex-col items-center text-center gap-2 w-full max-w-[150px]">
                <span className="relative flex aspect-[3/4] w-14 sm:w-16 md:w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-color bg-bg-surface shadow-sm">
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
                <span className="text-tiny sm:text-xs font-semibold text-text-primary leading-tight">
                  {t.legendPartial}
                </span>
              </div>

              {/* Owned */}
              <div className="flex flex-col items-center text-center gap-2 w-full max-w-[150px]">
                <span className="relative flex aspect-[3/4] w-14 sm:w-16 md:w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-color bg-bg-surface shadow-sm">
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
                <span className="text-tiny sm:text-xs font-semibold text-text-primary leading-tight">
                  {t.legendOwned}
                </span>
              </div>
            </div>
          </section>

          <hr className="border-t border-border-color/60 mt-0.5 mb-2.5 sm:mb-3.5" />

          {/* DLC / Chapters Section */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="type-label-sm text-text-secondary">
                  {t.chaptersTitle}
                </span>
                <span className="rounded-full border border-border-color bg-bg-elevated px-2 py-0.5 type-strong-xs text-text-secondary">
                  {ownedChaptersCount} / {chapterGroups.length}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                  <Input
                    type="text"
                    fieldSize="sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="pl-8 pr-7"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label={dict.filters.clearSearch}
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
                        ? 'border-accent-red/80 bg-accent-red/15 text-accent-red'
                        : 'border-border-color bg-bg-surface text-text-secondary hover:border-accent-red/60 hover:text-text-primary'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`relative flex h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0 items-center justify-center rounded-[3px] border transition-all duration-150 ${
                        isAllOwned
                          ? 'border-accent-red bg-accent-red text-text-inverted'
                          : 'border-border-color/80 bg-bg-elevated/80 group-hover:border-accent-red/80'
                      }`}
                    >
                      {isAllOwned && <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[3]" />}
                    </span>
                    <span className="text-xs font-bold tracking-tight">
                      {t.selectAllButton}
                    </span>
                  </button>

                  <Button variant="secondary" size="sm" disabled={!hasAnySelection} onClick={handleDeselectAllChapters}>
                    {t.deselectAllButton}
                  </Button>
                </div>
              </div>
            </div>

            <p className="flex items-start gap-1.5 text-tiny sm:text-mini text-text-secondary">
              <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 mt-0.5" />
              <span>
                {t.legendCustomizeHint}
              </span>
            </p>

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
            const chapterSwitchLabel = `${t.ownChapterButton}: ${chapterDisplayName}`;
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
                      <span className="px-1 sm:px-2 text-center text-tiny sm:text-sm font-extrabold text-text-secondary line-clamp-2">{chapterDisplayName}</span>
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
                      be nested here; SwitchTrack is its presentational half. */}
                  <button
                    type="button"
                    onClick={() => toggleChapter(group, !chapterOwned)}
                    role="switch"
                    aria-checked={chapterOwned}
                    aria-label={chapterSwitchLabel}
                    className="flex w-full items-center justify-between gap-1 sm:gap-2 border-t border-border-color px-1.5 py-1 sm:px-2.5 sm:py-2 text-left cursor-pointer hover:bg-bg-elevated transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-red"
                  >
                    <h3 className="flex-1 text-micro sm:text-xs font-bold sm:font-extrabold leading-tight line-clamp-2 min-h-[22px] sm:min-h-[32px] flex items-center text-text-primary break-words">
                      {chapterDisplayName}
                    </h3>
                    <SwitchTrack checked={chapterOwned} size="sm" />
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
                                lockedTitle={dict.modal.unownedPerk}
                                ownedTitle={dict.filters.ownedOnly}
                              />
                              <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-bg-primary/80 px-1.5 py-0.5 type-strong-2xs text-text-inverted text-center">
                                {c.name}
                              </span>
                            </button>
                            {!isOwned && perkStats.total > 0 && (
                              <button
                                type="button"
                                onClick={() => setPerksPopupCharacter(c)}
                                className="w-full border-t border-border-color bg-accent-amber/10 px-1.5 py-1 type-strong-2xs text-accent-amber hover:bg-accent-amber/20 transition-colors cursor-pointer"
                              >
                                {t.perksButton} ({perkStats.unlocked}/{perkStats.total})
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

      <div className="h-4" />
    </div>
  </div>

      {/* Sticky full-screen bottom continue banner so Continue stays reachable while scrolling */}
      <div className="fixed bottom-0 inset-x-0 z-30 w-full border-t border-border-color bg-bg-surface/95 backdrop-blur-md shadow-2xl">
        <div className="mx-auto flex w-full max-w-7xl justify-center px-4 py-3 sm:py-4">
          <Button variant="primary" disabled={saving} onClick={handleContinue} className="w-full max-w-sm sm:max-w-md">
            {saving ? t.savingLabel : t.continueButton}
          </Button>
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
        perksLabel={t.perksButton}
      />

      <SkipOnboardingModal
        isOpen={isSkipModalOpen}
        onCancel={() => setIsSkipModalOpen(false)}
        onConfirm={handleSkipConfirm}
      />
    </div>
  );
};

export { resolveOnboardingView, isDefaultUnlockedPerk, groupCharactersByChapter, normalizeChapterKey } from "./CharacterOnboardingWizardParts";
export type { OnboardingCharacter, OnboardingPerk, ChapterGroup } from "./CharacterOnboardingWizardParts";
