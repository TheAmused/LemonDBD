import type { Dictionary } from '@/locales/types';
// frontend/src/components/streaks/gauntlet/CheckpointModal.tsx
'use client';

import React, { useEffect } from 'react';
import { ShieldCheck, PartyPopper } from 'lucide-react';
import { Role, TierInfo } from '@/types/gauntletStreak';

export interface CheckpointModalProps {
  checkpoint: number | null;
  role: Role;
  nextTier: TierInfo | null;
  onClose: () => void;
  dict?: Dictionary;
}

export const CheckpointModal: React.FC<CheckpointModalProps> = ({ checkpoint, role, nextTier, onClose, dict }) => {
  useEffect(() => {
    if (checkpoint == null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [checkpoint, onClose]);

  if (checkpoint == null) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-950 p-8 text-center shadow-2xl shadow-amber-500/20 cursor-default gn-land-frame"
      >
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-amber-400 bg-amber-500/15 text-amber-400 gn-land-glow">
          <ShieldCheck className="h-10 w-10" />
        </div>
        <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-400">
          <PartyPopper className="h-3.5 w-3.5" />
          {dict?.streaks?.checkpointBanked || 'Checkpoint banked'}
        </div>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
          {checkpoint} {dict?.streaks?.winsSuffix || 'wins'}
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          {dict?.streaks?.checkpointLoseFallback || 'Lose from here and you fall back to'} <strong className="text-amber-300">{checkpoint}</strong>{dict?.streaks?.notToZero || ', not to zero.'}
        </p>
        {nextTier && (
          <p className="mt-4 text-xs text-slate-400">
            {dict?.streaks?.nextUpLabel || 'Next up:'} <strong className="text-slate-200">{nextTier.name}</strong>
            {nextTier.perk_limit > 0
              ? `, ${nextTier.perk_limit} perk${nextTier.perk_limit > 1 ? 's' : ''} allowed`
              : ', no perks allowed'}
            .
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-amber-500 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400 cursor-pointer"
        >
          {dict?.streaks?.keepGoing || 'Keep going'}
        </button>
      </div>
    </div>
  );
};