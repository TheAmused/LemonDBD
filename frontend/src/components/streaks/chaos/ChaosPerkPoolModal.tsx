'use client';
// frontend/src/components/streaks/chaos/ChaosPerkPoolModal.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { X, Layers, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { Perk } from '@/types/gauntletStreak';
import { perkIconUrl as perkIconFor } from '@/utils/staticUrl';
import { usePerkDisplayName } from '@/context/DisplayNamesContext';

const PerkTile: React.FC<{ perk: Perk; displayName: string }> = ({ perk, displayName }) => {
  const [failed, setFailed] = useState<boolean>(false);
  const src = perkIconFor(perk);
  return (
    <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-bg-elevated border border-border-color">
      <div className="w-full aspect-square rounded-md overflow-hidden bg-bg-primary flex items-center justify-center">
        {src && !failed ? (
          <img
            src={src}
            alt={displayName}
            className="w-full h-full object-contain p-1.5"
            onError={() => setFailed(true)}
          />
        ) : (
          <Sparkles className="w-6 h-6 text-text-muted" aria-hidden="true" />
        )}
      </div>
      <span className="text-[11px] font-medium text-center text-text-secondary leading-tight line-clamp-2">
        {displayName}
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
  const displayName = usePerkDisplayName();
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="chaos-perk-pool-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/70 backdrop-blur-md cursor-pointer select-none"
    >
      <div
        className="relative w-full max-w-6xl bg-bg-surface border border-border-color rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border-color bg-bg-elevated/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-bg-elevated border border-border-color rounded-xl text-text-secondary" aria-hidden="true">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 id="chaos-perk-pool-title" className="text-lg font-black text-text-primary tracking-tight">
                {dict?.streaks?.perkPool || 'Perk Pool'}
              </h2>
              <p className="text-xs text-text-secondary">
                {used.length} {dict?.streaks?.usedLabel || 'used'} {dict?.streaks?.middotSeparator || '·'}{' '}
                {remaining.length}{' '}
                {dict?.streaks?.leftThisCycle || 'left this cycle'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={dict?.modal?.close || 'Close perk pool modal'}
            className="p-2 text-text-muted hover:text-text-primary bg-bg-elevated hover:bg-bg-elevated/70 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 pt-4" role="tablist" aria-label={dict?.streaks?.perkPoolTabs || 'Perk pool view tabs'}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'used'}
            onClick={() => setTab('used')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              tab === 'used'
                ? 'bg-accent-green/15 text-accent-green border-accent-green/40'
                : 'bg-bg-elevated text-text-secondary border-border-color hover:text-text-primary'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{dict?.streaks?.usedTab || 'Used'} ({used.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'remaining'}
            onClick={() => setTab('remaining')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              tab === 'remaining'
                ? 'bg-accent-red/15 text-accent-red border-accent-red/40'
                : 'bg-bg-elevated text-text-secondary border-border-color hover:text-text-primary'
            }`}
          >
            <Circle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{dict?.streaks?.remainingTab || 'Remaining'} ({remaining.length})</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {shown.length === 0 ? (
            <p className="text-xs text-text-muted">
              {tab === 'used'
                ? dict?.streaks?.noPerksDrawnYet || 'No perks drawn yet this cycle.'
                : dict?.streaks?.perkPoolEmptyFreshCycle || 'The pool is empty; the next draw starts a fresh cycle.'}
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2" role="list">
              {shown.map((perk) => (
                <PerkTile key={perk.id ?? perk.name} perk={perk} displayName={displayName(perk.name)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

