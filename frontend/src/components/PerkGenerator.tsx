'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dices,
  Shield,
  Skull,
  Copy,
  Check,
  Sparkles,
  User,
  ImageOff,
  Settings2,
  RotateCcw,
  CircleDot,
  Repeat,
  Layers,
  Users,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { Perk } from './PerkCard';
import { WheelOfFortune, EXHAUSTION_PERK_NAMES } from './WheelOfFortune';
import { ChaosWheelModal, ChaosMutator } from './ChaosWheelModal';
import { CharacterConfigModal } from './CharacterConfigModal';
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

const STORAGE_KEY = 'lemon_dbd_generator_v3';

export const PerkGenerator: React.FC<PerkGeneratorProps> = ({
  allPerks,
  onSelectPerk,
  dict,
}) => {
  const [role, setRole] = useState<'Survivor' | 'Killer'>('Survivor');
  const [genMode, setGenMode] = useState<'instant' | 'wheel'>('instant');
  const [noRepeatPerks, setNoRepeatPerks] = useState<boolean>(true);
  const [spinDurationSec, setSpinDurationSec] = useState<number>(3);

  const [drawnPerks, setDrawnPerks] = useState<string[]>([]);
  const [loadout, setLoadout] = useState<(DrawnSlot | null)[]>([null, null, null, null]);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);
  const [isChaosModalOpen, setIsChaosModalOpen] = useState(false);
  const [activeMutator, setActiveMutator] = useState<ChaosMutator | null>(null);
  const [copied, setCopied] = useState(false);

  // Character Configuration State
  const [isCharModalOpen, setIsCharModalOpen] = useState(false);
  const [enabledSurvCharacters, setEnabledSurvCharacters] = useState<string[]>([]);
  const [enabledKillerCharacters, setEnabledKillerCharacters] = useState<string[]>([]);
  const [revealedSlots, setRevealedSlots] = useState<boolean[]>([false, false, false, false]);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Available Characters List by Role
  const characterOptions = useMemo(() => {
    const rolePerks = allPerks.filter((p) => p.category === role);
    const namesSet = new Set<string>();
    rolePerks.forEach((p) => {
      if (p.character && p.character !== 'General') {
        namesSet.add(p.character);
      }
    });
    return Array.from(namesSet)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }, [allPerks, role]);

  // Load state from LocalStorage on mount
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

      const savedSurv = localStorage.getItem('lemon_dbd_enabled_survs');
      if (savedSurv) setEnabledSurvCharacters(JSON.parse(savedSurv));

      const savedKillers = localStorage.getItem('lemon_dbd_enabled_killers');
      if (savedKillers) setEnabledKillerCharacters(JSON.parse(savedKillers));
    } catch (e) {
      console.error('Failed loading generator state from localStorage:', e);
    }
  }, []);

  // Initialize all characters enabled if empty
  useEffect(() => {
    if (characterOptions.length === 0) return;
    const allCharNames = ['General', ...characterOptions.map((c) => c.value)];

    if (role === 'Survivor' && enabledSurvCharacters.length === 0) {
      setEnabledSurvCharacters(allCharNames);
    } else if (role === 'Killer' && enabledKillerCharacters.length === 0) {
      setEnabledKillerCharacters(allCharNames);
    }
  }, [characterOptions, role, enabledSurvCharacters.length, enabledKillerCharacters.length]);

  // Fetch generator config from SQLite on mount
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

  // Fetch drawn perks from SQLite API whenever role changes or on mount
  useEffect(() => {
    fetchDrawnPerks(role)
      .then((perks) => {
        setDrawnPerks(perks);
      })
      .catch((e) => {
        console.error('Failed fetching drawn perks from SQLite API:', e);
      });
  }, [role]);

  // Sync state to LocalStorage
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

  // Get active enabled characters list for current role
  const activeEnabledChars = useMemo(() => {
    return role === 'Survivor' ? enabledSurvCharacters : enabledKillerCharacters;
  }, [role, enabledSurvCharacters, enabledKillerCharacters]);

  const handleSaveEnabledCharacters = (newEnabled: string[]) => {
    if (role === 'Survivor') {
      setEnabledSurvCharacters(newEnabled);
      localStorage.setItem('lemon_dbd_enabled_survs', JSON.stringify(newEnabled));
    } else {
      setEnabledKillerCharacters(newEnabled);
      localStorage.setItem('lemon_dbd_enabled_killers', JSON.stringify(newEnabled));
    }
  };

  // Dynamically Filter and Sort Perks [A-Z] based on Enabled Characters Pool
  const getSortedRolePerks = useCallback(() => {
    const rolePerks = allPerks.filter((p) => p.category === role);
    const enabledSet = new Set(activeEnabledChars);

    const filtered = rolePerks.filter((p) => {
      const charName = p.character || 'General';
      return enabledSet.has(charName);
    });

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [allPerks, role, activeEnabledChars]);

  const sortedRolePerks = getSortedRolePerks();
  const totalRolePerks = sortedRolePerks.length;

  // Dynamic Wheel Parameters at 15 Perks per Page [A-Z]
  const perksPerPage = 15;
  const totalPages = Math.max(1, Math.ceil(totalRolePerks / 15));
  const lastPagePerks = totalRolePerks % 15 || (totalRolePerks > 0 ? 15 : 0);

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

  const rollInstantLoadout = useCallback(async () => {
    const sortedPerks = getSortedRolePerks();
    if (sortedPerks.length === 0) return;

    let availablePerks = noRepeatPerks
      ? sortedPerks.filter((p) => !drawnPerks.includes(p.name))
      : sortedPerks;

    if (activeMutator?.id === 'no_exhaustion') {
      availablePerks = availablePerks.filter((p) => {
        const nameLower = p.name.toLowerCase().trim();
        const descLower = (p.description || '').toLowerCase();
        return (
          !EXHAUSTION_PERK_NAMES.has(nameLower) &&
          !descLower.includes('exhausted') &&
          !descLower.includes('exhaustion')
        );
      });
    }

    if (availablePerks.length === 0) {
      availablePerks = sortedPerks;
    }

    const drawnSlots: DrawnSlot[] = [];
    const pool = [...availablePerks];
    const needed = Math.min(4, pool.length);

    for (let i = 0; i < needed; i++) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      const chosenPerk = pool.splice(randomIndex, 1)[0];

      const indexInSorted = sortedPerks.findIndex((p) => p.name === chosenPerk.name);
      const page = Math.floor(indexInSorted / 15) + 1;
      const slot = (indexInSorted % 15) + 1;

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
  }, [getSortedRolePerks, noRepeatPerks, drawnPerks, role, activeMutator]);

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

  const handleResetDrawnPerks = async () => {
    try {
      const updatedDrawn = await resetDrawnPerks(role);
      setDrawnPerks(updatedDrawn);
    } catch (err) {
      console.error('Failed resetting drawn perks in SQLite API:', err);
      setDrawnPerks([]);
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

  const drawnCount = drawnPerks.filter((name) =>
    sortedRolePerks.some((p) => p.name === name)
  ).length;

  return (
    <div className="space-y-6">
      {/* Control Banner */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Dices className="h-6 w-6 text-amber-500 animate-bounce" />
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {dict?.generator?.title || 'Perk Loadout Generator'}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {dict?.generator?.subtitle || 'Roll random perks based on in-game inventory coordinates [Page/Slot].'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mode Selector */}
            <div className="flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-950">
              <button
                onClick={() => handleGenModeChange('instant')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  genMode === 'instant'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{dict?.generator?.modeInstant || 'Instant Roll'}</span>
              </button>
              <button
                onClick={() => handleGenModeChange('wheel')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  genMode === 'wheel'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <CircleDot className="h-3.5 w-3.5" />
                <span>{dict?.generator?.modeWheel || 'Wheel of Fortune'}</span>
              </button>
            </div>

            {/* Role Selector */}
            <div className="flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-950">
              <button
                onClick={() => handleRoleChange('Survivor')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  role === 'Survivor'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Survivor</span>
              </button>
              <button
                onClick={() => handleRoleChange('Killer')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  role === 'Killer'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Skull className="h-3.5 w-3.5" />
                <span>Killer</span>
              </button>
            </div>

            {/* Configure Characters Modal Button */}
            <button
              onClick={() => setIsCharModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/50 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer shadow-sm"
            >
              <Users className="h-3.5 w-3.5 text-cyan-400" />
              <span>Configure Characters ({activeEnabledChars.length})</span>
            </button>

            {/* No-Repeat Perks Toggle */}
            <button
              onClick={handleToggleNoRepeat}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                noRepeatPerks
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'border-slate-200 bg-slate-100/80 text-slate-500 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:hover:text-slate-200'
              }`}
            >
              <Repeat className={`h-3.5 w-3.5 ${noRepeatPerks ? 'text-amber-500' : ''}`} />
              <span>{dict.generator?.noRepeat || 'No-Repeat Perks'}</span>
              <span
                className={`ml-1 inline-block h-2 w-2 rounded-full ${
                  noRepeatPerks ? 'bg-amber-500' : 'bg-slate-400'
                }`}
              />
            </button>

            {/* Chaos Wheel Modal Button */}
            <button
              onClick={() => setIsChaosModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-purple-500/50 bg-purple-500/10 px-3 py-2 text-xs font-bold text-purple-400 hover:bg-purple-500/20 transition-all cursor-pointer shadow-sm"
            >
              <Skull className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
              <span>{activeMutator ? `Curse: ${activeMutator.name}` : 'Chaos Wheel'}</span>
            </button>

            {/* Reset Loadout & Wheels Button */}
            <button
              onClick={handleResetAllLoadoutAndWheels}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer shadow-sm"
              title="Reset wheels, clear active loadout slots, and reset slot focus"
            >
              <RotateCcw className="h-3.5 w-3.5 text-rose-400" />
              <span>Reset Loadout & Wheels</span>
            </button>

            {/* Copy Build Button */}
            <button
              onClick={handleCopyBuild}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500">{dict?.generator?.buildCopied || 'Loadout Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{dict?.generator?.copyBuild || 'Copy Loadout Text'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status & Pool Reset Toolbar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            {/* Drawn Badge */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 px-3 py-1.5 text-xs font-extrabold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <Layers className="h-3.5 w-3.5 text-amber-500" />
              <span>
                {dict?.generator?.drawnBadge
                  ? dict.generator.drawnBadge
                      .replace('{drawn}', drawnCount.toString())
                      .replace('{total}', totalRolePerks.toString())
                  : `Drawn: ${drawnCount} / ${totalRolePerks} Perks (${totalPages} Pages)`}
              </span>
            </div>
          </div>

          {/* Reset Used Perks Button */}
          <button
            onClick={handleResetDrawnPerks}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-1.5 text-xs font-extrabold text-rose-600 hover:bg-rose-500/20 active:scale-95 dark:text-rose-400 transition-all cursor-pointer"
            title="Clear all used perks for this role in SQLite"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{dict?.generator?.resetDrawn || 'Reset Used Perks'}</span>
          </button>
        </div>
      </div>

      {/* Wheel Section */}
      {genMode === 'wheel' && (
        <WheelOfFortune
          totalPages={totalPages}
          perksPerPage={15}
          lastPagePerks={lastPagePerks}
          spinDurationSec={spinDurationSec}
          role={role}
          sortedPerks={sortedRolePerks}
          activeSlotIdx={activeSlotIdx}
          onWinSlot={handleWheelWinSlot}
          dict={dict}
          backendBase={backendBase}
          activeMutator={activeMutator}
          onOpenChaosModal={() => setIsChaosModalOpen(true)}
          onResetWheels={handleResetAllLoadoutAndWheels}
        />
      )}

      {/* Instant Roll Action Bar */}
      {genMode === 'instant' && (
        <div className="flex justify-center">
          <button
            onClick={rollInstantLoadout}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-amber-900/30 hover:from-amber-400 hover:to-amber-500 active:scale-95 transition-all cursor-pointer"
          >
            <Dices className="h-5 w-5" />
            <span>{dict?.generator?.rollButton || 'Roll New Loadout'}</span>
          </button>
        </div>
      )}

      {/* 4-Perk Build Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {loadout.map((slotData, idx) => {
          const perk = slotData?.perk;
          const iconSrc = perk?.icon_local_path
            ? `${backendBase}/static/${perk.icon_local_path}`
            : perk?.icon_url;

          const isSelectedForWheelSlot = genMode === 'wheel' && activeSlotIdx === idx;
          const isObscuredByBlindness = activeMutator?.id === 'blindness' && !revealedSlots[idx];

          const getAvatarSrc = (p?: Perk) => {
            if (!p) return null;
            let rawPath = p.character_avatar_path;
            if (!rawPath && p.character && p.character !== 'General') {
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
              className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-5 shadow-sm backdrop-blur-md transition-all duration-200 ${
                isSelectedForWheelSlot
                  ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/40'
                  : 'border-slate-200/80 bg-white/70 dark:border-slate-800/80 dark:bg-slate-900/80 hover:-translate-y-1 hover:border-amber-500/50'
              }`}
            >
              <div className="flex flex-col gap-4">
                {/* Header Slot Info & Role Badge */}
                <div className="flex items-center justify-between">
                  {slotData ? (
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] font-extrabold text-amber-600 border border-amber-500/20 dark:text-amber-400">
                      [{slotData.page}/{slotData.slot}]
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-400 dark:bg-slate-800">
                      [-/-]
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Slot #{idx + 1}
                    </span>
                    {slotData && (
                      <button
                        onClick={(e) => handleClearSlot(idx, e)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Clear this perk slot"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Perk Icon & Bigger Avatar Row */}
                <div className="flex items-center justify-between">
                  {/* Left: MASSIVE Perk Icon Container */}
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/60 p-2 dark:from-slate-900 dark:to-slate-950 border border-slate-200/80 dark:border-slate-800 shadow-inner group-hover:border-amber-500/50 transition-colors overflow-hidden">
                    {isObscuredByBlindness ? (
                      <div className="flex flex-col items-center justify-center text-purple-400 animate-pulse">
                        <EyeOff className="h-8 w-8" />
                        <span className="text-[9px] font-extrabold mt-1">CURSED</span>
                      </div>
                    ) : perk && iconSrc ? (
                      <img
                        src={iconSrc}
                        alt={perk.name}
                        className="h-16 w-16 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <ImageOff className="h-8 w-8 text-slate-400" />
                    )}
                  </div>

                  {/* Right: BIGGER Character Avatar + Top Right Role Icon Badge */}
                  <div className="relative flex items-center">
                    {isObscuredByBlindness ? (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-950/80 border-2 border-purple-500/50 text-purple-300">
                        <EyeOff className="h-7 w-7" />
                      </div>
                    ) : avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt={perk?.character || 'Avatar'}
                        className="h-16 w-16 rounded-2xl object-cover border-2 border-slate-700 shadow-lg group-hover:border-amber-500/60 transition-colors duration-300"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 border-2 border-slate-700 text-slate-400">
                        {role === 'Survivor' ? <Shield className="h-8 w-8 text-emerald-400" /> : <Skull className="h-8 w-8 text-rose-400" />}
                      </div>
                    )}

                    {/* Top-Right Role Icon Badge */}
                    <div
                      className={`absolute -top-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border shadow-lg backdrop-blur-md ${
                        role === 'Survivor'
                          ? 'border-emerald-500/60 bg-emerald-950 text-emerald-400 ring-2 ring-slate-950'
                          : 'border-rose-500/60 bg-rose-950 text-rose-400 ring-2 ring-slate-950'
                      }`}
                      title={role}
                    >
                      {role === 'Survivor' ? <Shield className="h-4 w-4" /> : <Skull className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {/* Hero Perk Title */}
                <h3 className="text-lg font-black leading-tight text-slate-900 group-hover:text-amber-500 dark:text-slate-100 transition-colors">
                  {isObscuredByBlindness ? '??? (Click to Reveal)' : perk ? perk.name : 'Spin Wheel or Roll'}
                </h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Character Configuration Modal */}
      <CharacterConfigModal
        isOpen={isCharModalOpen}
        onClose={() => setIsCharModalOpen(false)}
        role={role}
        characterOptions={characterOptions}
        enabledCharacters={activeEnabledChars}
        onSave={handleSaveEnabledCharacters}
        dict={dict}
      />

      {/* Chaos Curse Wheel Modal */}
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