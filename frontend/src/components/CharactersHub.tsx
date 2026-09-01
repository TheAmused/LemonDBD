'use client';
// frontend/src/components/CharactersHub.tsx

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  Shield,
  Skull,
  Search,
  X,
  Sparkles,
  Package,
  User,
  Lock,
  Check,
  MailWarning,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DisabledBadge } from '@/components/DisabledBadge';
import { useSidebarState } from '@/hooks/useSidebarState';
import { DbdSpinner } from '@/components/DbdSpinner';

const AuthModal = dynamic(() => import('@/components/AuthModal').then((m) => m.AuthModal), { ssr: false });
const DisabledReasonModal = dynamic(
  () => import('@/components/DisabledReasonModal').then((m) => m.DisabledReasonModal),
  { ssr: false }
);
import {
  CharacterItem,
  PerkItem,
  AddonItem,
  EquipmentItem,
  getCharacterSlug,
  getAssetUrl,
  getAvatarUrl as resolveAvatarUrl,
  getRarityTileStyle,
} from '@/components/character-detail/types';
import { RoleCategory, PerkDictionary } from '@/types/perks';
import type { Dictionary } from '@/locales/types';
import { getBackendBaseUrl } from '@/utils/perkUtils';

interface OwnedCharacter {
  id: number;
  name: string;
  role: string;
  is_owned: boolean;
}

interface OwnedPerk {
  perk_id: number;
  name: string;
  character_id: number | null;
  is_teachable: boolean;
  is_unlocked: boolean;
  icon_url?: string;
  icon_local_path?: string;
}

export interface CharacterDetailData {
  character: CharacterItem;
  perks: PerkItem[];
  addons: AddonItem[];
  items?: EquipmentItem[];
}

interface CharactersHubProps {
  dict?: PerkDictionary;
}

