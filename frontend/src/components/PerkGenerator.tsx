// frontend/src/components/PerkGenerator.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dices,
  Shield,
  Skull,
  Copy,
  Check,
  Sparkles,
  ImageOff,
  RotateCcw,
  CircleDot,
  Repeat,
  Layers,
  EyeOff,
  Trash2,
  Flame,
  AlertTriangle,
} from 'lucide-react';
import { Perk } from './PerkCard';
import { WheelOfFortune, EXHAUSTION_PERK_NAMES } from './WheelOfFortune';
import { ChaosWheelModal, ChaosMutator } from './ChaosWheelModal';
import { CharacterConfigModal } from './CharacterConfigModal';
import { useAuth } from '@/context/AuthContext';
import {
  fetchGeneratorConfig,
  updateGeneratorConfig,
  fetchDrawnPerks,
  addDrawnPerks,
  resetDrawnPerks,
} from '../services/generatorApi';

interface PerkGeneratorProps {
  allPerks: Perk[];
  onSelectPerk: (perk: Perk) => void;
  dict: any;
}

interface DrawnSlot {
  page: number;
  slot: number;
  perk?: Perk;
}

const STORAGE_KEY = 'lemon_dbd_generator_v7';

export const PerkGenerator: React.FC<PerkGeneratorProps> = ({
  allPerks,
  onSelectPerk,
  dict,
}) => {
  const { user } = useAuth();
  const [role, setRole] = useState<'Survivor' | 'Killer'>('Survivor');
  const [genMode, setGenMode] = useState<'instant' | 'wheel'>('wheel');
  const [noRepeatPerks, setNoRepeatPerks] = useState<boolean>(true);
  const [spinDurationSec, setSpinDurationSec] = useState<number>(3);

  const [drawnPerks, setDrawnPerks] = useState<string[]>([]);
  const [loadout, setLoadout] = useState<(DrawnSlot | null)[]>([null, null, null, null]);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);
  const [isChaosModalOpen, setIsChaosModalOpen] = useState(false);
  const [activeMutator, setActiveMutator] = useState<ChaosMutator | null>(null);
  const [copied, setCopied] = useState(false);

  const [isCharModalOpen, setIsCharModalOpen] = useState(false);
  const [enabledSurvCharacters, setEnabledSurvCharacters] = useState<string[]>([]);
  const [enabledKillerCharacters, setEnabledKillerCharacters] = useState<string[]>([]);
  const [revealedSlots, setRevealedSlots] = useState<boolean[]>([false, false, false, false]);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const characterOptions = useMemo(() => {
    const rolePerks = allPerks.filter((p) => p.category === role);
    const namesSet = new Set<string>();
    rolePerks.forEach((p) => {
      const isGeneral = !p.character || p.character === 'General' || p.is_generic_counterpart;
      if (!isGeneral && p.character) {
        namesSet.add(p.character);
      }
    });
    return Array.from(namesSet)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }, [allPerks, role]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role) setRole(parsed.role);
        if (parsed.genMode) setGenMode(parsed.genMode);
        if (typeof parsed.noRepeatPerks === 'boolean') setNoRepeatPerks(parsed.noRepeatPerks);
        if (parsed.spinDurationSec) setSpinDurationSec(parsed.spinDurationSec);
        if (parsed.loadout) setLoadout(parsed.loadout);
        if (typeof parsed.activeSlotIdx === 'number') setActiveSlotIdx(parsed.activeSlotIdx);
      }

      const savedSurv = localStorage.getItem('lemon_dbd_enabled_survs_v7');
      if (savedSurv) setEnabledSurvCharacters(JSON.parse(savedSurv));

      const savedKillers = localStorage.getItem('lemon_dbd_enabled_killers_v7');
      if (savedKillers) setEnabledKillerCharacters(JSON.parse(savedKillers));
    } catch (e) {
      console.error('Failed loading generator state from localStorage:', e);
    }
  }, []);

  useEffect(() => {
    if (characterOptions.length === 0) return;
    const allCharNames = ['General', ...characterOptions.map((c) => c.value)];

    if (role === 'Survivor' && enabledSurvCharacters.length === 0) {
      setEnabledSurvCharacters(allCharNames);
    } else if (role === 'Killer' && enabledKillerCharacters.length === 0) {
      setEnabledKillerCharacters(allCharNames);
    }
  }, [characterOptions, role, enabledSurvCharacters.length, enabledKillerCharacters.length]);

  useEffect(() => {
    fetchGeneratorConfig()
      .then((config) => {
        if (config.role === 'Survivor' || config.role === 'Killer') {
          setRole(config.role);
        }
        if (config.gen_mode === 'instant' || config.gen_mode === 'wheel') {
          setGenMode(config.gen_mode);
        }
        if (typeof config.no_repeat_perks !== 'undefined') {
          setNoRepeatPerks(Boolean(config.no_repeat_perks));
        }
        if (config.spin_duration_sec) setSpinDurationSec(config.spin_duration_sec);
      })
      .catch((e) => {
        console.error('Failed fetching generator config from SQLite API:', e);
      });
  }, []);

  useEffect(() => {
    fetchDrawnPerks(role)
      .then((perks) => {
        setDrawnPerks(perks);
      })
      .catch((e) => {
        console.error('Failed fetching drawn perks from SQLite API:', e);
      });
  }, [role]);

  useEffect(() => {
    try {
      const payload = {
        role,
        genMode,
        noRepeatPerks,
        spinDurationSec,
        loadout,
        activeSlotIdx,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed saving generator state to localStorage:', e);
    }
  }, [role, genMode, noRepeatPerks, spinDurationSec, loadout, activeSlotIdx]);

  const activeEnabledChars = useMemo(() => {
    return role === 'Survivor' ? enabledSurvCharacters : enabledKillerCharacters;
  }, [role, enabledSurvCharacters, enabledKillerCharacters]);

  const handleSaveEnabledCharacters = (newEnabled: string[]) => {
    if (role === 'Survivor') {
      setEnabledSurvCharacters(newEnabled);
      localStorage.setItem('lemon_dbd_enabled_survs_v7', JSON.stringify(newEnabled));
    } else {
      setEnabledKillerCharacters(newEnabled);
      localStorage.setItem('lemon_dbd_enabled_killers_v7', JSON.stringify(newEnabled));
    }
  };

  const totalRolePerksInGame = useMemo(() => {
    return allPerks.filter((p) => p.category === role).length;
  }, [allPerks, role]);

  const baseEligibleRolePerks = useMemo(() => {
    const rolePerks = allPerks.filter((p) => p.category === role);
    const enabledSet = new Set(activeEnabledChars);

    const eligible = rolePerks.filter((p) => {
      if (user && p.is_owned === false) {
        return false;
      }
      const isGeneral = !p.character || p.character === 'General' || p.is_generic_counterpart;
      if (isGeneral) return true;
      return enabledSet.has(p.character);
    });

    return eligible.sort((a, b) => a.name.localeCompare(b.name));
  }, [allPerks, role, activeEnabledChars, user]);

  const ownedOrAvailableCount = baseEligibleRolePerks.length;

  const activePlayablePerks = useMemo(() => {
    if (!noRepeatPerks) return baseEligibleRolePerks;
    const drawnSet = new Set(drawnPerks);
    const remaining = baseEligibleRolePerks.filter((p) => !drawnSet.has(p.name));
    return remaining.length > 0 ? remaining : baseEligibleRolePerks;
  }, [baseEligibleRolePerks, noRepeatPerks, drawnPerks]);

  const totalPlayableCount = activePlayablePerks.length;
  const perksPerPage = 15;
  const totalPages = Math.max(1, Math.ceil(totalPlayableCount / 15));
  const lastPagePerks = totalPlayableCount % 15 || (totalPlayableCount > 0 ? 15 : 0);

  const dynamicPerksCountValue = useMemo(() => {
    if (!user) {
      return noRepeatPerks ? totalPlayableCount : totalRolePerksInGame;
    }
    return noRepeatPerks ? totalPlayableCount : ownedOrAvailableCount;
  }, [user, noRepeatPerks, totalPlayableCount, totalRolePerksInGame, ownedOrAvailableCount]);

  const handleRoleChange = async (newRole: 'Survivor' | 'Killer') => {
    setRole(newRole);
    setLoadout([null, null, null, null]);
    setRevealedSlots([false, false, false, false]);
    try {
      await updateGeneratorConfig({ role: newRole });
    } catch (e) {
      console.error('Failed updating role in SQLite:', e);
    }
  };

  const handleGenModeChange = async (newMode: 'instant' | 'wheel') => {
    setGenMode(newMode);
    try {
      await updateGeneratorConfig({ gen_mode: newMode });
    } catch (e) {
      console.error('Failed updating gen_mode in SQLite:', e);
    }
  };

  const handleToggleNoRepeat = async () => {
    const nextVal = !noRepeatPerks;
    setNoRepeatPerks(nextVal);
    try {
      await updateGeneratorConfig({ no_repeat_perks: nextVal ? 1 : 0 });
    } catch (e) {
      console.error('Failed updating no_repeat_perks in SQLite:', e);
    }
  };

  const handleResetAllLoadoutAndWheels = async () => {
    setLoadout([null, null, null, null]);
    setActiveSlotIdx(0);
    setRevealedSlots([false, false, false, false]);
    setActiveMutator(null);
    try {
      const updatedDrawn = await resetDrawnPerks(role);
      setDrawnPerks(updatedDrawn);
    } catch (err) {
      console.error('Failed resetting drawn perks in SQLite API:', err);
      setDrawnPerks([]);
    }
  };

  const handleClearSlot = (slotIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadout((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
    setActiveSlotIdx(slotIdx);
  };

  const rollInstantLoadout = useCallback(async () => {
    if (activePlayablePerks.length === 0) return;

    let pool = [...activePlayablePerks];

    if (activeMutator?.id === 'no_exhaustion') {
      const filtered = pool.filter((p) => {
        const nameLower = p.name.toLowerCase().trim();
        const descLower = (p.description || '').toLowerCase();
        return (
          !EXHAUSTION_PERK_NAMES.has(nameLower) &&
          !descLower.includes('exhausted') &&
          !descLower.includes('exhaustion')
        );
      });
      if (filtered.length > 0) pool = filtered;
    }

    const drawnSlots: DrawnSlot[] = [];
    const needed = Math.min(4, pool.length);

    for (let i = 0; i < needed; i++) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      const chosenPerk = pool.splice(randomIndex, 1)[0];

      const indexInSorted = activePlayablePerks.findIndex((p) => p.name === chosenPerk.name);
      const page = Math.floor(Math.max(0, indexInSorted) / 15) + 1;
      const slot = (Math.max(0, indexInSorted) % 15) + 1;

      drawnSlots.push({ page, slot, perk: chosenPerk });
    }

    setLoadout(drawnSlots);
    setRevealedSlots([false, false, false, false]);

    const newPerkNames = drawnSlots.map((s) => s.perk?.name).filter(Boolean) as string[];
    if (newPerkNames.length > 0) {
      try {
        const updatedDrawn = await addDrawnPerks(role, newPerkNames);
        setDrawnPerks(updatedDrawn);
      } catch (err) {
        console.error('Failed saving drawn perks to SQLite API:', err);
      }
    }
  }, [activePlayablePerks, role, activeMutator]);

  const handleWheelWinSlot = async (wonData: DrawnSlot) => {
    setLoadout((prev) => {
      const next = [...prev];
      next[activeSlotIdx] = wonData;
      return next;
    });
    setActiveSlotIdx((prev) => (prev + 1) % 4);

    if (wonData.perk) {
      try {
        const updatedDrawn = await addDrawnPerks(role, [wonData.perk.name]);
        setDrawnPerks(updatedDrawn);
      } catch (err) {
        console.error('Failed saving drawn perk from wheel to SQLite API:', err);
      }
    }
  };

  const handleCopyBuild = () => {
    const activePerks = loadout.filter(Boolean) as DrawnSlot[];
    if (activePerks.length === 0) return;

    const text = activePerks
      .map(
        (s, idx) =>
          `${idx + 1}. ${s.perk ? s.perk.name : 'Empty'} [Page ${s.page} / Slot ${s.slot}]`
      )
      .join('\n');

    navigator.clipboard.writeText(`DBD ${role} Build:\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSurvivor = role === 'Survivor';

  return (
    <div className="w-full space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-5 shadow-sm dark:shadow-2xl backdrop-blur-2xl">
        <div
          className={`pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-3xl transition-all duration-700 ${isSurvivor ? 'bg-emerald-500' : 'bg-rose-600'
            }`}
        />

        <div className="relative z-10 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm dark:shadow-lg ${isSurvivor
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}
            >
              <Dices className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-mono uppercase">
                  {role} Perk Randomizer
                </h1>
                <span className="rounded-md bg-slate-100 dark:bg-slate-900 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                  {totalPages} {totalPages === 1 ? 'Page' : 'Pages'} ({totalPlayableCount} Playable)
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {user ? 'Randomizes dynamically from your unlocked & owned perks' : 'Randomizes from all Dead by Daylight perks'} with inventory coordinates [Page / Slot]
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-100/90 dark:border-slate-800 dark:bg-slate-950/90 p-1 shadow-inner">
              <button
                onClick={() => handleRoleChange('Survivor')}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black tracking-wider uppercase transition-all duration-300 cursor-pointer ${isSurvivor
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Survivor</span>
              </button>

              <button
                onClick={() => handleRoleChange('Killer')}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black tracking-wider uppercase transition-all duration-300 cursor-pointer ${!isSurvivor
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-rose-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                <Skull className="h-3.5 w-3.5" />
                <span>Killer</span>
              </button>
            </div>

            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-100/90 dark:border-slate-800 dark:bg-slate-950/90 p-1 shadow-inner">
              <button
                onClick={() => handleGenModeChange('wheel')}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black tracking-wider uppercase transition-all duration-300 cursor-pointer ${genMode === 'wheel'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                <CircleDot className="h-3.5 w-3.5" />
                <span>Wheel</span>
              </button>

              <button
                onClick={() => handleGenModeChange('instant')}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black tracking-wider uppercase transition-all duration-300 cursor-pointer ${genMode === 'instant'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Instant</span>
              </button>
            </div>

            <button
              onClick={() => setIsCharModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 transition-all cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Perks: {dynamicPerksCountValue}</span>
            </button>

            <button
              onClick={handleToggleNoRepeat}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${noRepeatPerks
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : 'border-slate-200 bg-slate-100/90 text-slate-600 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
            >
              <Repeat className={`h-3.5 w-3.5 ${noRepeatPerks ? 'text-amber-600 dark:text-amber-400' : ''}`} />
              <span>No-Repeat</span>
            </button>

            <button
              onClick={handleResetAllLoadoutAndWheels}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer"
              title="Reset wheels, loadout slots, and memory"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset All</span>
            </button>

            <button
              onClick={handleCopyBuild}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/90 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {ownedOrAvailableCount === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-600 dark:text-amber-400 mb-3 animate-bounce" />
          <h3 className="text-lg font-black">No Perks Available for {role}</h3>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 max-w-md">
            All character teachables are currently deactivated or unowned. Please enable characters in the character settings or unlock perks to spin the randomizer.
          </p>
          <button
            onClick={() => setIsCharModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-md hover:bg-amber-700 transition-all cursor-pointer"
          >
            Configure Characters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full items-start">
          <div className="xl:col-span-7 w-full">
            {genMode === 'wheel' && (
              <WheelOfFortune
                totalPages={totalPages}
                perksPerPage={15}
                lastPagePerks={lastPagePerks}
                spinDurationSec={spinDurationSec}
                role={role}
                sortedPerks={activePlayablePerks}
                activeSlotIdx={activeSlotIdx}
                onWinSlot={handleWheelWinSlot}
                dict={dict}
                backendBase={backendBase}
                activeMutator={activeMutator}
                onOpenChaosModal={() => setIsChaosModalOpen(true)}
                onResetWheels={handleResetAllLoadoutAndWheels}
              />
            )}

            {genMode === 'instant' && (
              <div className="flex flex-col items-center justify-center p-12 rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
                <button
                  onClick={rollInstantLoadout}
                  className={`flex items-center gap-3 rounded-2xl px-10 py-5 font-black text-lg tracking-wider uppercase shadow-2xl transition-all duration-300 cursor-pointer ${isSurvivor
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:brightness-110 text-white shadow-emerald-950/80 active:scale-95'
                      : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:brightness-110 text-white shadow-rose-950/80 active:scale-95'
                    }`}
                >
                  <Dices className="h-6 w-6 fill-current animate-spin" />
                  <span>Roll Complete {role} Loadout</span>
                </button>
              </div>
            )}
          </div>

          <div className="xl:col-span-5 w-full">
            <div className="rounded-3xl border border-slate-200/90 bg-white/90 dark:border-slate-800 dark:bg-slate-900/80 p-5 shadow-sm dark:shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-300 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-500" />
                  Active 4-Perk Loadout
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                  Focus: <span className="text-amber-600 dark:text-amber-400 font-black">Slot #{activeSlotIdx + 1}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {loadout.map((slotData, idx) => {
                  const perk = slotData?.perk;
                  const iconSrc = perk?.icon_local_path
                    ? `${backendBase}/static/${perk.icon_local_path.replace(/^\/?(static\/)?/, '')}`
                    : perk?.icon_url;

                  const isSelectedForWheelSlot = genMode === 'wheel' && activeSlotIdx === idx;
                  const isObscuredByBlindness = activeMutator?.id === 'blindness' && !revealedSlots[idx];

                  const getAvatarSrc = (p?: Perk) => {
                    if (!p) return null;
                    let rawPath = p.character_avatar_path;
                    const isGeneral = !p.character || p.character === 'General' || p.is_generic_counterpart;
                    if (!rawPath && p.character && !isGeneral) {
                      const subDir = role === 'Survivor' ? 'survivors' : 'killers';
                      const sanitized = p.character
                        .toLowerCase()
                        .trim()
                        .replace(/[\s\-/]+/g, '_')
                        .replace(/[\\/*?:"<>|]/g, '')
                        .replace(/_+/g, '_')
                        .replace(/^_+|_+$/g, '');
                      rawPath = `avatars/${subDir}/${sanitized}.png`;
                    }
                    if (!rawPath) return null;
                    const cleanPath = rawPath.replace(/^\/?(static\/)?/, '');
                    return `${backendBase}/static/${cleanPath}`;
                  };

                  const avatarSrc = getAvatarSrc(perk);

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (isObscuredByBlindness) {
                          setRevealedSlots((prev) => {
                            const next = [...prev];
                            next[idx] = true;
                            return next;
                          });
                        } else if (perk) {
                          onSelectPerk(perk);
                        }
                      }}
                      className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 shadow-sm dark:shadow-lg backdrop-blur-xl transition-all duration-200 ${isSelectedForWheelSlot
                          ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/50'
                          : 'border-slate-200 bg-slate-50 hover:border-amber-500/50 dark:border-slate-800 dark:bg-slate-950/80 dark:hover:border-amber-500/50'
                        }`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          {slotData ? (
                            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-mono text-[11px] font-black text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              [P{slotData.page}/S{slotData.slot}]
                            </span>
                          ) : (
                            <span className="rounded-md bg-slate-100 dark:bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800">
                              [-/-]
                            </span>
                          )}

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                              Slot #{idx + 1}
                            </span>
                            {slotData && (
                              <button
                                onClick={(e) => handleClearSlot(idx, e)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-500 transition-colors cursor-pointer"
                                title="Clear slot"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200/80 dark:from-slate-900 dark:to-slate-950 p-1.5 border border-slate-200 dark:border-slate-800 shadow-inner group-hover:border-amber-500/60 transition-colors overflow-hidden">
                            {isObscuredByBlindness ? (
                              <div className="flex flex-col items-center justify-center text-purple-600 dark:text-purple-400 animate-pulse">
                                <EyeOff className="h-6 w-6" />
                                <span className="text-[8px] font-black mt-0.5">CURSED</span>
                              </div>
                            ) : perk && iconSrc ? (
                              <img
                                src={iconSrc}
                                alt={perk.name}
                                className="h-13 w-13 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.2)] dark:drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <ImageOff className="h-7 w-7 text-slate-400 dark:text-slate-600" />
                            )}
                          </div>

                          <div className="relative flex items-center">
                            {isObscuredByBlindness ? (
                              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100 border-2 border-purple-500/50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300">
                                <EyeOff className="h-6 w-6" />
                              </div>
                            ) : avatarSrc ? (
                              <img
                                src={avatarSrc}
                                alt={perk?.character || 'Avatar'}
                                className="h-14 w-14 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-md group-hover:border-amber-500/60 transition-colors duration-300"
                              />
                            ) : (
                              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 border-2 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                                {isSurvivor ? (
                                  <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Skull className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                                )}
                              </div>
                            )}

                            <div
                              className={`absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm backdrop-blur-md ${isSurvivor
                                  ? 'border-emerald-500/60 bg-emerald-100 text-emerald-700 ring-2 ring-white dark:bg-emerald-950 dark:text-emerald-400 dark:ring-slate-950'
                                  : 'border-rose-500/60 bg-rose-100 text-rose-700 ring-2 ring-white dark:bg-rose-950 dark:text-rose-400 dark:ring-slate-950'
                                }`}
                              title={role}
                            >
                              {isSurvivor ? <Shield className="h-3.5 w-3.5" /> : <Skull className="h-3.5 w-3.5" />}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-black leading-tight text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                            {isObscuredByBlindness ? '??? (Click to Reveal)' : perk ? perk.name : 'Empty Slot'}
                          </h4>
                          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {perk ? (perk.character || 'General Perk') : 'Spin wheel or roll'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <CharacterConfigModal
        isOpen={isCharModalOpen}
        onClose={() => setIsCharModalOpen(false)}
        role={role}
        characterOptions={characterOptions}
        enabledCharacters={activeEnabledChars}
        onSave={handleSaveEnabledCharacters}
        dict={dict}
      />

      <ChaosWheelModal
        isOpen={isChaosModalOpen}
        onClose={() => setIsChaosModalOpen(false)}
        onSelectMutator={(m) => {
          setActiveMutator(m);
          setIsChaosModalOpen(false);
        }}
        activeMutator={activeMutator}
        dict={dict}
      />
    </div>
  );
};