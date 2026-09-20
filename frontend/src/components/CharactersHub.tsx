'use client';
// frontend/src/components/CharactersHub.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { ownershipKey, ownsPerk } from '@/utils/characterUtils';
import dynamic from 'next/dynamic';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  Search,
  X,
  User,
  Lock,
  Check,
  MailWarning,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DisabledBadge } from '@/components/DisabledBadge';
import { CharacterOwnershipOverlay } from '@/components/characters/CharacterOwnershipOverlay';
import { PerksTogglePopup } from '@/components/characters/PerksTogglePopup';
import { CharactersGridSkeleton } from '@/components/character-detail/CharactersSkeleton';
import { useCachedData } from '@/hooks/useCachedData';
import { fetchJson, invalidate } from '@/services/dataCache';

import { EmptyState } from '@/components/EmptyState';
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
  getAvatarUrl as resolveAvatarUrl,
} from '@/components/character-detail/types';
import { RoleCategory, PerkDictionary } from '@/types/perks';
import type { Dictionary } from '@/locales/types';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';

interface OwnedCharacter {
  id: number;
  name: string;
  role: string;
  is_owned: boolean;
}

interface OwnedPerk {
  perk_id: number;
  name: string;
  /** Scoped to the perk's own role. Survivor 7 and killer 7 are different
   *  characters, so this is only meaningful next to `role`. */
  character_id: number | null;
  role: string;
  survivor_id: number | null;
  killer_id: number | null;
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

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalIntent, setAuthModalIntent] = useState<'login' | 'verify'>('login');
  const [verificationNoticeOpen, setVerificationNoticeOpen] = useState<boolean>(false);
  const [ownershipMode, setOwnershipMode] = useState<boolean>(false);
  const [ownershipLoading, setOwnershipLoading] = useState<boolean>(false);
  const [ownershipSaving, setOwnershipSaving] = useState<boolean>(false);
  const [ownershipSaveError, setOwnershipSaveError] = useState<string | null>(null);
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);
  // Keyed by "survivor:7" / "killer:7", not by a bare id: survivors and
  // killers are numbered separately now, so an id alone collides.
  const [characterOwnershipDraft, setCharacterOwnershipDraft] = useState<Record<string, boolean>>({});
  const [perkUnlockDraft, setPerkUnlockDraft] = useState<Record<number, boolean>>({});
  const [allPerks, setAllPerks] = useState<OwnedPerk[]>([]);
  const [perksPopupCharacter, setPerksPopupCharacter] = useState<CharacterItem | null>(null);
  const [disabledModalCharacter, setDisabledModalCharacter] = useState<CharacterItem | null>(null);

  const backendBase = getBackendBaseUrl();

  const charactersKey = `${backendBase}/api/v1/characters?lang=${locale}`;
  const { data: charactersResponse, loading: charactersLoading } = useCachedData<{
    data?: CharacterItem[];
  }>(charactersKey, () => fetchJson<{ data?: CharacterItem[] }>(charactersKey));

  const characters = charactersResponse?.data ?? [];
  const loading = charactersLoading;

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
        fetch(`${backendBase}/api/v1/users/${user.id}/perks?lang=${locale}`, {
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

  const handleToggleCharacterOwned = (characterId: number, role: string) => {
    const key = ownershipKey(characterId, role);
    const newIsOwned = !(characterOwnershipDraft[key] ?? true);
    setCharacterOwnershipDraft((prev) => ({
      ...prev,
      [key]: newIsOwned,
    }));

    setPerkUnlockDraft((prev) => {
      const next = { ...prev };
      allPerks
        .filter((p) => ownsPerk(p, characterId, role))
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
      const characterUpdates = Object.entries(characterOwnershipDraft).map(([key, isOwned]) => {
        const [role, id] = key.split(':');
        return { character_id: Number(id), role, is_owned: isOwned };
      });
      const perkUpdates = Object.entries(perkUnlockDraft).map(([perkId, isUnlocked]) => ({
        perk_id: Number(perkId),
        is_unlocked: isUnlocked,
      }));

      const charactersOk =
        characterUpdates.length === 0 || (await bulkUpdateCharacterOwnership(characterUpdates));
      const perksOk = perkUpdates.length === 0 || (await bulkUpdatePerkOwnership(perkUpdates));

      if (!charactersOk || !perksOk) {
        setOwnershipSaveError(dict?.characterDetail?.saveOwnershipError || null);
        return;
      }

      invalidate(`${backendBase}/api/v1/perks`);
      invalidate(`${backendBase}/api/v1/characters`);

      handleCancelOwnershipMode();
      setShowSavedToast(true);
      window.setTimeout(() => setShowSavedToast(false), 2500);
    } catch (err: unknown) {
      console.error('Failed to save ownership changes:', err);
      setOwnershipSaveError(dict?.characterDetail?.saveOwnershipError || null);
    } finally {
      setOwnershipSaving(false);
    }
  };

  const getCharacterPerkStats = (characterId?: number, role?: string) => {
    if (!characterId) return { total: 0, unlocked: 0 };
    const perksForChar = allPerks.filter((p) => ownsPerk(p, characterId, role));
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
        aria-label={dict?.characterDetail?.characterOverview}
        className="flex flex-col sm:flex-row gap-4 justify-between items-center"
      >
        <div
          role="group"
          aria-label={dict?.filters?.category}
          className="relative flex items-center w-full sm:w-72 h-11 p-1 bg-bg-primary border border-border-color rounded-2xl shadow-inner select-none transition-colors"
        >
          <span
            aria-hidden="true"
            className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl shadow-md transition-transform duration-300 ease-out ${
              activeTab === 'Survivor'
                ? 'translate-x-0 bg-accent-green'
                : 'translate-x-[calc(100%+8px)] bg-accent-red'
            }`}
          />
          <button
            type="button"
            onClick={() => handleTabChange('Survivor')}
            aria-pressed={activeTab === 'Survivor'}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 h-full min-h-[40px] rounded-xl text-xs font-bold transition-colors cursor-pointer touch-manipulation ${
              activeTab === 'Survivor'
                ? 'text-text-inverted'
                : 'text-text-secondary hover:text-accent-green'
            }`}
          >
            <SurvivorIcon className="h-3.5 w-3.5" />
            <span>{dict?.filters?.survivor}</span> ({survivorCount})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('Killer')}
            aria-pressed={activeTab === 'Killer'}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 h-full min-h-[40px] rounded-xl text-xs font-bold transition-colors cursor-pointer touch-manipulation ${
              activeTab === 'Killer'
                ? 'text-text-inverted'
                : 'text-text-secondary hover:text-accent-red'
            }`}
          >
            <KillerIcon className="h-3.5 w-3.5" />
            <span>{dict?.filters?.killer}</span> ({killerCount})
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleToggleOwnershipMode}
            disabled={ownershipLoading}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-2xl text-xs font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait touch-manipulation shadow-xs ${
              ownershipMode
                ? 'bg-accent-amber text-text-inverted border border-accent-amber shadow-accent-amber/20'
                : 'border border-border-color bg-bg-surface text-text-primary hover:border-accent-amber/50 hover:text-accent-amber'
            }`}
          >
            {ownershipMode ? <X className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            <span>
              {ownershipLoading
                ? dict?.app?.loading
                : ownershipMode
                  ? dict?.characterDetail?.exitSelection
                  : dict?.characterDetail?.myCharacters}
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder={dict?.filters?.filterByCharacter}
            aria-label={dict?.filters?.filterByCharacter}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 min-h-[44px] rounded-2xl border border-border-color bg-bg-primary text-xs font-semibold text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-red/50 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={dict?.filters?.clearSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 flex min-h-[40px] min-w-[40px] items-center justify-center text-text-muted hover:text-text-primary cursor-pointer touch-manipulation"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      {loading ? (
        <div className="w-full py-12 flex items-center justify-center">
          <CharactersGridSkeleton dict={dict} />
        </div>
      ) : filteredCharacters.length === 0 ? (
        <EmptyState
          variant="dashed"
          icon={User}
          className="my-8 sm:my-12 rounded-3xl border border-dashed border-border-color p-8 sm:p-12 text-center bg-bg-surface backdrop-blur-sm shadow-sm"
          iconClassName="mx-auto h-12 w-12 text-text-muted mb-3"
          headingClassName="text-lg font-bold text-text-primary"
          subtitleClassName="mt-1 text-xs text-text-secondary max-w-sm mx-auto"
          title={dict?.characterDetail?.noCharactersFound || dict?.empty?.charactersTitle || 'No Characters Found'}
          subtitle={
            dict?.characterDetail?.hubNoMatchingCharacters ||
            dict?.empty?.charactersSubtitle ||
            'No characters match your current filter or search query.'
          }
          action={
            searchQuery
              ? {
                  label: dict?.app?.resetFilters || dict?.filters?.resetAllFilters || 'Reset Filters',
                  onClick: () => setSearchQuery(''),
                }
              : undefined
          }
        />
      ) : (
        <section
          aria-label={dict?.characterDetail?.characterOverview}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 sm:gap-6"
        >
          {filteredCharacters.map((char, idx) => {
            const isSurvivor = char.category?.toLowerCase() === 'survivor';
            const isOwned = char.id
              ? characterOwnershipDraft[ownershipKey(char.id, char.category)] ?? true
              : true;
            const perkStats = ownershipMode
              ? getCharacterPerkStats(char.id, char.category)
              : { total: 0, unlocked: 0 };
            const hasPartialPerks = !isOwned && perkStats.unlocked > 0;
            const showLockedOverlay = !isOwned;
            const avatarSrc = resolveAvatarUrl(backendBase, char, isSurvivor);
            const detailHref = `/${locale}/characters/${getCharacterSlug(char.name)}`;

            return (
              <div
                key={`${char.name}-${idx}`}
                onMouseEnter={() => {
                  if (!ownershipMode) router.prefetch(detailHref);
                }}
                onFocus={() => {
                  if (!ownershipMode) router.prefetch(detailHref);
                }}
                onClick={() => {
                  if (ownershipMode) {
                    if (char.id) handleToggleCharacterOwned(char.id, char.category);
                  } else {
                    router.push(detailHref);
                  }
                }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border-color bg-bg-surface hover:bg-bg-elevated hover:border-accent-red/50 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer touch-manipulation"
              >
                <div className="absolute top-2 right-2 z-10">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border backdrop-blur-md ${
                      isSurvivor
                        ? 'bg-accent-green/10 text-accent-green border-accent-green/30'
                        : 'bg-accent-red/10 text-accent-red border-accent-red/30'
                    }`}
                  >
                    {isSurvivor ? <SurvivorIcon className="h-3 w-3" /> : <KillerIcon className="h-3 w-3" />}
                    <span>
                      {isSurvivor
                        ? dict?.characterDetail?.roleSurvivor
                        : dict?.characterDetail?.roleKiller}
                    </span>
                  </span>
                </div>

                {char.is_disabled && !ownershipMode && (
                  <DisabledBadge
                    label={char.name}
                    onClick={() => setDisabledModalCharacter(char)}
                    position="top-2 left-2"
                  />
                )}

                <div className="relative aspect-[3/4] w-full overflow-hidden bg-bg-elevated">
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
                        target.src = `${backendBase}/static/avatars/${isSurvivor ? 'survivors' : 'killers'}/${getCharacterSlug(char.name)}.webp`;
                      } else if (target.dataset.triedFallback === '1') {
                        target.dataset.triedFallback = '2';
                        target.src = `${backendBase}/static/avatars/${isSurvivor ? 'survivors' : 'killers'}/${getCharacterSlug(char.name)}.png`;
                      }
                    }}
                  />
                  {ownershipMode && (
                    <CharacterOwnershipOverlay
                      isOwned={isOwned}
                      hasPartialPerks={hasPartialPerks}
                      avatarSrc={avatarSrc}
                      lockedTitle={dict?.modal?.unownedPerk}
                      ownedTitle={dict?.filters?.ownedOnly}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/70 via-transparent to-transparent" />
                </div>

                <div className="p-3.5 space-y-1">
                  <h3 className="font-extrabold text-sm text-text-primary group-hover:text-accent-red transition-colors line-clamp-1">
                    {char.name}
                  </h3>
                  {ownershipMode && !isOwned && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPerksPopupCharacter(char);
                      }}
                      className="mt-1 w-full rounded-lg border border-accent-amber/40 bg-accent-amber/10 px-2 py-1 text-[10px] font-bold text-accent-amber hover:bg-accent-amber/20 transition-colors cursor-pointer"
                    >
                      <span>{dict?.filters?.perks}</span>
                      {perkStats.total > 0 && ` (${perkStats.unlocked}/${perkStats.total})`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <PerksTogglePopup
        character={perksPopupCharacter}
        perks={allPerks}
        isPerkUnlocked={(perkId) => perkUnlockDraft[perkId] ?? true}
        onTogglePerk={handleTogglePerkUnlocked}
        onClose={() => setPerksPopupCharacter(null)}
        backendBase={backendBase}
        perksLabel={dict?.filters?.perks}
        dict={dict}
      />

      {ownershipMode && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border-color bg-bg-surface/95 shadow-2xl backdrop-blur-md transition-[padding] duration-300 lemon-shell-main"
        >
          {ownershipSaveError && (
            <p
              role="alert"
              className="px-5 sm:px-7 lg:px-9 pt-2 text-center text-[11px] font-semibold text-accent-red"
            >
              {ownershipSaveError}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 px-5 sm:px-7 lg:px-9 py-2.5">
            <button
              type="button"
              onClick={handleCancelOwnershipMode}
              disabled={ownershipSaving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary transition-colors disabled:opacity-60 cursor-pointer border border-border-color bg-bg-surface hover:bg-bg-elevated"
            >
              {dict?.admin?.cancel || dict?.modal?.close}
            </button>
            <button
              type="button"
              onClick={handleSaveOwnership}
              disabled={ownershipSaving}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-accent-green text-text-inverted shadow-md hover:bg-accent-green-hover transition-colors disabled:opacity-60 disabled:cursor-wait cursor-pointer"
            >
              {ownershipSaving ? dict?.characterDetail?.saving : dict?.characterDetail?.accept}
            </button>
          </div>
        </div>
      )}

      {showSavedToast && (
        <div
          role="status"
          className="fixed top-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2.5 rounded-2xl bg-accent-green px-5 py-3 text-sm font-extrabold text-text-inverted shadow-2xl ring-2 ring-accent-green/50 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <Check className="h-5 w-5" />
          <span>{dict?.characterDetail?.changesSaved}</span>
        </div>
      )}

      {verificationNoticeOpen && user && (
        <div
          role="status"
          className="fixed top-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-2xl bg-accent-amber px-5 py-3 text-xs font-bold text-text-inverted shadow-2xl ring-2 ring-accent-amber/50 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <MailWarning className="h-4 w-4 shrink-0" />
          <span>{dict?.user?.verifyEmailRequired}</span>
          <button
            type="button"
            onClick={() => {
              setVerificationNoticeOpen(false);
              setAuthModalIntent('verify');
              setIsAuthModalOpen(true);
            }}
            className="rounded-lg bg-text-inverted/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider hover:bg-text-inverted/30 transition-colors cursor-pointer"
          >
            {dict?.streaks?.verifyEmail}
          </button>
          <button
            type="button"
            onClick={() => setVerificationNoticeOpen(false)}
            className="text-[11px] font-black underline cursor-pointer"
          >
            {dict?.characterDetail?.dismiss || dict?.modal?.close}
          </button>
        </div>
      )}

      <DisabledReasonModal
        isOpen={disabledModalCharacter !== null}
        onClose={() => setDisabledModalCharacter(null)}
        label={disabledModalCharacter?.name ?? ''}
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

