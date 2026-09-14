'use client';
// frontend/src/components/streaks/gauntlet/CheckpointModal.tsx

import React, { useEffect } from 'react';
import { ShieldCheck, PartyPopper } from 'lucide-react';
import type { Role, TierInfo } from '@/types/gauntletStreak';
import type { Dictionary } from '@/locales/types';

export interface CheckpointModalProps {
  checkpoint: number | null;
  role: Role;
  nextTier: TierInfo | null;
  onClose: () => void;
  dict?: Dictionary;
}

export const CheckpointModal: React.FC<CheckpointModalProps> = ({
  checkpoint,
  role: _role,
  nextTier,
  onClose,
  dict,
}) => {
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkpoint-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-md cursor-pointer select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border-2 border-accent-green bg-bg-surface p-8 text-center shadow-2xl cursor-default gn-land-frame"
      >
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-accent-green bg-accent-green/15 text-accent-green gn-land-glow" aria-hidden="true">
          <ShieldCheck className="h-10 w-10" />
        </div>
        <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-accent-green">
          <PartyPopper className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{dict?.streaks?.checkpointBanked || 'Checkpoint banked'}</span>
        </div>
        <h2 id="checkpoint-modal-title" className="mt-2 text-3xl font-black tracking-tight text-text-primary font-mono">
          {checkpoint} {dict?.streaks?.winsSuffix || 'wins'}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {dict?.streaks?.checkpointLoseFallback || 'Lose from here and you fall back to'}{' '}
          <strong className="text-accent-green font-mono">{checkpoint}</strong>
          {dict?.streaks?.notToZero || ', not to zero.'}
        </p>
        {nextTier && (
          <p className="mt-4 text-xs text-text-muted">
            {dict?.streaks?.nextUpLabel || 'Next up:'}{' '}
            <strong className="text-text-primary">{nextTier.name}</strong>
            {nextTier.perk_limit > 0
              ? `, ${nextTier.perk_limit} ${nextTier.perk_limit > 1 ? (dict?.streaks?.perksAllowedPlural || 'perks allowed') : (dict?.streaks?.perksAllowedSingular || 'perk allowed')}`
              : (dict?.streaks?.noPerksAllowed || ', no perks allowed')}
            .
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-accent-green py-3 text-sm font-extrabold text-text-inverted shadow-lg transition-all hover:bg-accent-green-hover cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green"
        >
          {dict?.streaks?.keepGoing || 'Keep going'}
        </button>
      </div>
    </div>
  );
};

