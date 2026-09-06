'use client';
// frontend/src/components/onboarding/CharacterOnboardingWizard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Lock, Loader2, X } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { useAuth } from '@/context/AuthContext';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { getAvatarUrl } from '@/components/character-detail/types';
import { CharacterOwnershipOverlay } from '@/components/characters/CharacterOwnershipOverlay';
import { SkipOnboardingModal } from '@/components/onboarding/SkipOnboardingModal';
import { Switch } from '@/components/common/Switch';
import { invalidate } from '@/services/dataCache';
import { getChapterBannerSrc } from '@/utils/mapUtils';

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

/** Resolves a character card portrait through the same helper CharactersHub
 * uses, so the wizard's grid matches the Characters page exactly. The
 * ownership endpoint's own `avatar_url` is just `portrait_url`, which is
 * blank for most characters -- the helper derives the static avatar path. */
/** Turns a chapter name into an id-safe token for the accordion header's
 * `aria-controls`/panel `id` pair -- chapter names contain spaces and
 * punctuation (e.g. "A Nightmare on Elm Street"), which are not valid inside
 * an HTML id. */
function slugifyChapterName(chapterName: string): string {
  return chapterName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
  dict,
  onFinished,
}) => {
  const { user, token, bulkUpdateCharacterOwnership, bulkUpdatePerkOwnership, markOnboardingComplete } =
    useAuth();
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
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [view, setView] = useState<'intro' | 'roster'>('intro');

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
          byName[chapter.name] = {
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
    // Both GET endpoints are @login_required on the backend, so the bearer
    // token is mandatory here -- without it they answer 401 and the wizard
    // renders an empty roster.
    if (!user || !token) return;
    let cancelled = false;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${backendBase}/api/v1/users/${user.id}/characters`, { headers }).then((res) => res.json()),
      fetch(`${backendBase}/api/v1/users/${user.id}/perks`, { headers }).then((res) => res.json()),
    ])
      .then(
        ([charsJson, perksJson]: [
          { data?: OnboardingCharacter[] },
          { data?: OnboardingPerk[] },
        ]) => {
          if (cancelled) return;
          const chars = charsJson.data || [];
          const perks = perksJson.data || [];
          setCharacters(chars);
          setAllPerks(perks);

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
  }, [user, token, backendBase]);

  const chapterGroups = useMemo(() => groupCharactersByChapter(characters), [characters]);

  /** The legend's example swatches show a real portrait rather than a
   * placeholder icon, so it needs some loaded character to render -- Ace
   * Visconti by convention, falling back to whichever character loaded
   * first if he isn't present in a future dataset. */
  const legendCharacter = useMemo(
    () => characters.find((c) => c.name === 'Ace Visconti') ?? characters[0],
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
            onClick={() => setView('roster')}
            className="w-full rounded-xl bg-accent-amber hover:bg-accent-amber-hover py-3 text-sm font-black uppercase tracking-wider text-text-inverted cursor-pointer"
          >
            {t?.introContinueButton || 'Get Started'}
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
            <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-emerald-500/40 bg-emerald-500/20">
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
            <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-accent-amber bg-bg-elevated">
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
            <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-accent-amber bg-bg-elevated">
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

        {chapterGroups.map((group) => {
          const isExpanded = expandedChapter === group.chapterName;
          const banner = chapterBanners[group.chapterName];
          const bannerSrc = getChapterBannerSrc(banner, backendBase);
          const chapterOwned = group.characters.every((c) => (ownershipDraft[c.id] ?? c.is_owned));
          const chapterSwitchLabel = `${t?.ownChapterButton || 'I own this chapter'}: ${group.chapterName}`;
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
                {bannerSrc ? (
                  <div className="relative h-20 w-full overflow-hidden bg-slate-900">
                    <img
                      src={bannerSrc}
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-contain"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
                    <h3 className="absolute bottom-2 left-3 text-sm font-extrabold text-white drop-shadow">
                      {group.chapterName}
                    </h3>
                    <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-3">
                      <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <Switch checked={chapterOwned} onChange={(checked) => toggleChapter(group, checked)} ariaLabel={chapterSwitchLabel} />
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 text-white transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex w-full items-center justify-between px-4 py-3">
                    <h3 className="font-extrabold text-sm">{group.chapterName}</h3>
                    <div className="flex items-center gap-3">
                      <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <Switch checked={chapterOwned} onChange={(checked) => toggleChapter(group, checked)} ariaLabel={chapterSwitchLabel} />
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 text-text-secondary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {isExpanded && (
              <div id={chapterPanelId} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
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
              )}
            </section>
          );
        })}

        <div className="flex justify-end pt-4">
          <button
            type="button"
            disabled={saving}
            onClick={handleContinue}
            className="rounded-xl bg-accent-amber hover:bg-accent-amber-hover px-6 py-3 text-sm font-black uppercase tracking-wider text-text-inverted disabled:opacity-50 cursor-pointer"
          >
            {saving ? t?.savingLabel || 'Saving...' : t?.continueButton || 'Continue'}
          </button>
        </div>
      </div>

      {perksPopupCharacter && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-perks-popup-title"
        >
          <div
            onClick={() => setPerksPopupCharacter(null)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border-color bg-bg-surface shadow-2xl text-text-primary"
          >
            <div className="flex items-center justify-between border-b border-border-color p-5">
              <h3 id="onboarding-perks-popup-title" className="text-base font-bold text-text-primary">
                {perksPopupCharacter.name} {t?.perksButton || 'Perks'}
              </h3>
              <button
                type="button"
                onClick={() => setPerksPopupCharacter(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-2">
              {allPerks
                .filter((p) => p.character_id === perksPopupCharacter.id)
                .map((perk) => {
                  const isUnlocked = perkUnlockDraft[perk.perk_id] ?? true;
                  return (
                    <button
                      key={perk.perk_id}
                      type="button"
                      onClick={() => togglePerkUnlocked(perk.perk_id)}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition-all ${
                        isUnlocked
                          ? 'border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'border-border-color bg-bg-primary text-text-muted hover:border-accent-amber/50'
                      }`}
                    >
                      <span className="flex-1 text-text-primary">{perk.name}</span>
                      {isUnlocked ? (
                        <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Lock className="h-4 w-4 shrink-0 text-text-muted" />
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

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
