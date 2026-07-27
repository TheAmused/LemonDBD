'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { Perk } from './PerkCard';
import { WheelOfFortune } from './WheelOfFortune';

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

const STORAGE_KEY = 'lemon_dbd_generator_v2';

export const PerkGenerator: React.FC<PerkGeneratorProps> = ({
  allPerks,
  onSelectPerk,
  dict,
}) => {
  const [role, setRole] = useState<'Survivor' | 'Killer'>('Survivor');
  const [genMode, setGenMode] = useState<'instant' | 'wheel'>('instant');
  const [showConfig, setShowConfig] = useState(false);

  // Config parameters
  const [totalPages, setTotalPages] = useState<number>(12);
  const [perksPerPage, setPerksPerPage] = useState<number>(15);
  const [lastPagePerks, setLastPagePerks] = useState<number>(8);
  const [spinDurationSec, setSpinDurationSec] = useState<number>(3);

  const [loadout, setLoadout] = useState<(DrawnSlot | null)[]>([null, null, null, null]);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Load state from LocalStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role) setRole(parsed.role);
        if (parsed.genMode) setGenMode(parsed.genMode);
        if (parsed.totalPages) setTotalPages(parsed.totalPages);
        if (parsed.perksPerPage) setPerksPerPage(parsed.perksPerPage);
        if (parsed.lastPagePerks) setLastPagePerks(parsed.lastPagePerks);
        if (parsed.spinDurationSec) setSpinDurationSec(parsed.spinDurationSec);
        if (parsed.loadout) setLoadout(parsed.loadout);
        if (typeof parsed.activeSlotIdx === 'number') setActiveSlotIdx(parsed.activeSlotIdx);
      }
    } catch (e) {
      console.error('Failed loading generator state from localStorage:', e);
    }
  }, []);

  // Sync state to LocalStorage
  useEffect(() => {
    try {
      const payload = {
        role,
        genMode,
        totalPages,
        perksPerPage,
        lastPagePerks,
        spinDurationSec,
        loadout,
        activeSlotIdx,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed saving generator state to localStorage:', e);
    }
  }, [role, genMode, totalPages, perksPerPage, lastPagePerks, spinDurationSec, loadout, activeSlotIdx]);

  const getSortedRolePerks = useCallback(() => {
    return allPerks
      .filter((p) => p.category === role)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allPerks, role]);

  const handleResetDefaults = () => {
    setTotalPages(12);
    setPerksPerPage(15);
    setLastPagePerks(8);
    setSpinDurationSec(3);
  };

  const getRandomSlot = useCallback(() => {
    const page = Math.floor(Math.random() * totalPages) + 1;
    const maxSlots = page === totalPages ? lastPagePerks : perksPerPage;
    const slot = Math.floor(Math.random() * maxSlots) + 1;
    return { page, slot };
  }, [totalPages, perksPerPage, lastPagePerks]);

  const rollInstantLoadout = useCallback(() => {
    const sortedPerks = getSortedRolePerks();
    const drawnSlots: DrawnSlot[] = [];
    const usedCoordinates = new Set<string>();

    let attempts = 0;
    while (drawnSlots.length < 4 && attempts < 200) {
      attempts++;
      const { page, slot } = getRandomSlot();
      const coordKey = `${page}/${slot}`;

      if (!usedCoordinates.has(coordKey)) {
        usedCoordinates.add(coordKey);
        const index = (page - 1) * perksPerPage + (slot - 1);
        const perk =
          sortedPerks[index] ||
          sortedPerks[index % Math.max(1, sortedPerks.length)];

        drawnSlots.push({ page, slot, perk });
      }
    }

    setLoadout(drawnSlots);
  }, [getSortedRolePerks, getRandomSlot, perksPerPage]);

  const handleWheelWinSlot = (wonData: DrawnSlot) => {
    setLoadout((prev) => {
      const next = [...prev];
      next[activeSlotIdx] = wonData;
      return next;
    });
    setActiveSlotIdx((prev) => (prev + 1) % 4);
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

  return (
    <div className="space-y-6">
      {/* Control Banner */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Dices className="h-6 w-6 text-amber-500 animate-bounce" />
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {dict.generator.title}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {dict.generator.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-950">
              <button
                onClick={() => setGenMode('instant')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  genMode === 'instant'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{dict.generator.modeInstant}</span>
              </button>
              <button
                onClick={() => setGenMode('wheel')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  genMode === 'wheel'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <CircleDot className="h-3.5 w-3.5" />
                <span>{dict.generator.modeWheel}</span>
              </button>
            </div>

            <div className="flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-950">
              <button
                onClick={() => {
                  setRole('Survivor');
                  setLoadout([null, null, null, null]);
                }}
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
                onClick={() => {
                  setRole('Killer');
                  setLoadout([null, null, null, null]);
                }}
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

            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Config</span>
            </button>

            <button
              onClick={handleCopyBuild}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500">{dict.generator.buildCopied}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{dict.generator.copyBuild}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Config Drawer */}
        {showConfig && (
          <div className="mt-4 border-t border-slate-200/80 pt-4 dark:border-slate-800/80 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {dict.generator.configTitle}
              </h4>
              <button
                onClick={handleResetDefaults}
                className="flex items-center gap-1 text-[11px] font-semibold text-amber-500 hover:underline cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>{dict.generator.resetDefaults}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {dict.generator.totalPages} (Pages)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={totalPages}
                  onChange={(e) => setTotalPages(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {dict.generator.perksPerPage} (Standard)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={perksPerPage}
                  onChange={(e) => setPerksPerPage(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {dict.generator.lastPagePerks} (Last Page)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={lastPagePerks}
                  onChange={(e) => setLastPagePerks(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {dict.generator.spinDuration}
                </label>
                <input
                  type="number"
                  step={0.5}
                  min={1}
                  max={15}
                  value={spinDurationSec}
                  onChange={(e) => setSpinDurationSec(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wheel Section */}
      {genMode === 'wheel' && (
        <WheelOfFortune
          totalPages={totalPages}
          perksPerPage={perksPerPage}
          lastPagePerks={lastPagePerks}
          spinDurationSec={spinDurationSec}
          role={role}
          sortedPerks={getSortedRolePerks()}
          activeSlotIdx={activeSlotIdx}
          onWinSlot={handleWheelWinSlot}
          dict={dict}
          backendBase={backendBase}
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
            <span>{dict.generator.rollButton}</span>
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

          return (
            <div
              key={idx}
              onClick={() => perk && onSelectPerk(perk)}
              className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-5 shadow-sm backdrop-blur-md transition-all duration-200 ${
                isSelectedForWheelSlot
                  ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/40'
                  : 'border-slate-200/80 bg-white/70 dark:border-slate-800/80 dark:bg-slate-900/60 hover:-translate-y-1 hover:border-amber-500/50'
              }`}
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  {slotData ? (
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] font-extrabold text-amber-600 border border-amber-500/20 dark:text-amber-400">
                      [{slotData.page}/{slotData.slot}]
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-400 dark:bg-slate-800">
                      [-/-]
                    </span>
                  )}
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">
                    Perk #{idx + 1}
                  </span>
                </div>

                <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/50 p-3 dark:from-slate-900/90 dark:to-slate-950 border border-slate-200/60 dark:border-slate-800 shadow-inner group-hover:border-amber-500/40 transition-colors">
                  {perk && iconSrc ? (
                    <img
                      src={iconSrc}
                      alt={perk.name}
                      className="h-14 w-14 object-contain drop-shadow-md group-hover:scale-110 transition-transform"
                    />
                  ) : (
                    <ImageOff className="h-8 w-8 text-slate-400" />
                  )}
                </div>

                <h3 className="text-center text-base font-bold text-slate-900 group-hover:text-amber-500 dark:text-slate-100 transition-colors">
                  {perk ? perk.name : 'Spin Wheel or Roll'}
                </h3>

                <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>{perk ? perk.character : 'General'}</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-500 group-hover:text-amber-500 transition-colors">
                <span>{dict.card.viewDetails}</span>
                <Sparkles className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};