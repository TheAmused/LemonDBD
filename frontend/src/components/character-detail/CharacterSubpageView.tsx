'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Shield,
  Skull,
  Sparkles,
  Package,
  Flame,
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  BookOpen,
  Layers,
  Search,
  ChevronLeft,
  Eye,
  Box,
  Calendar,
  Award,
  Users,
  ExternalLink,
  Activity,
  Gauge,
  ArrowUpDown,
  Radio,
  Volume2,
  Zap,
  Info,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { PerkModal } from '@/components/PerkModal';
import { Perk as PerkModalType } from '@/components/PerkCard';

export interface CharacterItem {
  id?: number;
  name: string;
  category: string;
  role?: string;
  real_name?: string;
  code_prefix?: string;
  avatar_url?: string;
  avatar_local_path?: string;
  portrait_url?: string;
  release_number?: number;
  wiki_slug?: string;
  short_name?: string;
  chapter_name?: string;
  chapter_number?: string;
  dlc_type?: string;
  is_licensed?: boolean;
  release_year?: number;
  release_date?: string;
  dlc_counterparts?: string[];
  lore?: string;
}

export function getCharacterSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\-/]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export interface PerkItem {
  id?: number;
  name: string;
  category: string;
  character: string;
  character_real_name?: string;
  character_avatar_path?: string;
  character_id?: number | null;
  description: string;
  icon_url?: string;
  icon_local_path?: string;
  is_teachable?: boolean;
}

export interface AddonItem {
  id?: number;
  name: string;
  associated_target?: string;
  category?: string;
  description?: string;
  icon_url?: string;
  icon_local_path?: string;
  rarity?: string;
}

export interface EquipmentItem {
  id?: number;
  name: string;
  category: string;
  role?: string;
  description?: string;
  icon_url?: string;
  icon_local_path?: string;
  rarity?: string;
  associated_target?: string;
}

export interface KillerPowerInfo {
  name: string;
  description: string;
  icon_url?: string;
  movement_speed?: string;
  terror_radius?: string;
  terror_radius_meters?: number;
  height?: string;
}

export interface CharacterDetailPayload {
  character: CharacterItem;
  power?: KillerPowerInfo | null;
  perks: PerkItem[];
  addons: (AddonItem | EquipmentItem)[];
}

interface CharacterSubpageViewProps {
  currentLocale: string;
  dict: any;
  detailData: CharacterDetailPayload;
  allCharacters?: CharacterItem[];
}

