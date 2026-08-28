import type { Dictionary } from '@/locales/types';
// frontend/src/components/streaks/chaos/ChaosPerkPoolModal.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Layers, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { Perk } from '@/types/gauntletStreak';
import { perkIconUrl as perkIconFor } from '@/utils/staticUrl';

const PerkTile: React.FC<{ perk: Perk }> = ({ perk }) => {
  const [failed, setFailed] = useState(false);
  const src = perkIconFor(perk);
  return (
    <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
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

export interface ChaosPerkPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  pool: Perk[];
  usedPerkNames: string[];
  dict?: Dictionary;
}

export const ChaosPerkPoolModal: React.FC<ChaosPerkPoolModalProps> = ({
  isOpen,
  onClose,
  pool,
  usedPerkNames,
  dict,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [tab, setTab] = useState<'used' | 'remaining'>('used');

  const usedSet = useMemo(() => new Set(usedPerkNames), [usedPerkNames]);
  const used = useMemo(() => pool.filter((p) => usedSet.has(p.name)), [pool, usedSet]);
  const remaining = useMemo(() => pool.filter((p) => !usedSet.has(p.name)), [pool, usedSet]);
  const shown = tab === 'used' ? used : remaining;

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-md cursor-pointer"
    >
      <div
        className="relative w-full max-w-6xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-600 dark:text-violet-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {dict?.streaks?.perkPool || 'Perk Pool'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {used.length} {dict?.streaks?.usedLabel || 'used'} {dict?.streaks?.middotSeparator || '·'}{' '}
                {remaining.length}{' '}
                {dict?.streaks?.leftThisCycle || 'left this cycle'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 pt-4">
          <button
            onClick={() => setTab('used')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              tab === 'used'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {dict?.streaks?.usedTab || 'Used'} ({used.length})
          </button>
          <button
            onClick={() => setTab('remaining')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              tab === 'remaining'
                ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/40'
                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Circle className="w-3.5 h-3.5" />
            {dict?.streaks?.remainingTab || 'Remaining'} ({remaining.length})
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {shown.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {tab === 'used'
                ? 'No perks drawn yet this cycle.'
                : 'The pool is empty; the next draw starts a fresh cycle.'}
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {shown.map((perk) => (
                <PerkTile key={perk.id ?? perk.name} perk={perk} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