export const CharactersHub: React.FC<CharactersHubProps> = ({ dict }) => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';
  const {
    isAuthenticated,
    token,
    user,
    bulkUpdateCharacterOwnership,
    bulkUpdatePerkOwnership,
  } = useAuth();
  const { isCollapsed } = useSidebarState();

  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<RoleCategory>('Survivor');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const roleParam = searchParams?.get('role') || searchParams?.get('tab') || '';

  useEffect(() => {
    if (roleParam) {
      const lower = roleParam.toLowerCase();
      if (lower === 'killer' || lower === 'killers') {
        setActiveTab('Killer');
      } else if (lower === 'survivor' || lower === 'survivors') {
        setActiveTab('Survivor');
      }
    }
  }, [roleParam]);

  const handleTabChange = (tab: RoleCategory) => {
    setActiveTab(tab);
    router.replace(`/${locale}/characters?role=${tab}`, { scroll: false });
  };

  const [selectedCharacter, setSelectedCharacter] = useState<CharacterItem | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailData, setDetailData] = useState<CharacterDetailData | null>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalIntent, setAuthModalIntent] = useState<'login' | 'verify'>('login');
  const [verificationNoticeOpen, setVerificationNoticeOpen] = useState<boolean>(false);
  const [ownershipMode, setOwnershipMode] = useState<boolean>(false);
  const [ownershipLoading, setOwnershipLoading] = useState<boolean>(false);
  const [ownershipSaving, setOwnershipSaving] = useState<boolean>(false);
  const [ownershipSaveError, setOwnershipSaveError] = useState<string | null>(null);
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);
  const [characterOwnershipDraft, setCharacterOwnershipDraft] = useState<Record<number, boolean>>({});
  const [perkUnlockDraft, setPerkUnlockDraft] = useState<Record<number, boolean>>({});
  const [allPerks, setAllPerks] = useState<OwnedPerk[]>([]);
  const [perksPopupCharacter, setPerksPopupCharacter] = useState<CharacterItem | null>(null);
  const [disabledModalCharacter, setDisabledModalCharacter] = useState<CharacterItem | null>(null);

  const backendBase = getBackendBaseUrl();

  useEffect(() => {
    async function fetchCharacters() {
      setLoading(true);
      try {
        const res = await fetch(`${backendBase}/api/v1/characters?lang=${locale}`);
        if (res.ok) {
          const data = await res.json();
          setCharacters(data.data || []);
        }
      } catch (err: unknown) {
        console.error('Failed to fetch characters:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCharacters();
  }, [backendBase, locale]);

  const handleCloseModal = useCallback(() => {
    setSelectedCharacter(null);
    setDetailData(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedCharacter) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCharacter, handleCloseModal]);

  const handleToggleOwnershipMode = async () => {
    if (ownershipMode) {
      setOwnershipMode(false);
      return;
    }
    if (!isAuthenticated || !token || !user) {
      setAuthModalIntent('login');
      setIsAuthModalOpen(true);
      return;
    }
    if (!user.is_verified) {
      setVerificationNoticeOpen(true);
      return;
    }

    setOwnershipLoading(true);
    try {
      const [charsRes, perksRes] = await Promise.all([
        fetch(`${backendBase}/api/v1/users/${user.id}/characters`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${backendBase}/api/v1/users/${user.id}/perks`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const charDraft: Record<number, boolean> = {};
      if (charsRes.ok) {
        const data = await charsRes.json();
        (data.data as OwnedCharacter[]).forEach((c) => {
          charDraft[c.id] = c.is_owned;
        });
      }

      const perkDraft: Record<number, boolean> = {};
      let perksList: OwnedPerk[] = [];
      if (perksRes.ok) {
        const data = await perksRes.json();
        perksList = data.data as OwnedPerk[];
        perksList.forEach((p) => {
          perkDraft[p.perk_id] = p.is_unlocked;
        });
      }

      setCharacterOwnershipDraft(charDraft);
      setPerkUnlockDraft(perkDraft);
      setAllPerks(perksList);
      setOwnershipMode(true);
    } catch (err: unknown) {
      console.error('Failed to load ownership state:', err);
    } finally {
      setOwnershipLoading(false);
    }
  };

  const handleToggleCharacterOwned = (characterId: number) => {
    const newIsOwned = !(characterOwnershipDraft[characterId] ?? true);
    setCharacterOwnershipDraft((prev) => ({
      ...prev,
      [characterId]: newIsOwned,
    }));

    setPerkUnlockDraft((prev) => {
      const next = { ...prev };
      allPerks
        .filter((p) => p.character_id === characterId)
        .forEach((p) => {
          next[p.perk_id] = newIsOwned;
        });
      return next;
    });
  };

  const handleTogglePerkUnlocked = (perkId: number) => {
    setPerkUnlockDraft((prev) => ({
      ...prev,
      [perkId]: !(prev[perkId] ?? true),
    }));
  };

  const handleCancelOwnershipMode = () => {
    setOwnershipMode(false);
    setCharacterOwnershipDraft({});
    setPerkUnlockDraft({});
    setAllPerks([]);
    setPerksPopupCharacter(null);
    setOwnershipSaveError(null);
  };

  const handleSaveOwnership = async () => {
    setOwnershipSaving(true);
    setOwnershipSaveError(null);
    try {
      const characterUpdates = Object.entries(characterOwnershipDraft).map(([characterId, isOwned]) => ({
        character_id: Number(characterId),
        is_owned: isOwned,
      }));
      const perkUpdates = Object.entries(perkUnlockDraft).map(([perkId, isUnlocked]) => ({
        perk_id: Number(perkId),
        is_unlocked: isUnlocked,
      }));

      const charactersOk =
        characterUpdates.length === 0 || (await bulkUpdateCharacterOwnership(characterUpdates));
      const perksOk = perkUpdates.length === 0 || (await bulkUpdatePerkOwnership(perkUpdates));

      if (!charactersOk || !perksOk) {
        setOwnershipSaveError('Failed to save all changes. Please try again.');
        return;
      }

      handleCancelOwnershipMode();
      setShowSavedToast(true);
      window.setTimeout(() => setShowSavedToast(false), 2500);
    } catch (err: unknown) {
      console.error('Failed to save ownership changes:', err);
      setOwnershipSaveError('Failed to save changes. Please try again.');
    } finally {
      setOwnershipSaving(false);
    }
  };

  const getCharacterPerkStats = (characterId?: number) => {
    if (!characterId) return { total: 0, unlocked: 0 };
    const perksForChar = allPerks.filter((p) => p.character_id === characterId);
    const unlocked = perksForChar.filter((p) => perkUnlockDraft[p.perk_id] ?? true).length;
    return { total: perksForChar.length, unlocked };
  };

  const filteredCharacters = useMemo(() => {
    return characters.filter((c) => {
      const matchesTab =
        c.category?.toLowerCase() === activeTab.toLowerCase();
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        c.name.toLowerCase().includes(query) ||
        (c.real_name && c.real_name.toLowerCase().includes(query));
      return matchesTab && matchesSearch;
    });
  }, [characters, activeTab, searchQuery]);

  const survivorCount = characters.filter((c) => c.category === 'Survivor').length;
  const killerCount = characters.filter((c) => c.category === 'Killer').length;

  return (
    <div className={`space-y-6 ${ownershipMode ? 'pb-20' : ''}`}>
      <section
        aria-label={dict?.characterDetail?.characterOverview || 'Character Filter Navigation'}
        className="flex flex-col sm:flex-row gap-4 justify-between items-center"
      >
        <div
          role="group"
          aria-label={dict?.filters?.category || 'Filter characters by role'}
          className="relative flex items-center w-full sm:w-72 h-11 p-1 bg-slate-100/90 border border-slate-200 dark:bg-slate-900/90 dark:border-slate-800 rounded-2xl shadow-inner select-none"
        >
          <span
            aria-hidden="true"
            className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl shadow-md transition-transform duration-300 ease-out ${
              activeTab === 'Survivor'
                ? 'translate-x-0 bg-emerald-600'
                : 'translate-x-[calc(100%+8px)] bg-rose-600'
            }`}
          />
          <button
            type="button"
            onClick={() => handleTabChange('Survivor')}
            aria-pressed={activeTab === 'Survivor'}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 h-full min-h-[40px] rounded-xl text-xs font-bold transition-colors cursor-pointer touch-manipulation ${
              activeTab === 'Survivor'
                ? 'text-white'
                : 'text-slate-600 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            {dict?.filters?.survivor || 'Survivors'} ({survivorCount})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('Killer')}
            aria-pressed={activeTab === 'Killer'}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 h-full min-h-[40px] rounded-xl text-xs font-bold transition-colors cursor-pointer touch-manipulation ${
              activeTab === 'Killer'
                ? 'text-white'
                : 'text-slate-600 hover:text-rose-700 dark:text-slate-400 dark:hover:text-rose-400'
            }`}
          >
            <Skull className="h-3.5 w-3.5" />
            {dict?.filters?.killer || 'Killers'} ({killerCount})
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleToggleOwnershipMode}
            disabled={ownershipLoading}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-2xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait touch-manipulation ${
              ownershipMode
                ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-900/30'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-500/50 hover:text-amber-400'
            }`}
          >
            {ownershipMode ? <X className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {ownershipLoading
              ? dict?.app?.loading || 'Loading...'
              : ownershipMode
                ? dict?.characterDetail?.exitSelection || 'Exit Selection'
                : dict?.characterDetail?.myCharacters || 'My Characters'}
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder={dict?.filters?.filterByCharacter || 'Search by name...'}
            aria-label={dict?.filters?.filterByCharacter || 'Search characters'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 min-h-[44px] rounded-2xl border border-slate-200 bg-slate-100/90 text-xs font-semibold text-slate-900 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={dict?.filters?.clearSearch || 'Clear search query'}
              className="absolute right-1 top-1/2 -translate-y-1/2 flex min-h-[40px] min-w-[40px] items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer touch-manipulation"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      {loading ? (
        <div className="w-full py-12 flex items-center justify-center">
          <DbdSpinner
            size="responsive"
            layout="inline"
            accent="emerald"
            needleSpeed={1.4}
            dict={dict}
            label={dict?.characterDetail?.loading || 'Loading character list...'}
            sublabel="Filtering survivor & killer roster"
          />
        </div>
      ) : filteredCharacters.length === 0 ? (
        <div className="my-12 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-white/60 dark:bg-transparent">
          <User className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600 mb-3" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-300">
            {dict?.empty?.title || 'No Characters Found'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {dict?.characterDetail?.hubNoMatchingCharacters || 'No characters match your current filter or search query.'}
          </p>
        </div>
      ) : (

        <section
          aria-label={dict?.characterDetail?.characterOverview || 'Characters Roster Grid'}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6"
        >
          {filteredCharacters.map((char, idx) => {
            const isSurvivor = char.category?.toLowerCase() === 'survivor';
            const isOwned = char.id ? characterOwnershipDraft[char.id] ?? true : true;
            const perkStats = ownershipMode ? getCharacterPerkStats(char.id) : { total: 0, unlocked: 0 };
            const hasPartialPerks = !isOwned && perkStats.unlocked > 0;
            const showLockedOverlay = !isOwned;
            const avatarSrc = resolveAvatarUrl(backendBase, char, isSurvivor);

            return (
              <div
                key={`${char.name}-${idx}`}
                onClick={() => {
                  if (ownershipMode) {
                    if (char.id) handleToggleCharacterOwned(char.id);
                  } else {
                    router.push(`/${locale}/characters/${getCharacterSlug(char.name)}`);
                  }
                }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:bg-slate-800 hover:border-red-500/50 shadow-sm hover:shadow-xl dark:shadow-none transition-all duration-300 cursor-pointer touch-manipulation"
              >
                <div className="absolute top-2 right-2 z-10">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border backdrop-blur-md ${
                      isSurvivor
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-300'
                    }`}
                  >
                    {isSurvivor ? <Shield className="h-3 w-3" /> : <Skull className="h-3 w-3" />}
                    {isSurvivor
                      ? dict?.characterDetail?.roleSurvivor || 'Survivor'
                      : dict?.characterDetail?.roleKiller || 'Killer'}
                  </span>
                </div>

                {char.is_disabled && !ownershipMode && (
                  <DisabledBadge
                    label={char.name}
                    onClick={() => setDisabledModalCharacter(char)}
                    position="top-2 left-2"
                  />
                )}
                {ownershipMode && !isOwned && (
                  <div
                    className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/80 border border-amber-500/40 text-amber-400 backdrop-blur-md"
                    title={dict?.modal?.unownedPerk || 'Character Locked'}
                  >
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                )}
                {ownershipMode && isOwned && (
                  <div
                    className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 backdrop-blur-md"
                    title={dict?.filters?.ownedOnly || 'Character Owned'}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}

                <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
                  <img
                    src={avatarSrc}
                    alt={char.name}
                    loading="lazy"
                    decoding="async"
                    className={`h-full w-full object-cover object-top transition-transform duration-500 ${
                      char.is_disabled ? 'grayscale opacity-60' : ''
                    } ${ownershipMode && showLockedOverlay ? '' : 'group-hover:scale-105'}`}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.triedFallback) {
                        target.dataset.triedFallback = '1';
                        // Backend writes avatars as WebP; retry that explicitly in case the
                        // initial src (e.g. a stale DB path) pointed somewhere unexpected.
                        target.src = `${backendBase}/static/avatars/${isSurvivor ? 'survivors' : 'killers'}/${getCharacterSlug(char.name)}.webp`;
                      } else if (target.dataset.triedFallback === '1') {
                        target.dataset.triedFallback = '2';
                        // Legacy fallback: some pre-normalization assets may still only exist as .png.
                        target.src = `${backendBase}/static/avatars/${isSurvivor ? 'survivors' : 'killers'}/${getCharacterSlug(char.name)}.png`;
                      }
                    }}
                  />
                  {ownershipMode && showLockedOverlay && (
                    <img
                      src={avatarSrc}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover object-top grayscale pointer-events-none"
                      style={{ clipPath: hasPartialPerks ? 'inset(0 50% 0 0)' : 'inset(0 0 0 0)' }}
                    />
                  )}
                  {ownershipMode && showLockedOverlay && !hasPartialPerks && (
                    <div className="absolute inset-0 bg-slate-950/50" />
                  )}
                  {ownershipMode && hasPartialPerks && (
                    <div className="absolute inset-y-0 left-0 w-1/2 bg-slate-950/50" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/35 via-transparent to-transparent dark:from-slate-950/80" />
                </div>

                <div className="p-3.5 space-y-1">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-1">
                    {char.name}
                  </h3>
                  {ownershipMode && !isOwned && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPerksPopupCharacter(char);
                      }}
                      className="mt-1 w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-400 hover:bg-amber-500/20 transition-colors"
                    >
                      {dict?.filters?.perks || 'Perks'} {perkStats.total > 0 ? `(${perkStats.unlocked}/${perkStats.total})` : ''}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Perks Popup for a Locked Character */}
      {perksPopupCharacter && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="perks-popup-title"
        >
          <div
            onClick={() => setPerksPopupCharacter(null)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <h3 id="perks-popup-title" className="text-base font-bold text-slate-100">
                {perksPopupCharacter.name} {dict?.filters?.perks || 'Perks'}
              </h3>
              <button
                type="button"
                onClick={() => setPerksPopupCharacter(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                aria-label={dict?.modal?.close || 'Close perks popup'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="px-5 pt-4 text-[11px] text-slate-500">
              {dict?.characterDetail?.togglePerkOwnershipHelp || 'Click a perk to toggle whether you own it.'}
            </p>
            <div className="p-5 space-y-2">
              {allPerks

                .filter((p) => p.character_id === perksPopupCharacter.id)
                .map((perk) => {
                  const isUnlocked = perkUnlockDraft[perk.perk_id] ?? true;
                  return (
                    <button
                      key={perk.perk_id}
                      type="button"
                      onClick={() => handleTogglePerkUnlocked(perk.perk_id)}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 ${
                        isUnlocked
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400/70'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-amber-500/50'
                      }`}
                    >
                      <div
                        className={`h-16 w-16 shrink-0 rounded-lg border p-1.5 flex items-center justify-center bg-slate-900 ${
                          isUnlocked ? 'border-emerald-500/30' : 'border-slate-800'
                        }`}
                      >
                        <img
                          src={getAssetUrl(backendBase, perk.icon_local_path, perk.icon_url)}
                          alt={perk.name}
                          className={`h-full w-full object-contain ${
                            isUnlocked ? '' : 'grayscale opacity-50'
                          }`}
                        />
                      </div>
                      <span className="flex-1">{perk.name}</span>
                      {isUnlocked ? (
                        <Check className="h-4 w-4 shrink-0" />
                      ) : (
                        <Lock className="h-4 w-4 shrink-0" />
                      )}
                    </button>
                  );
                })}
              {allPerks.filter((p) => p.character_id === perksPopupCharacter.id).length === 0 && (
                <p className="text-xs text-slate-500 italic">
                  {dict?.characterDetail?.noTeachablePerksForCharacter || dict?.characterDetail?.noPerks || 'No teachable perks for this character.'}
                </p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Save Bar for Ownership Selection Mode */}
      {ownershipMode && (
        <div
          className={`fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md transition-all duration-300 ${
            isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
          }`}
        >
          {ownershipSaveError && (
            <p
              role="alert"
              className="px-5 sm:px-7 lg:px-9 pt-2 text-center text-[11px] font-semibold text-rose-400"
            >
              {ownershipSaveError}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 px-5 sm:px-7 lg:px-9 py-2.5">
            <button
              type="button"
              onClick={handleCancelOwnershipMode}
              disabled={ownershipSaving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors disabled:opacity-60 cursor-pointer"
            >
              {dict?.admin?.cancel || dict?.modal?.close || 'Cancel'}
            </button>
            <button
              type="button"

              onClick={handleSaveOwnership}
              disabled={ownershipSaving}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-md shadow-emerald-900/30 hover:bg-emerald-500 transition-colors disabled:opacity-60 disabled:cursor-wait cursor-pointer"
            >
              {ownershipSaving ? dict?.characterDetail?.saving || 'Saving...' : dict?.characterDetail?.accept || 'Accept'}
            </button>
          </div>
        </div>
      )}

      {/* Save confirmation toast */}
      {showSavedToast && (
        <div
          role="status"
          className="fixed top-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2.5 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-2xl shadow-emerald-900/50 ring-2 ring-emerald-400/50 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <Check className="h-5 w-5" />
          {dict?.characterDetail?.changesSaved || 'Changes saved'}
        </div>
      )}

      {/* Verification required notice */}
      {verificationNoticeOpen && user && (
        <div
          role="status"
          className="fixed top-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-2xl bg-amber-600 px-5 py-3 text-xs font-bold text-white shadow-2xl shadow-amber-900/50 ring-2 ring-amber-400/50 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <MailWarning className="h-4 w-4 shrink-0" />
          <span>{dict?.user?.verifyEmailRequired || 'Verify your email to manage your character collection.'}</span>
          <button
            type="button"
            onClick={() => {
              setVerificationNoticeOpen(false);
              setAuthModalIntent('verify');
              setIsAuthModalOpen(true);
            }}
            className="rounded-lg bg-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider hover:bg-white/30 transition-colors cursor-pointer"
          >
            {dict?.streaks?.verifyEmail || 'Verify email'}
          </button>
          <button
            type="button"
            onClick={() => setVerificationNoticeOpen(false)}
            className="text-[11px] font-black underline cursor-pointer"
          >
            {dict?.characterDetail?.dismiss || dict?.modal?.close || 'Dismiss'}
          </button>
        </div>
      )}


      <DisabledReasonModal
        isOpen={disabledModalCharacter !== null}
        onClose={() => setDisabledModalCharacter(null)}
        label={disabledModalCharacter?.name || ''}
        reason={disabledModalCharacter?.disabled_reason}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        verifyEmailFor={authModalIntent === 'verify' ? user?.email : undefined}
        dict={dict as unknown as Dictionary}
      />
    </div>
  );
};
