'use client';
// frontend/src/components/onboarding/CharacterOnboardingWizard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Loader2 } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { useAuth } from '@/context/AuthContext';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { getAvatarUrl } from '@/components/character-detail/types';
import { CharacterOwnershipOverlay } from '@/components/characters/CharacterOwnershipOverlay';
import { PerksTogglePopup } from '@/components/characters/PerksTogglePopup';
import { SkipOnboardingModal } from '@/components/onboarding/SkipOnboardingModal';
import { Switch } from '@/components/common/Switch';
import { invalidate } from '@/services/dataCache';
import { getChapterBannerSrc } from '@/utils/mapUtils';
import { LANGUAGES } from '@/components/sidebar/SidebarBottomControls';
import { FlagIcon } from '@/components/sidebar/FlagIcon';

/** Skipped to directly after a language-triggered locale redirect, so the
 * wizard resumes on the roster instead of showing the intro/language steps
 * again -- navigating to a different `/[locale]/welcome` remounts this
 * component fresh, since `dict`/`locale` are resolved by the `[locale]`
 * layout server-side. */
const POST_LANGUAGE_REDIRECT_KEY = 'onboarding_view_after_language_redirect';

/** Ace Visconti, by convention -- matched by wiki_slug (stable across
 * locales) rather than his display name, which is translated. */
const LEGEND_CHARACTER_WIKI_SLUG = 'Ace_Visconti';

/** Prefers the visitor's browser language if it's one of ours, else falls
 * back to whichever locale the wizard is already being viewed in. */
export function detectDefaultLanguage(currentLocale: string): string {
  if (typeof navigator === 'undefined') return currentLocale;
  const browserLang = navigator.language?.split('-')[0];
  return LANGUAGES.some((l) => l.code === browserLang) ? browserLang! : currentLocale;
}

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
  is_owned: boolean;
  is_free: boolean;
  wiki_slug?: string;
  avatar_url?: string;
  avatar_local_path?: string;
}

export interface OnboardingPerk {
  perk_id: number;
  name: string;
  character_id: number | null;
  is_teachable: boolean;
  is_unlocked: boolean;
  icon_url?: string;
  icon_local_path?: string;
}

export interface ChapterGroup {
  chapterName: string;
  releaseNumber: number;
  characters: OnboardingCharacter[];
}

/** Groups characters by `chapter_name` (falling back to "Base Game" for
 * null, matching the backend's own default in Character.to_dict), ordered
 * by each chapter's `release_number` ascending. */
