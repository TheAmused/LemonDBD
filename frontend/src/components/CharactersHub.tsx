'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Skull, Search, X, Sparkles, Package, User, Flame, Info, ChevronRight, Lock, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from './AuthModal';
import { useSidebarState } from '@/hooks/useSidebarState';

export interface Character {
  id?: number;
  name: string;
  real_name: string;
  category: string;
  wiki_slug?: string;
  short_name?: string;
  avatar_url?: string;
  avatar_local_path?: string;
}

interface OwnedCharacter {
  character_id: number;
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

export interface Perk {
  name: string;
  character: string;
  character_real_name?: string;
  character_avatar_path?: string;
  category: string;
  description: string;
  icon_url: string;
  icon_local_path: string;
}

export interface Addon {
  name: string;
  associated_target?: string;
  category?: string;
  description?: string;
  icon_url?: string;
  icon_local_path?: string;
  rarity?: string;
}

export interface Item {
  name: string;
  category: string;
  role?: string;
  description?: string;
  icon_url?: string;
  icon_local_path?: string;
  rarity?: string;
}

export interface CharacterDetailData {
  character: Character;
  perks: Perk[];
  addons: Addon[];
  items?: Item[];
}

interface CharactersHubProps {
  dict?: any;
}

export const CharactersHub: React.FC<CharactersHubProps> = ({ dict }) => {
  const { isAuthenticated, token, user, bulkUpdateCharacterOwnership, bulkUpdatePerkOwnership } = useAuth();
  const { isCollapsed } = useSidebarState();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'all' | 'Survivor' | 'Killer'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal / Drawer state
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailData, setDetailData] = useState<CharacterDetailData | null>(null);

