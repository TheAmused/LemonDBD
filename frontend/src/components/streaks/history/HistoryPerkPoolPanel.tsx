// frontend/src/components/streaks/history/HistoryPerkPoolPanel.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Layers, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { Perk } from '@/types/gauntletStreak';
import { perkIconUrl as perkIconFor } from '@/utils/staticUrl';

const UnlockedTile: React.FC<{ perk: Perk; justUnlocked: boolean }> = ({ perk, justUnlocked }) => {
  const [failed, setFailed] = useState(false);
  const src = perkIconFor(perk);
  return (
    <div
      className={`flex flex-col items-center gap-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300/60 dark:border-emerald-800/60 ${
        justUnlocked ? 'chaos-badge-pop' : ''
      }`}
    >
      <div className="w-full aspect-square rounded-md overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        {src && !failed ? (
          <img
            src={src}
            alt={perk.name}
            className="w-full h-full object-contain p-1.5"
            onError={() => setFailed(true)}
          />
        ) : (
          <Sparkles className="w-6 h-6 text-slate-400" />
        )}
      </div>
      <span className="text-[11px] font-medium text-center text-slate-700 dark:text-slate-200 leading-tight line-clamp-2">
        {perk.name}
      </span>
    </div>
  );
};

const LockedTile: React.FC<{ perk: Perk }> = ({ perk }) => {
  const [failed, setFailed] = useState(false);
  const src = perkIconFor(perk);
  return (
    <div className="relative flex flex-col items-center gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-dashed border-2 border-slate-400/60 dark:border-slate-700 overflow-hidden">
      <div className="w-full aspect-square rounded-md overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center grayscale opacity-40">
        {src && !failed ? (
          <img
            src={src}
            alt={perk.name}
            className="w-full h-full object-contain p-1.5"
            onError={() => setFailed(true)}
          />
        ) : (
          <Sparkles className="w-6 h-6 text-slate-400" />
        )}
      </div>
      <span className="text-[11px] font-medium text-center text-slate-500 dark:text-slate-500 leading-tight line-clamp-2 opacity-60">
        {perk.name}
      </span>
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/25 dark:bg-slate-950/45">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800/90 border border-slate-500/60 shadow-md">
          <Lock className="w-3.5 h-3.5 text-slate-300" />
        </div>
      </div>
    </div>
  );
};

export interface HistoryPerkPoolPanelProps {
  pool: Perk[];
  unlockedPerkNames: string[];
  dict?: any;
}

export const HistoryPerkPoolPanel: React.FC<HistoryPerkPoolPanelProps> = ({ pool, unlockedPerkNames, dict }) => {
  const unlockedSet = useMemo(() => new Set(unlockedPerkNames), [unlockedPerkNames]);
  const unlocked = useMemo(() => pool.filter((p) => unlockedSet.has(p.name)), [pool, unlockedSet]);
  const locked = useMemo(() => pool.filter((p) => !unlockedSet.has(p.name)), [pool, unlockedSet]);

  const seenUnlockedRef = useRef<Set<string>>(new Set());
  const [justUnlockedNames, setJustUnlockedNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    const seen = seenUnlockedRef.current;
    const freshlyUnlocked = new Set<string>();
    for (const name of unlockedPerkNames) {
      if (!seen.has(name)) freshlyUnlocked.add(name);
    }
    if (seen.size > 0 && freshlyUnlocked.size > 0) {
      setJustUnlockedNames(freshlyUnlocked);
      const timer = setTimeout(() => setJustUnlockedNames(new Set()), 1200);
      unlockedPerkNames.forEach((name) => seen.add(name));
      return () => clearTimeout(timer);
    }
    unlockedPerkNames.forEach((name) => seen.add(name));
  }, [unlockedPerkNames]);

  return (
    <div className="mt-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/85 backdrop-blur-sm p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 bg-slate-500/10 border border-slate-500/20 rounded-xl text-slate-600 dark:text-slate-400">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {dict?.streaks?.perkPool || 'Perk pool'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {unlocked.length} {dict?.streaks?.unlockedSuffix || 'unlocked'}{' '}
            {dict?.streaks?.middotSeparator || '·'} {locked.length}{' '}
            {dict?.streaks?.lockedSuffix || 'locked'}
          </p>
        </div>
      </div>

      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {dict?.streaks?.availableLabel || 'Available'} ({unlocked.length})
      </div>
      {unlocked.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">
          {dict?.streaks?.noPerksUnlockedYet || 'No perks unlocked yet.'}
        </p>
      ) : (
        <div className="mb-5 grid grid-cols-3 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-[repeat(15,minmax(0,1fr))] gap-2">
          {unlocked.map((perk) => (
            <UnlockedTile key={perk.id ?? perk.name} perk={perk} justUnlocked={justUnlockedNames.has(perk.name)} />
          ))}
        </div>
      )}

      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
        <Lock className="w-3.5 h-3.5" />
        {dict?.streaks?.lockedLabel || 'Locked'} ({locked.length})
      </div>
      {locked.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {dict?.streaks?.everyPerkUnlocked || 'Every perk is unlocked.'}
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-[repeat(15,minmax(0,1fr))] gap-2">
          {locked.map((perk) => (
            <LockedTile key={perk.id ?? perk.name} perk={perk} />
          ))}
        </div>
      )}
    </div>
  );
};