export function groupCharactersByChapter(characters: OnboardingCharacter[]): ChapterGroup[] {
  const byChapter = new Map<string, ChapterGroup>();

  for (const c of characters) {
    const chapterName = c.chapter_name || 'Base Game';
    if (!byChapter.has(chapterName)) {
      byChapter.set(chapterName, {
        chapterName,
        releaseNumber: c.release_number ?? 0,
        characters: [],
      });
    }
    byChapter.get(chapterName)!.characters.push(c);
  }

  return Array.from(byChapter.values()).sort((a, b) => a.releaseNumber - b.releaseNumber);
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
  const [ownershipDraft, setOwnershipDraft] = useState<Record<number, boolean>>({});
  const [perkUnlockDraft, setPerkUnlockDraft] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [perksPopupCharacter, setPerksPopupCharacter] = useState<OnboardingCharacter | null>(null);
  const [chapterBanners, setChapterBanners] = useState<Record<string, ChapterBanner>>({});
  const [translatedChapterNames, setTranslatedChapterNames] = useState<Record<string, string>>({});
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [view, setView] = useState<'intro' | 'language' | 'roster'>(() =>
    typeof window !== 'undefined' && sessionStorage.getItem(POST_LANGUAGE_REDIRECT_KEY) ? 'roster' : 'intro'
  );
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => detectDefaultLanguage(locale));
  const [savingLanguage, setSavingLanguage] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem(POST_LANGUAGE_REDIRECT_KEY);
  }, []);

  const handleLanguageContinue = async () => {
    setSavingLanguage(true);
    await setPreferredLanguage(selectedLanguage);
    if (selectedLanguage !== locale) {
      // Covers both possible outcomes of a [locale] segment change: if it
      // remounts this component, the fresh instance reads this flag on
      // mount; if it doesn't, the setView call below advances it directly.
      sessionStorage.setItem(POST_LANGUAGE_REDIRECT_KEY, '1');
      router.push(`/${selectedLanguage}/welcome`);
    }
    setSavingLanguage(false);
    setView('roster');
  };

  useEffect(() => {
    // Unlike the characters/perks fetch below, /api/v1/chapters is public and
    // not scoped to the signed-in user, so it doesn't belong inside that
    // user/token-gated effect -- it can run unconditionally on mount.
    let cancelled = false;
    fetch(`${backendBase}/api/v1/chapters`)
      .then((res) => res.json())
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
    Promise.all([
      fetch(`${backendBase}/api/v1/users/${user.id}/characters`, { headers }).then((res) => res.json()),
      fetch(`${backendBase}/api/v1/users/${user.id}/perks?lang=${locale}`, { headers }).then((res) => res.json()),
      fetch(`${backendBase}/api/v1/characters?lang=${locale}`).then((res) => res.json()),
    ])
      .then(
        ([charsJson, perksJson, translatedCharsJson]: [
          { data?: OnboardingCharacter[] },
          { data?: OnboardingPerk[] },
          { data?: Array<{ id: number; name: string; chapter_name: string | null }> },
        ]) => {
          if (cancelled) return;
          const chars = charsJson.data || [];
          const perks = perksJson.data || [];
          const translatedById = new Map((translatedCharsJson.data || []).map((c) => [c.id, c]));

          const chapterNameTranslations: Record<string, string> = {};
          const localizedChars = chars.map((c) => {
            const translated = translatedById.get(c.id);
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

          const charDraft: Record<number, boolean> = {};
          chars.forEach((c) => {
            charDraft[c.id] = c.is_owned;
          });
          setOwnershipDraft(charDraft);

          const perkDraft: Record<number, boolean> = {};
          perks.forEach((p) => {
            perkDraft[p.perk_id] = p.is_unlocked;
          });
          setPerkUnlockDraft(perkDraft);

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

  /** The legend's example swatches show a real portrait -- Ace Visconti by
   * convention, matched by wiki_slug since `name` is translated and
   * therefore not stable across locales. Falls back to whichever character
   * loaded first if he isn't present. */
  const legendCharacter = useMemo(
    () => characters.find((c) => c.wiki_slug === LEGEND_CHARACTER_WIKI_SLUG) ?? characters[0],
    [characters]
  );

  /** Whole-character toggle cascades to that character's teachable perks in
   * the draft too, mirroring the backend's own cascade in
   * mutate_character_ownership -- so a chapter-level "I own this" click
   * unlocks its perks immediately instead of leaving them stuck locked
   * until the next save round-trip. */
  const setCharacterOwned = (characterId: number, owned: boolean) => {
    setOwnershipDraft((prev) => ({ ...prev, [characterId]: owned }));
    setPerkUnlockDraft((prev) => {
      const next = { ...prev };
      allPerks
        .filter((p) => p.character_id === characterId)
        .forEach((p) => {
          next[p.perk_id] = owned;
        });
      return next;
    });
  };

  const toggleChapter = (group: ChapterGroup, own: boolean) => {
    group.characters.forEach((c) => setCharacterOwned(c.id, own));
  };

  /** Marks every loaded chapter owned in one shot, for players who own most
   * or all of them and don't want to click through each row. */
  const handleSelectAllChapters = () => {
    chapterGroups.forEach((group) => toggleChapter(group, true));
  };

  const togglePerkUnlocked = (perkId: number) => {
    setPerkUnlockDraft((prev) => ({ ...prev, [perkId]: !(prev[perkId] ?? true) }));
  };

  const getCharacterPerkStats = (characterId: number) => {
    const perksForChar = allPerks.filter((p) => p.character_id === characterId);
    const unlocked = perksForChar.filter((p) => perkUnlockDraft[p.perk_id] ?? true).length;
    return { total: perksForChar.length, unlocked };
  };

  const handleContinue = async () => {
    setSaving(true);
    const characterUpdates = characters.map((c) => ({
      character_id: c.id,
      is_owned: ownershipDraft[c.id] ?? c.is_owned,
    }));
    const perkUpdates = allPerks.map((p) => ({
      perk_id: p.perk_id,
      is_unlocked: perkUnlockDraft[p.perk_id] ?? p.is_unlocked,
    }));
    await bulkUpdateCharacterOwnership(characterUpdates);
    await bulkUpdatePerkOwnership(perkUpdates);
    invalidate(`${backendBase}/api/v1/perks`);
    invalidate(`${backendBase}/api/v1/characters`);
    await markOnboardingComplete();
    setSaving(false);
    onFinished();
  };

  const handleSkipConfirm = async () => {
    setSaving(true);
    await markOnboardingComplete();
    setSaving(false);
    onFinished();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-amber" />
      </div>
    );
  }

  if (view === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="w-full max-w-md rounded-2xl border border-border-color bg-bg-surface p-8 text-center space-y-4 shadow-2xl">
          <h1 className="text-xl font-black">{t?.introTitle || 'Welcome to LemonDBD'}</h1>
          <p className="text-sm text-text-secondary">
            {t?.introBody ||
              'To tailor the site to your progress in the game, please mark which chapters, characters, and perks you already own.'}
          </p>
          <button
            type="button"
            onClick={() => setView('language')}
            className="w-full rounded-xl bg-accent-amber hover:bg-accent-amber-hover py-3 text-sm font-black uppercase tracking-wider text-text-inverted cursor-pointer"
          >
            {t?.introContinueButton || 'Get Started'}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'language') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
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
                onClick={() => setSelectedLanguage(lang.code)}
                aria-pressed={selectedLanguage === lang.code}
                className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer ${
                  selectedLanguage === lang.code
                    ? 'border-accent-amber bg-accent-amber/10 text-accent-amber'
                    : 'border-border-color text-text-secondary hover:border-accent-amber/50'
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
            className="w-full rounded-xl bg-accent-amber hover:bg-accent-amber-hover py-3 text-sm font-black uppercase tracking-wider text-text-inverted disabled:opacity-50 cursor-pointer"
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="text-center space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1" aria-hidden="true" />
            <h1 className="text-2xl font-black">{t?.heading || 'Which characters do you already own?'}</h1>
            <div className="flex flex-1 justify-end">
              <button
                type="button"
                onClick={() => setIsSkipModalOpen(true)}
                className="shrink-0 rounded-xl border-2 border-accent-amber/60 bg-accent-amber/10 px-5 py-2.5 text-sm font-bold text-accent-amber cursor-pointer"
              >
                {t?.skipButton || 'Skip'}
              </button>
            </div>
          </div>
          <p className="text-sm text-text-secondary max-w-2xl mx-auto">
            {t?.subheading ||
              'Pick the chapters you own so the perk randomizer and streaks only offer you perks you can actually use. You can always change this later from your Characters page.'}
          </p>
        </header>

        <section className="rounded-2xl border border-border-color bg-bg-surface p-4 flex flex-wrap items-center gap-6">
          <h2 className="w-full text-xs font-black uppercase tracking-wider text-text-secondary">
            {t?.legendTitle || 'How this works'}
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex aspect-[3/4] w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-emerald-500/40 bg-emerald-500/20">
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
              />
            </span>
            {t?.legendOwned || 'Owned - fully available'}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex aspect-[3/4] w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-accent-amber bg-bg-elevated">
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
              />
            </span>
            {t?.legendLocked || 'Locked - not available yet'}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex aspect-[3/4] w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-accent-amber bg-bg-elevated">
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
              />
            </span>
            {t?.legendPartial || 'Partially unlocked - some perks unlocked by hand'}
          </div>
          <p className="w-full text-[11px] text-text-secondary">
            {t?.legendCustomizeHint ||
              "Tap a locked character's Perks button to unlock individual perks without owning the whole character."}
          </p>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSelectAllChapters}
            className="rounded-lg border border-border-color px-3.5 py-1.5 text-xs font-bold text-text-secondary hover:border-accent-amber hover:text-accent-amber transition-colors cursor-pointer"
          >
            {t?.selectAllButton || 'I own everything'}
          </button>
        </div>

        {chapterGroups.map((group) => {
          const isExpanded = expandedChapter === group.chapterName;
          const banner = chapterBanners[normalizeChapterKey(group.chapterName)];
          const bannerSrc = getChapterBannerSrc(banner, backendBase);
          const chapterOwned = group.characters.every((c) => (ownershipDraft[c.id] ?? c.is_owned));
          // Display only -- expandedChapter/aria-id/banner lookups all key off
          // the canonical group.chapterName above, never this localized text.
          const chapterDisplayName = translatedChapterNames[group.chapterName] || group.chapterName;
          const chapterSwitchLabel = `${t?.ownChapterButton || 'I own this chapter'}: ${chapterDisplayName}`;
          const chapterPanelId = `chapter-panel-${slugifyChapterName(group.chapterName)}`;
          const toggleExpanded = () =>
            setExpandedChapter((prev) => (prev === group.chapterName ? null : group.chapterName));

          return (
            <section key={group.chapterName} className="space-y-3">
              <div
                role="button"
                tabIndex={0}
                onClick={toggleExpanded}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpanded();
                  }
                }}
                aria-expanded={isExpanded}
                aria-controls={chapterPanelId}
                className="group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-xl border border-border-color bg-bg-surface text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber"
              >
                {/* Fixed-size box (not just object-contain) so every banner
                    reads at the same visual weight regardless of its source
                    image's native aspect ratio, which varies widely. */}
                <div className="flex w-full items-center gap-3 px-3 py-2.5">
                  <h3 className="flex-1 truncate font-extrabold text-sm">{chapterDisplayName}</h3>
                  {bannerSrc && (
                    <img
                      src={bannerSrc}
                      alt=""
                      aria-hidden="true"
                      className="h-16 w-44 shrink-0 object-contain"
                    />
                  )}
                  <div className="flex flex-1 shrink-0 items-center justify-end gap-3">
                    <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <Switch checked={chapterOwned} onChange={(checked) => toggleChapter(group, checked)} ariaLabel={chapterSwitchLabel} />
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 text-text-secondary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key={chapterPanelId}
                    id={chapterPanelId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {group.characters.map((c) => {
                        const isOwned = ownershipDraft[c.id] ?? c.is_owned;
                        const perkStats = getCharacterPerkStats(c.id);
                        const hasPartialPerks = !isOwned && perkStats.unlocked > 0;
                        return (
                          <div
                            key={c.id}
                            className="group relative flex flex-col overflow-hidden rounded-xl border border-border-color bg-bg-surface"
                          >
                            <button
                              type="button"
                              onClick={() => setCharacterOwned(c.id, !isOwned)}
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
                              <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-bold text-white text-center">
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
            </section>
          );
        })}

        <div className="h-4" />
      </div>

      {/* Sticky so Continue stays reachable while scrolling a long chapter
          list, instead of requiring a scroll to the very bottom. */}
      <div className="sticky bottom-0 z-20 w-full border-t border-border-color bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl justify-center px-4 py-3 sm:px-8">
          <button
            type="button"
            disabled={saving}
            onClick={handleContinue}
            className="w-full max-w-sm rounded-xl bg-accent-amber hover:bg-accent-amber-hover px-6 py-3.5 text-sm font-black uppercase tracking-wider text-text-inverted disabled:opacity-50 cursor-pointer"
          >
            {saving ? t?.savingLabel || 'Saving...' : t?.continueButton || 'Continue'}
          </button>
        </div>
      </div>

      <PerksTogglePopup
        character={perksPopupCharacter}
        perks={allPerks}
        isPerkUnlocked={(perkId) => perkUnlockDraft[perkId] ?? true}
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