  // Ownership selection mode state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [ownershipMode, setOwnershipMode] = useState<boolean>(false);
  const [ownershipLoading, setOwnershipLoading] = useState<boolean>(false);
  const [ownershipSaving, setOwnershipSaving] = useState<boolean>(false);
  const [ownershipSaveError, setOwnershipSaveError] = useState<string | null>(null);
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);
  const [characterOwnershipDraft, setCharacterOwnershipDraft] = useState<Record<number, boolean>>({});
  const [perkUnlockDraft, setPerkUnlockDraft] = useState<Record<number, boolean>>({});
  const [allPerks, setAllPerks] = useState<OwnedPerk[]>([]);
  const [perksPopupCharacter, setPerksPopupCharacter] = useState<Character | null>(null);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    async function fetchCharacters() {
      setLoading(true);
      try {
        const res = await fetch(`${backendBase}/api/v1/characters`);
        if (res.ok) {
          const data = await res.json();
          setCharacters(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch characters:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCharacters();
  }, [backendBase]);

  const handleOpenDetail = async (char: Character) => {
    setSelectedCharacter(char);
    setDetailLoading(true);
    setDetailData(null);

    try {
      const res = await fetch(`${backendBase}/api/v1/characters/${encodeURIComponent(char.name)}/detail`);
      if (res.ok) {
        const json = await res.json();
        setDetailData(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch character detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedCharacter(null);
    setDetailData(null);
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedCharacter) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCharacter]);

  const handleToggleOwnershipMode = async () => {
    if (ownershipMode) {
      setOwnershipMode(false);
      return;
    }
    if (!isAuthenticated || !token || !user) {
      setIsAuthModalOpen(true);
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
          charDraft[c.character_id] = c.is_owned;
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
    } catch (err) {
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
    // Mirror the backend's auto-unlock/auto-lock cascade in the local draft
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

      // Sequential, not parallel: the character-bulk endpoint cascades and writes
      // to the same perk-ownership rows the perk-bulk endpoint writes to. Firing
      // both at once races two transactions against the same rows, which can roll
      // back the character update while the perk update still commits.
      const charactersOk =
        characterUpdates.length === 0 || (await bulkUpdateCharacterOwnership(characterUpdates));
      const perksOk = perkUpdates.length === 0 || (await bulkUpdatePerkOwnership(perkUpdates));

      if (!charactersOk || !perksOk) {
        setOwnershipSaveError('Nie udało się zapisać wszystkich zmian. Spróbuj ponownie.');
        return;
      }

      handleCancelOwnershipMode();
      setShowSavedToast(true);
      window.setTimeout(() => setShowSavedToast(false), 2500);
    } catch (err) {
      console.error('Failed to save ownership changes:', err);
      setOwnershipSaveError('Nie udało się zapisać zmian. Spróbuj ponownie.');
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

  const getAvatarUrl = (char: Character) => {
    let rawPath = char.avatar_local_path;
    if (!rawPath && char.name) {
      const subDir = char.category?.toLowerCase() === 'survivor' ? 'survivors' : 'killers';
      const sanitized = char.name
        .toLowerCase()
        .trim()
        .replace(/[\s\-/]+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
      rawPath = `avatars/${subDir}/${sanitized}.png`;
    }
    if (!rawPath) return char.avatar_url || '';
    const cleanPath = rawPath.replace(/^\/?(static\/)?/, '');
    return `${backendBase}/static/${cleanPath}`;
  };

  const getAssetUrl = (path?: string, url?: string) => {
    if (path) {
      const cleanPath = path.replace(/^\/?(static\/)?/, '');
      return `${backendBase}/static/${cleanPath}`;
    }
    return url || '';
  };

  const filteredCharacters = characters.filter((c) => {
    const matchesTab =
      activeTab === 'all' ? true : c.category?.toLowerCase() === activeTab.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      c.name.toLowerCase().includes(query) ||
      (c.real_name && c.real_name.toLowerCase().includes(query));
    return matchesTab && matchesSearch;
  });

  const survivorCount = characters.filter((c) => c.category === 'Survivor').length;
  const killerCount = characters.filter((c) => c.category === 'Killer').length;

  const getRarityBadgeColor = (rarity?: string) => {
    const r = (rarity || '').toLowerCase();
    if (r.includes('ultra') || r.includes('iridescent'))
      return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
    if (r.includes('very rare') || r.includes('purple'))
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (r.includes('rare') || r.includes('green'))
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (r.includes('uncommon') || r.includes('yellow'))
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  return (
    <div className={`space-y-6 ${ownershipMode ? 'pb-20' : ''}`}>
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-red-950/40 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
                <Flame className="h-4 w-4" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-100 font-mono tracking-tight">
                Characters Hub
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Explore Dead by Daylight Survivors & Killers. View character details, unique teachable perks, power add-ons, and equipment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <Shield className="h-4 w-4" />
              <span>{survivorCount} Survivors</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
              <Skull className="h-4 w-4" />
              <span>{killerCount} Killers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation & Search Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        {/* Role Tabs */}
        <div className="flex items-center p-1 bg-slate-900/90 border border-slate-800 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-red-600 text-white shadow-md shadow-red-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({characters.length})
          </button>
          <button
            onClick={() => setActiveTab('Survivor')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'Survivor'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Survivors ({survivorCount})
          </button>
          <button
            onClick={() => setActiveTab('Killer')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'Killer'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            <Skull className="h-3.5 w-3.5" />
            Killers ({killerCount})
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleToggleOwnershipMode}
            disabled={ownershipLoading}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait ${
              ownershipMode
                ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-900/30'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-500/50 hover:text-amber-400'
            }`}
          >
            {ownershipMode ? <X className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {ownershipLoading ? 'Loading...' : ownershipMode ? 'Exit Selection' : 'My Characters'}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid of Characters */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl bg-slate-900/60 border border-slate-800"
            />
          ))}
        </div>
      ) : filteredCharacters.length === 0 ? (
        <div className="my-12 rounded-3xl border border-dashed border-slate-800 p-12 text-center">
          <User className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-slate-300">No Characters Found</h3>
          <p className="mt-1 text-xs text-slate-500">
            No characters match your current filter or search query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {filteredCharacters.map((char, idx) => {
            const isSurvivor = char.category?.toLowerCase() === 'survivor';
            const isOwned = char.id ? characterOwnershipDraft[char.id] ?? true : true;
            const perkStats = ownershipMode ? getCharacterPerkStats(char.id) : { total: 0, unlocked: 0 };
            const hasPartialPerks = !isOwned && perkStats.unlocked > 0;
            const showLockedOverlay = !isOwned;

            return (
              <div
                key={`${char.name}-${idx}`}
                onClick={() => {
                  if (ownershipMode) {
                    if (char.id) handleToggleCharacterOwned(char.id);
                  } else {
                    handleOpenDetail(char);
                  }
                }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 hover:bg-slate-850 hover:border-red-500/50 hover:shadow-xl hover:shadow-red-950/20 transition-all duration-300 cursor-pointer"
              >
                {/* Role Badge */}
                <div className="absolute top-2 right-2 z-10">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border backdrop-blur-md ${
                      isSurvivor
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {isSurvivor ? <Shield className="h-3 w-3" /> : <Skull className="h-3 w-3" />}
                    {char.category}
                  </span>
                </div>

                {/* Ownership Lock Badge */}
                {ownershipMode && !isOwned && (
                  <div className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/80 border border-amber-500/40 text-amber-400 backdrop-blur-md">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                )}
                {ownershipMode && isOwned && (
                  <div className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 backdrop-blur-md">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}

                {/* Avatar Portrait Image */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950">
                  <img
                    src={getAvatarUrl(char)}
                    alt={char.name}
                    className={`h-full w-full object-cover object-top transition-transform duration-500 ${
                      ownershipMode && showLockedOverlay ? '' : 'group-hover:scale-105'
                    }`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/5/53/IconHelpLoading_players.png/revision/latest';
                    }}
                  />
                  {ownershipMode && showLockedOverlay && (
                    <img
                      src={getAvatarUrl(char)}
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
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                </div>

                {/* Card Footer Info */}
                <div className="p-3.5 space-y-1">
                  <h3 className="font-extrabold text-sm text-slate-100 group-hover:text-red-400 transition-colors line-clamp-1">
                    {char.name}
                  </h3>
                  {char.real_name && char.real_name !== char.name && (
                    <p className="text-[11px] font-medium text-slate-400 line-clamp-1">
                      {char.real_name}
                    </p>
                  )}
                  {ownershipMode && !isOwned && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPerksPopupCharacter(char);
                      }}
                      className="mt-1 w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-400 hover:bg-amber-500/20 transition-colors"
                    >
                      Perks {perkStats.total > 0 ? `(${perkStats.unlocked}/${perkStats.total})` : ''}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Detail Drawer / Modal */}
      {selectedCharacter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          {/* Backdrop */}
          <div
            onClick={handleCloseModal}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          />

          {/* Modal Content */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950 animate-in zoom-in-95 duration-200"
          >
            {/* Header / Hero */}
            <div className="relative border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8">
              <button
                onClick={handleCloseModal}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border-2 border-red-500/30 bg-slate-950 shadow-xl">
                  <img
                    src={getAvatarUrl(selectedCharacter)}
                    alt={selectedCharacter.name}
                    className="h-full w-full object-cover object-top"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/5/53/IconHelpLoading_players.png/revision/latest';
                    }}
                  />
                </div>

                <div className="space-y-2 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold border ${
                        selectedCharacter.category?.toLowerCase() === 'survivor'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {selectedCharacter.category?.toLowerCase() === 'survivor' ? (
                        <Shield className="h-3.5 w-3.5" />
                      ) : (
                        <Skull className="h-3.5 w-3.5" />
                      )}
                      {selectedCharacter.category}
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-slate-100 font-mono tracking-tight">
                    {selectedCharacter.name}
                  </h2>

                  {selectedCharacter.real_name && (
                    <p className="text-sm font-semibold text-slate-400">
                      Real Name: <span className="text-slate-200">{selectedCharacter.real_name}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-8">
              {detailLoading ? (
                <div className="py-12 text-center space-y-3">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-red-500" />
                  <p className="text-xs text-slate-400 font-medium">Loading character details...</p>
                </div>
              ) : (
                <>
                  {/* Teachable Perks Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Sparkles className="h-5 w-5 text-amber-400" />
                      <h3 className="text-lg font-bold text-slate-100 font-mono">
                        Teachable Perks ({detailData?.perks?.length || 0})
                      </h3>
                    </div>

                    {!detailData?.perks || detailData.perks.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No teachable perks associated with this character.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {detailData.perks.map((perk, i) => (
                          <div
                            key={`${perk.name}-${i}`}
                            className="flex flex-col p-4 rounded-2xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-all space-y-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-900 border border-slate-800 p-1 flex items-center justify-center">
                                <img
                                  src={getAssetUrl(perk.icon_local_path, perk.icon_url)}
                                  alt={perk.name}
                                  className="h-full w-full object-contain"
                                />
                              </div>
                              <div>
                                <h4 className="font-extrabold text-sm text-slate-100 leading-tight">
                                  {perk.name}
                                </h4>
                                <span className="inline-block text-[10px] font-bold text-red-400 mt-0.5">
                                  {perk.category} Perk
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">
                              {perk.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Associated Add-ons & Equipment Section */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Package className="h-5 w-5 text-teal-400" />
                      <h3 className="text-lg font-bold text-slate-100 font-mono">
                        Associated Add-ons & Equipment ({(detailData?.addons?.length || 0) + (detailData?.items?.length || 0)})
                      </h3>
                    </div>

                    {(!detailData?.addons || detailData.addons.length === 0) &&
                    (!detailData?.items || detailData.items.length === 0) ? (
                      <p className="text-xs text-slate-500 italic">
                        No specific add-ons or equipment associated with this character in database.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-72 overflow-y-auto pr-1">
                        {/* Render Addons */}
                        {detailData?.addons?.map((addon, i) => (
                          <div
                            key={`addon-${addon.name}-${i}`}
                            className="flex items-start gap-3 p-3 rounded-2xl border border-slate-800 bg-slate-950/60"
                          >
                            <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-900 border border-slate-800 p-1 flex items-center justify-center">
                              <img
                                src={getAssetUrl(addon.icon_local_path, addon.icon_url)}
                                alt={addon.name}
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-xs text-slate-200">{addon.name}</h4>
                                {addon.rarity && (
                                  <span
                                    className={`rounded px-1.5 py-0.2 text-[9px] font-bold border ${getRarityBadgeColor(
                                      addon.rarity
                                    )}`}
                                  >
                                    {addon.rarity}
                                  </span>
                                )}
                              </div>
                              {addon.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-2">
                                  {addon.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Render Items */}
                        {detailData?.items?.map((item, i) => (
                          <div
                            key={`item-${item.name}-${i}`}
                            className="flex items-start gap-3 p-3 rounded-2xl border border-slate-800 bg-slate-950/60"
                          >
                            <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-900 border border-slate-800 p-1 flex items-center justify-center">
                              <img
                                src={getAssetUrl(item.icon_local_path, item.icon_url)}
                                alt={item.name}
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-xs text-slate-200">{item.name}</h4>
                                {item.rarity && (
                                  <span
                                    className={`rounded px-1.5 py-0.2 text-[9px] font-bold border ${getRarityBadgeColor(
                                      item.rarity
                                    )}`}
                                  >
                                    {item.rarity}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Perks Popup for a Locked Character */}
      {perksPopupCharacter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            onClick={() => setPerksPopupCharacter(null)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <h3 className="text-base font-bold text-slate-100">
                {perksPopupCharacter.name} Perks
              </h3>
              <button
                onClick={() => setPerksPopupCharacter(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="px-5 pt-4 text-[11px] text-slate-500">Click a perk to toggle whether you own it.</p>
            <div className="p-5 space-y-2">
              {allPerks
                .filter((p) => p.character_id === perksPopupCharacter.id)
                .map((perk) => {
                  const isUnlocked = perkUnlockDraft[perk.perk_id] ?? true;
                  return (
                    <button
                      key={perk.perk_id}
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
                          src={getAssetUrl(perk.icon_local_path, perk.icon_url)}
                          alt={perk.name}
                          className={`h-full w-full object-contain ${isUnlocked ? '' : 'grayscale opacity-50'}`}
                        />
                      </div>
                      <span className="flex-1">{perk.name}</span>
                      {isUnlocked ? <Check className="h-4 w-4 shrink-0" /> : <Lock className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              {allPerks.filter((p) => p.character_id === perksPopupCharacter.id).length === 0 && (
                <p className="text-xs text-slate-500 italic">No teachable perks for this character.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Bar for Ownership Selection Mode — fixed to the true bottom of the
          screen, but padded to match the sidebar so it never sits behind it
          or looks off-center relative to the visible content column. */}
      {ownershipMode && (
        <div
          className={`fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md transition-all duration-300 ${
            isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
          }`}
        >
          {ownershipSaveError && (
            <p className="px-5 sm:px-7 lg:px-9 pt-2 text-center text-[11px] font-semibold text-rose-400">
              {ownershipSaveError}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 px-5 sm:px-7 lg:px-9 py-2.5">
            <button
              onClick={handleCancelOwnershipMode}
              disabled={ownershipSaving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors disabled:opacity-60"
            >
              Anuluj
            </button>
            <button
              onClick={handleSaveOwnership}
              disabled={ownershipSaving}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-md shadow-emerald-900/30 hover:bg-emerald-500 transition-colors disabled:opacity-60 disabled:cursor-wait"
            >
              {ownershipSaving ? 'Zapisywanie...' : 'Akceptuj'}
            </button>
          </div>
        </div>
      )}

      {/* Save confirmation toast */}
      {showSavedToast && (
        <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2.5 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-2xl shadow-emerald-900/50 ring-2 ring-emerald-400/50 animate-in fade-in slide-in-from-top-4 duration-300">
          <Check className="h-5 w-5" />
          Zmiany zapisane
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};