export const CharacterSubpageView: React.FC<CharacterSubpageViewProps> = ({
  currentLocale,
  dict,
  detailData,
  allCharacters = [],
}) => {
  const { character, perks = [], addons = [] } = detailData;
  const { isAuthenticated, token, user, bulkUpdateCharacterOwnership } = useAuth();

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isPowerModalOpen, setIsPowerModalOpen] = useState<boolean>(false);
  const [isTerrorRadiusModalOpen, setIsTerrorRadiusModalOpen] = useState<boolean>(false);
  const [isLoreModalOpen, setIsLoreModalOpen] = useState<boolean>(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);
  const [selectedPerkForModal, setSelectedPerkForModal] = useState<PerkModalType | null>(null);
  const [selectedEquipmentForModal, setSelectedEquipmentForModal] = useState<AddonItem | EquipmentItem | null>(null);

  // Ownership & filters
  const [isOwned, setIsOwned] = useState<boolean>(true);
  const [ownershipSaving, setOwnershipSaving] = useState<boolean>(false);
  const [equipmentSearch, setEquipmentSearch] = useState<string>('');
  const [equipmentRarityFilter, setEquipmentRarityFilter] = useState<string>('all');

  // Tooltip hover states
  const [hoveredPerkIndex, setHoveredPerkIndex] = useState<number | null>(null);
  const [hoveredEquipIndex, setHoveredEquipIndex] = useState<number | null>(null);

  const isSurvivor = (character.category || character.role || '').toLowerCase() === 'survivor';
  const t = dict?.characterDetail || {};
  const roleLabel = isSurvivor ? t.roleSurvivor || 'Survivor' : t.roleKiller || 'Killer';

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Killer power and stats resolution
  const killerPower = detailData.power;
  const killerSpeed = killerPower?.movement_speed || '4.6 m/s (115%)';
  const killerTerrorRadius = killerPower?.terror_radius || '32 m';
  const killerTRMeters = killerPower?.terror_radius_meters || 32;
  const killerHeight = killerPower?.height || 'Tall';

  // DLC metadata
  const chapterName = character.chapter_name || 'Dead by Daylight Archives';
  const dlcType = character.dlc_type || 'original_chapter';
  const isLicensed = Boolean(character.is_licensed);
  const releaseYear = character.release_year || 2016;
  const releaseDate = character.release_date || '';
  const dlcCounterparts = character.dlc_counterparts || [];

  // Global Escape key listener for open modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPowerModalOpen(false);
        setIsTerrorRadiusModalOpen(false);
        setIsLoreModalOpen(false);
        setIsModelModalOpen(false);
        setSelectedEquipmentForModal(null);
        setSelectedPerkForModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lock body scroll when any custom modal is open
  useEffect(() => {
    const isAnyModalOpen =
      isPowerModalOpen ||
      isTerrorRadiusModalOpen ||
      isLoreModalOpen ||
      isModelModalOpen ||
      Boolean(selectedEquipmentForModal);
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isPowerModalOpen, isTerrorRadiusModalOpen, isLoreModalOpen, isModelModalOpen, selectedEquipmentForModal]);

  // Load user ownership state if authenticated
  useEffect(() => {
    async function loadOwnership() {
      if (!isAuthenticated || !token || !user || !character.id) return;
      try {
        const res = await fetch(`${backendBase}/api/v1/users/${user.id}/characters`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          const userChar = (json.data || []).find((c: any) => c.character_id === character.id);
          if (userChar !== undefined) {
            setIsOwned(userChar.is_owned);
          }
        }
      } catch (err) {
        console.error('Failed to fetch character ownership:', err);
      }
    }
    loadOwnership();
  }, [isAuthenticated, token, user, character.id, backendBase]);

  const handleToggleOwnership = async () => {
    if (!isAuthenticated || !token || !user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!character.id) return;

    const nextState = !isOwned;
    setIsOwned(nextState);
    setOwnershipSaving(true);
    try {
      await bulkUpdateCharacterOwnership([{ character_id: character.id, is_owned: nextState }]);
    } catch (err) {
      console.error('Failed to update character ownership:', err);
      setIsOwned(!nextState);
    } finally {
      setOwnershipSaving(false);
    }
  };

  const getAvatarUrl = (char: CharacterItem) => {
    let rawPath = char.avatar_local_path;
    if (!rawPath && char.name) {
      const subDir = isSurvivor ? 'survivors' : 'killers';
      const sanitized = getCharacterSlug(char.name);
      rawPath = `avatars/${subDir}/${sanitized}.png`;
    }
    if (!rawPath) return char.avatar_url || char.portrait_url || '';
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

  const getRarityBadgeColor = (rarity?: string) => {
    const r = (rarity || '').toLowerCase();
    if (r.includes('ultra') || r.includes('iridescent'))
      return 'border-pink-500/50 bg-pink-500/10 text-pink-400';
    if (r.includes('very rare') || r.includes('purple'))
      return 'border-purple-500/50 bg-purple-500/10 text-purple-400';
    if (r.includes('rare') || r.includes('green'))
      return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
    if (r.includes('uncommon') || r.includes('yellow'))
      return 'border-amber-500/50 bg-amber-500/10 text-amber-400';
    return 'border-slate-500/50 bg-slate-500/10 text-slate-400';
  };

  const sameRoleCharacters = allCharacters.filter(
    (c) => (c.category || c.role || '').toLowerCase() === (character.category || character.role || '').toLowerCase()
  );
  const currentIndex = sameRoleCharacters.findIndex(
    (c) => c.name.toLowerCase() === character.name.toLowerCase()
  );
  const prevChar =
    currentIndex > 0
      ? sameRoleCharacters[currentIndex - 1]
      : sameRoleCharacters.length > 1
      ? sameRoleCharacters[sameRoleCharacters.length - 1]
      : null;
  const nextChar =
    currentIndex >= 0 && currentIndex < sameRoleCharacters.length - 1
      ? sameRoleCharacters[currentIndex + 1]
      : sameRoleCharacters.length > 1
      ? sameRoleCharacters[0]
      : null;

  // Filter equipment / addons
  const filteredEquipment = addons.filter((item) => {
    const query = equipmentSearch.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.name.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query));

    const itemRarity = (item.rarity || '').toLowerCase();
    const matchesRarity =
      equipmentRarityFilter === 'all' || itemRarity.includes(equipmentRarityFilter.toLowerCase());

    return matchesSearch && matchesRarity;
  });

  const uniqueRarities = Array.from(
    new Set(addons.map((a) => a.rarity).filter(Boolean))
  ) as string[];

  const rawLoreText =
    character.lore ||
    t.lorePlaceholder?.replace('{name}', character.name) ||
    `The Entity is still gathering the archived memories and background lore for ${character.name}. Check back soon as the archives expand.`;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumbs & Character Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
          <Link
            href={`/${currentLocale}/characters`}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{t.allCharacters || 'Characters Hub'}</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span
            className={`font-bold ${
              isSurvivor ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {roleLabel}
          </span>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-slate-900 dark:text-slate-100 font-bold truncate">{character.name}</span>
        </nav>

        {/* Prev / Next Character Quick Switcher */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {prevChar && (
            <Link
              href={`/${currentLocale}/characters/${getCharacterSlug(prevChar.name)}`}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 text-xs font-bold transition-all shadow-xs"
              title={`${t.prevCharacter || 'Previous'}: ${prevChar.name}`}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden md:inline truncate max-w-[120px]">{prevChar.name}</span>
            </Link>
          )}

          {nextChar && (
            <Link
              href={`/${currentLocale}/characters/${getCharacterSlug(nextChar.name)}`}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 text-xs font-bold transition-all shadow-xs"
              title={`${t.nextCharacter || 'Next'}: ${nextChar.name}`}
            >
              <span className="hidden md:inline truncate max-w-[120px]">{nextChar.name}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Main Character Dossier Hero Block */}
      <div
        className={`relative overflow-hidden rounded-3xl border ${
          isSurvivor
            ? 'border-emerald-500/20 bg-gradient-to-br from-white via-emerald-50/20 to-slate-50 dark:border-emerald-900/40 dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-900'
            : 'border-rose-500/20 bg-gradient-to-br from-white via-rose-50/20 to-slate-50 dark:border-rose-900/40 dark:from-slate-950 dark:via-rose-950/20 dark:to-slate-900'
        } p-6 sm:p-8 lg:p-10 shadow-sm dark:shadow-2xl transition-all`}
      >
        {/* Ambient atmospheric aura */}
        <div
          className={`absolute -right-24 -top-24 h-96 w-96 rounded-full blur-3xl pointer-events-none opacity-40 ${
            isSurvivor ? 'bg-emerald-500/20' : 'bg-rose-500/25'
          }`}
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Avatar Showcase (Click to open 3D / Full Model Modal) */}
          <div className="lg:col-span-4 flex flex-col items-center">
            <div
              onClick={() => setIsModelModalOpen(true)}
              className="group relative w-full max-w-[280px] sm:max-w-[320px] aspect-[3/4] rounded-3xl overflow-hidden border-2 border-slate-200/90 dark:border-slate-800 bg-slate-950 shadow-2xl cursor-pointer hover:border-amber-500/60 transition-all duration-300"
              title={t.view3DModel || 'Click to View Full 3D Model'}
            >
              {/* Image renderer */}
              <img
                src={getAvatarUrl(character)}
                alt={character.name}
                className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/5/53/IconHelpLoading_players.png/revision/latest';
                }}
              />

              {/* Hover overlay hint */}
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center transition-opacity duration-200">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-2 shadow-lg">
                  <Eye className="h-6 w-6" />
                </div>
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  {t.view3DModel || 'View 3D Model / Full Render'}
                </span>
                <span className="text-[10px] text-slate-300 mt-1">Interactive Viewer Slot</span>
              </div>

              {/* Bottom gradient shadow */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent pointer-events-none" />

              {/* Status Badge in bottom corner */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border backdrop-blur-md ${
                    isSurvivor
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {isSurvivor ? <Shield className="h-3 w-3" /> : <Skull className="h-3 w-3" />}
                  {roleLabel}
                </span>

                {character.code_prefix && (
                  <span className="rounded-full bg-slate-900/90 border border-slate-700 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-300">
                    {character.code_prefix}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Character Meta, Killer Stats, Power Button, Lore Trigger */}
          <div className="lg:col-span-8 space-y-6">
            {/* Top Row: Badges & Top-Right Power Icon Button */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Role Pill */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black border ${
                    isSurvivor
                      ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300'
                      : 'bg-rose-500/15 text-rose-700 border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-300'
                  }`}
                >
                  {isSurvivor ? <Shield className="h-3.5 w-3.5" /> : <Skull className="h-3.5 w-3.5" />}
                  {roleLabel}
                </span>

                {/* DLC / Chapter Pill */}
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border border-slate-300 bg-white/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 shadow-xs">
                  <Award className="h-3.5 w-3.5 text-amber-500" />
                  {chapterName}
                </span>

                {/* License Tag */}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                    isLicensed
                      ? 'bg-purple-500/15 text-purple-700 border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-300'
                      : 'bg-slate-500/15 text-slate-700 border-slate-500/30 dark:bg-slate-500/20 dark:text-slate-400'
                  }`}
                >
                  {isLicensed ? t.dlcLicensed || 'Licensed Franchise' : t.dlcOriginal || 'Original Content'}
                </span>
              </div>

              {/* TOP RIGHT: Killer Power Icon Button (For Killers) */}
              {!isSurvivor && killerPower && (
                <button
                  id="btn-killer-power-top-right"
                  onClick={() => setIsPowerModalOpen(true)}
                  className="group relative flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/90 hover:bg-rose-950/60 border border-rose-500/40 hover:border-rose-400 shadow-lg shadow-rose-950/30 transition-all duration-200 cursor-pointer active:scale-95"
                  title={`${t.killerPower || 'Killer Power'}: ${killerPower.name}`}
                >
                  <div className="relative h-9 w-9 shrink-0 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center p-1 overflow-hidden group-hover:scale-105 transition-transform">
                    {killerPower.icon_url ? (
                      <img
                        src={killerPower.icon_url}
                        alt={killerPower.name}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Flame className="h-5 w-5 text-rose-400 animate-pulse" />
                    )}
                  </div>
                  <div className="text-left">
                    <span className="block text-[9px] font-mono font-bold uppercase tracking-wider text-rose-400">
                      {t.killerPower || 'Killer Power'}
                    </span>
                    <span className="block text-xs font-black text-white truncate max-w-[150px]">
                      {killerPower.name}
                    </span>
                  </div>
                  <BookOpen className="h-3.5 w-3.5 text-rose-400/80 group-hover:text-rose-300 transition-colors ml-0.5" />
                </button>
              )}
            </div>

            {/* Character Titles */}
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight font-mono">
                {character.name}
              </h1>
              {character.real_name && character.real_name !== character.name && (
                <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-400">
                  <span>{t.realName || 'Real Name'}:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-200">{character.real_name}</span>
                </div>
              )}
            </div>

            {/* KILLER STATS BAR (Movement Speed, Terror Radius Clickable, Height) */}
            {!isSurvivor && (
              <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-rose-500/20 dark:border-rose-900/30 shadow-md space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400">
                    <Activity className="h-3.5 w-3.5" />
                    Combat Attributes & Threat Scale
                  </span>
                  <span className="text-[10px] text-slate-400">Click Terror Radius for visualizer</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Movement Speed */}
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80">
                    <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                      <Gauge className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-mono text-slate-400 uppercase">
                        {t.movementSpeed || 'Movement Speed'}
                      </span>
                      <span className="block text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                        {killerSpeed}
                      </span>
                    </div>
                  </div>

                  {/* Terror Radius (Clickable to open Terror Radius Modal) */}
                  <button
                    id="btn-terror-radius-modal"
                    onClick={() => setIsTerrorRadiusModalOpen(true)}
                    className="group flex items-center gap-3 p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-500/30 hover:border-rose-400 transition-all cursor-pointer text-left shadow-xs active:scale-95"
                    title={t.terrorRadiusVisualizer || 'Click to view visual terror radius scale'}
                  >
                    <div className="h-9 w-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 dark:text-rose-400 shrink-0 group-hover:scale-110 transition-transform">
                      <Radio className="h-4 w-4 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[10px] font-mono text-rose-500 dark:text-rose-400 font-bold uppercase flex items-center gap-1">
                        {t.terrorRadius || 'Terror Radius'}
                        <Eye className="h-2.5 w-2.5 opacity-80" />
                      </span>
                      <span className="block text-xs sm:text-sm font-black text-rose-700 dark:text-rose-300 underline decoration-dotted underline-offset-2">
                        {killerTerrorRadius}
                      </span>
                    </div>
                  </button>

                  {/* Height */}
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80">
                    <div className="h-9 w-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-500 shrink-0">
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-mono text-slate-400 uppercase">
                        {t.height || 'Height'}
                      </span>
                      <span className="block text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                        {killerHeight}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DLC & Chapter Metadata Strip */}
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">{t.dlcChapter || 'Chapter'}</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{chapterName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">{t.dlcReleaseYear || 'Release Date'}</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{releaseDate || releaseYear}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">{t.codePrefix || 'Order ID'}</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                    {character.code_prefix || `#${character.release_number || character.id || 1}`}
                  </span>
                </div>
              </div>

              {dlcCounterparts && dlcCounterparts.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400">
                    {t.dlcAssociatedWith || 'DLC Counterparts'}:
                  </span>
                  {dlcCounterparts.map((counterpart) => (
                    <Link
                      key={counterpart}
                      href={`/${currentLocale}/characters/${getCharacterSlug(counterpart)}`}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <span>{counterpart}</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Actions: Ownership Button & Lore Trigger Button */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={handleToggleOwnership}
                disabled={ownershipSaving}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer shadow-sm ${
                  isOwned
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-900/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {isOwned ? <Check className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                <span>
                  {ownershipSaving
                    ? 'Saving...'
                    : isOwned
                    ? t.ownedBadge || 'In Your Collection'
                    : t.markAsOwned || 'Mark as Owned'}
                </span>
              </button>

              {/* Read Lore Button (Opens Lore Modal) */}
              <button
                id="btn-character-lore-modal"
                onClick={() => setIsLoreModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 transition-all cursor-pointer active:scale-95 shadow-xs"
              >
                <BookOpen className="h-4 w-4 text-purple-500" />
                <span>{t.viewLore || 'Read Lore & Bio'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TEACHABLE PERKS SECTION (Icons Only, Bigger, Hoverable Tooltips, Clickable Modals) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                {t.teachablePerks || 'Teachable Perks'} ({perks.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.hoverToInspect || 'Hover over perk icons for preview, click for full details.'}
              </p>
            </div>
          </div>
        </div>

        {perks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center bg-white/40 dark:bg-slate-900/20">
            <p className="text-xs text-slate-500 italic">
              {t.noPerks || 'No teachable perks cataloged for this character.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-6 sm:gap-8 py-2">
            {perks.map((perk, idx) => (
              <div
                key={`${perk.name}-${idx}`}
                className="relative group"
                onMouseEnter={() => setHoveredPerkIndex(idx)}
                onMouseLeave={() => setHoveredPerkIndex(null)}
              >
                {/* BIGGER Perk Diamond Icon Button */}
                <button
                  onClick={() =>
                    setSelectedPerkForModal({
                      name: perk.name,
                      category: perk.category,
                      character: perk.character || character.name,
                      character_real_name: perk.character_real_name || character.real_name,
                      character_avatar_path: perk.character_avatar_path || character.avatar_local_path,
                      description: perk.description,
                      icon_url: perk.icon_url || '',
                      icon_local_path: perk.icon_local_path || '',
                    })
                  }
                  className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/40 hover:border-amber-400 p-2 flex items-center justify-center shadow-lg hover:shadow-amber-500/20 hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer"
                  aria-label={perk.name}
                >
                  <img
                    src={getAssetUrl(perk.icon_local_path, perk.icon_url)}
                    alt={perk.name}
                    className="h-full w-full object-contain filter drop-shadow-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/5/53/IconHelpLoading_players.png/revision/latest';
                    }}
                  />
                  {/* Subtle corner badge */}
                  <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-amber-500" />
                </button>

                {/* Floating Instant Tooltip */}
                {hoveredPerkIndex === idx && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-40 w-64 p-3.5 rounded-2xl bg-slate-950/95 border border-amber-500/40 shadow-2xl backdrop-blur-md text-left pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="text-xs font-black text-amber-400 truncate">{perk.name}</h4>
                      <span className="text-[9px] font-bold text-rose-400 shrink-0 uppercase">
                        {perk.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-4 leading-relaxed font-sans">
                      {perk.description}
                    </p>
                    <span className="block text-[9px] font-mono text-amber-500/80 mt-2 text-right">
                      {t.clickToInspect || 'Click to inspect'} &rarr;
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* POWER ADD-ONS / SURVIVAL ITEMS SECTION (Icons Only, Bigger, Hoverable Tooltips, Clickable Modals) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                isSurvivor
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
              }`}
            >
              <Package className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                {isSurvivor
                  ? t.equipmentTitleSurvivor || 'Survival Items & Equipment'
                  : t.equipmentTitleKiller || 'Power Add-ons & Equipment'}
                {' '}({addons.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.hoverToInspect || 'Hover over icons for preview, click for full details.'}
              </p>
            </div>
          </div>

          {/* Search & Rarity Filter for Addons/Equipment */}
          {addons.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="relative w-44 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={t.searchEquipment || 'Filter items...'}
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {uniqueRarities.length > 0 && (
                <select
                  value={equipmentRarityFilter}
                  onChange={(e) => setEquipmentRarityFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">{t.allRarities || 'All Rarities'}</option>
                  {uniqueRarities.map((rarity) => (
                    <option key={rarity} value={rarity}>
                      {rarity}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {addons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center bg-white/40 dark:bg-slate-900/20">
            <p className="text-xs text-slate-500 italic">
              {t.noEquipment || 'No specific equipment or add-ons cataloged for this character in the database.'}
            </p>
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center bg-white/40 dark:bg-slate-900/20">
            <p className="text-xs text-slate-500">No items match your filter.</p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 max-h-[460px] overflow-y-auto p-2">
            {filteredEquipment.map((item, idx) => (
              <div
                key={`equip-${item.name}-${idx}`}
                className="relative group"
                onMouseEnter={() => setHoveredEquipIndex(idx)}
                onMouseLeave={() => setHoveredEquipIndex(null)}
              >
                {/* BIGGER Addon / Item Icon Button */}
                <button
                  onClick={() => setSelectedEquipmentForModal(item)}
                  className={`relative h-16 w-16 sm:h-18 sm:w-18 rounded-2xl bg-slate-900 border-2 p-1.5 flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer ${getRarityBadgeColor(
                    item.rarity
                  )}`}
                  aria-label={item.name}
                >
                  <img
                    src={getAssetUrl(item.icon_local_path, item.icon_url)}
                    alt={item.name}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/5/53/IconHelpLoading_players.png/revision/latest';
                    }}
                  />
                </button>

                {/* Floating Instant Tooltip */}
                {hoveredEquipIndex === idx && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-40 w-60 p-3 rounded-2xl bg-slate-950/95 border border-slate-700 shadow-2xl backdrop-blur-md text-left pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="text-xs font-black text-white truncate">{item.name}</h4>
                      {item.rarity && (
                        <span className="text-[9px] font-bold text-amber-400 shrink-0">{item.rarity}</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-slate-300 line-clamp-3 leading-snug font-sans">
                        {item.description}
                      </p>
                    )}
                    <span className="block text-[9px] font-mono text-slate-400 mt-1.5 text-right">
                      {t.clickToInspect || 'Click to inspect'} &rarr;
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* MODALS SECTION (All with Click Outside to Close, Escape Key Listener)     */}
      {/* ========================================================================= */}

      {/* 1. TERROR RADIUS VISUALIZER MODAL */}
      {isTerrorRadiusModalOpen && (
        <div
          id="terror-radius-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsTerrorRadiusModalOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-rose-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-rose-500/15 via-red-500/5 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 shadow-inner">
                  <Radio className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-[11px] font-mono font-black uppercase tracking-wider text-rose-500">
                    {character.name} &bull; Acoustic Range
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                    {t.terrorRadiusVisualizer || 'Terror Radius Visualizer'}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsTerrorRadiusModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label={t.close || 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Interactive Visual Radar & Heartbeat Propagation */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 dark:text-slate-300">
              {/* Concentric Circle Visual Scale */}
              <div className="relative flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-950 border border-rose-500/20 overflow-hidden">
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                  {/* 45m Lullaby Ring */}
                  <div className="absolute inset-0 rounded-full border border-dashed border-purple-500/30 flex items-start justify-center pt-1">
                    <span className="text-[9px] font-mono text-purple-400/80">45m (Lullaby)</span>
                  </div>

                  {/* 32m Max Standard Ring */}
                  <div
                    className={`absolute inset-4 rounded-full border ${
                      killerTRMeters >= 32
                        ? 'border-2 border-rose-500/80 bg-rose-500/5 animate-pulse'
                        : 'border-slate-700'
                    } flex items-start justify-center pt-1`}
                  >
                    <span className="text-[9px] font-mono font-bold text-rose-400">32m (Audible)</span>
                  </div>

                  {/* 24m Moderate Ring */}
                  <div
                    className={`absolute inset-12 rounded-full border ${
                      killerTRMeters === 24
                        ? 'border-2 border-rose-500 bg-rose-500/10 animate-pulse'
                        : 'border-slate-800'
                    } flex items-start justify-center pt-1`}
                  >
                    <span className="text-[9px] font-mono font-bold text-amber-400">24m</span>
                  </div>

                  {/* 16m Threat Ring */}
                  <div className="absolute inset-20 rounded-full border border-rose-600/60 bg-rose-600/10 flex items-start justify-center pt-1">
                    <span className="text-[9px] font-mono font-bold text-rose-300">16m</span>
                  </div>

                  {/* 8m Danger Center Ring */}
                  <div className="absolute inset-28 rounded-full border-2 border-red-500 bg-red-600/20 flex items-center justify-center">
                    <span className="text-[9px] font-mono font-black text-red-300">8m (Chase)</span>
                  </div>

                  {/* Killer Center Dot */}
                  <div className="h-4 w-4 rounded-full bg-red-500 shadow-lg shadow-red-500/50 z-10" />
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
                  <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
                  <span>
                    Current Base Terror Radius:{' '}
                    <strong className="text-rose-400">{killerTerrorRadius}</strong>
                  </span>
                </div>
              </div>

              {/* Heartbeat Stages Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-black uppercase text-slate-400 tracking-wider">
                  {t.heartbeatStages || 'Heartbeat Intensity Progression'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40">
                    <strong className="text-red-400 block mb-1">
                      {t.immediateThreat || '0 - 8 Metres (Immediate Chase)'}
                    </strong>
                    <p className="text-slate-300 text-[11px]">
                      Max heartbeat tempo, aggressive percussion, and direct visual red stain engagement.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30">
                    <strong className="text-rose-400 block mb-1">
                      {t.dangerZone || '8 - 16 Metres (Danger Zone)'}
                    </strong>
                    <p className="text-slate-300 text-[11px]">
                      Rapid heavy thumping heartbeat; killer is actively maneuvering around loops.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
                    <strong className="text-amber-400 block mb-1">
                      {t.approaching || '16 - 24 Metres (Approaching)'}
                    </strong>
                    <p className="text-slate-300 text-[11px]">
                      Rhythmic steady pulse indicating proximity to survivor objectives.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <strong className="text-slate-300 block mb-1">
                      {t.audibleRange || '24 - 32 Metres (Audible Range)'}
                    </strong>
                    <p className="text-slate-400 text-[11px]">
                      Initial faint audio cues signaling presence within the trial quadrant.
                    </p>
                  </div>
                </div>
              </div>

              {/* Speed Comparison Formula */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
                  {t.survivorComparison || 'Survivor Speed Comparison'}
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  {t.survivorComparisonDesc || 'Survivor standard sprint speed is 4.0 m/s (100%).'}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1 text-slate-400">
                  <span>
                    Killer Base: <strong className="text-rose-400">{killerSpeed}</strong>
                  </span>
                  <span>
                    Survivor Sprint: <strong className="text-emerald-400">4.0 m/s (100%)</strong>
                  </span>
                  <span>
                    Straight Gap Close:{' '}
                    <strong className="text-amber-400">
                      ~{(killerTRMeters / 4.6).toFixed(1)}s straight line
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
              <span className="text-xs text-slate-400 font-mono">{t.clickOutsideToClose || 'Esc or click outside to close'}</span>
              <button
                onClick={() => setIsTerrorRadiusModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 transition-all cursor-pointer shadow-sm"
              >
                {t.close || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. KILLER POWER MODAL */}
      {isPowerModalOpen && killerPower && (
        <div
          id="killer-power-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPowerModalOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-rose-500/10 via-red-500/5 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 overflow-hidden shadow-inner p-1">
                  {killerPower.icon_url ? (
                    <img
                      src={killerPower.icon_url}
                      alt={killerPower.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Flame className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-mono font-black uppercase tracking-wider text-rose-500">
                    {character.name} &bull; {t.killerPower || 'Killer Power'}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                    {killerPower.name}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsPowerModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label={t.close || 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                <span className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
                  <BookOpen className="h-3.5 w-3.5 text-rose-500" />
                  {t.killerPowerDesc || 'Special ability and combat mechanics'}
                </span>
                <p className="whitespace-pre-line text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
                  {killerPower.description}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
              <span className="text-xs text-slate-400 font-mono">{t.clickOutsideToClose || 'Esc or click outside to close'}</span>
              <button
                onClick={() => setIsPowerModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 transition-all cursor-pointer shadow-sm"
              >
                {t.close || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CHARACTER LORE & BIO MODAL */}
      {isLoreModalOpen && (
        <div
          id="character-lore-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLoreModalOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-500/15 via-indigo-500/5 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-inner">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[11px] font-mono font-black uppercase tracking-wider text-purple-400">
                    The Entity's Archives &bull; Codex #{character.id || 1}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                    {character.name} &mdash; {t.loreTitle || 'Lore & Bio'}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsLoreModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label={t.close || 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lore Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
              <p className="italic text-slate-600 dark:text-slate-400 border-l-2 border-purple-500 pl-4 py-1">
                "{character.name} &mdash; Entered The Fog."
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 text-sm leading-relaxed whitespace-pre-line text-slate-800 dark:text-slate-200">
                {rawLoreText}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
              <span className="text-xs text-slate-400 font-mono">{t.clickOutsideToClose || 'Esc or click outside to close'}</span>
              <button
                onClick={() => setIsLoreModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 transition-all cursor-pointer shadow-sm"
              >
                {t.close || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. FULL 3D MODEL / RENDER VIEW MODAL */}
      {isModelModalOpen && (
        <div
          id="character-3d-model-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModelModalOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-500/15 via-orange-500/5 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                  <Box className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-[11px] font-mono font-black uppercase tracking-wider text-amber-400">
                    High-Res 3D Model View
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                    {character.name}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsModelModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label={t.close || 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Model Visual Slot */}
            <div className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="relative w-full max-w-[260px] aspect-[3/4] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
                <img
                  src={getAvatarUrl(character)}
                  alt={character.name}
                  className="h-full w-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-amber-500/30 text-[10px] font-mono text-amber-400">
                  Interactive 3D Mesh Engine (WIP)
                </div>
              </div>

              <p className="text-xs text-slate-400 max-w-md">
                {t.fullModelNotice || 'High-fidelity 3D model viewport slot. Currently displaying full portrait render.'}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
              <span className="text-xs text-slate-400 font-mono">{t.clickOutsideToClose || 'Esc or click outside to close'}</span>
              <button
                onClick={() => setIsModelModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 transition-all cursor-pointer shadow-sm"
              >
                {t.close || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ADDON / EQUIPMENT DETAIL MODAL */}
      {selectedEquipmentForModal && (
        <div
          id="equipment-detail-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEquipmentForModal(null);
          }}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-100 via-slate-50 to-transparent dark:from-slate-800/40 dark:via-slate-900 dark:to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`h-14 w-14 rounded-2xl bg-slate-950 border-2 p-1.5 flex items-center justify-center shrink-0 shadow-md ${getRarityBadgeColor(
                    selectedEquipmentForModal.rarity
                  )}`}
                >
                  <img
                    src={getAssetUrl(selectedEquipmentForModal.icon_local_path, selectedEquipmentForModal.icon_url)}
                    alt={selectedEquipmentForModal.name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  {selectedEquipmentForModal.rarity && (
                    <span className="text-[10px] font-mono font-bold uppercase text-amber-500">
                      {selectedEquipmentForModal.rarity}
                    </span>
                  )}
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 font-mono leading-snug">
                    {selectedEquipmentForModal.name}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedEquipmentForModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label={t.close || 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
              {selectedEquipmentForModal.associated_target && (
                <div className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  Target: <span className="text-slate-900 dark:text-slate-200">{selectedEquipmentForModal.associated_target}</span>
                </div>
              )}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 whitespace-pre-line text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                {selectedEquipmentForModal.description || 'No detailed mechanics text available.'}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
              <span className="text-xs text-slate-400 font-mono">{t.clickOutsideToClose || 'Esc or click outside to close'}</span>
              <button
                onClick={() => setSelectedEquipmentForModal(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 transition-all cursor-pointer shadow-sm"
              >
                {t.close || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. INSPECT PERK MODAL */}
      {selectedPerkForModal && (
        <PerkModal
          perk={selectedPerkForModal}
          onClose={() => setSelectedPerkForModal(null)}
          dict={dict}
        />
      )}

      {/* 7. AUTH MODAL FOR OWNERSHIP SYNC */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};
