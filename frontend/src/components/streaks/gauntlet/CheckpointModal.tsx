'use client';
// frontend/src/components/streaks/gauntlet/CheckpointModal.tsx

import React, { useEffect } from 'react';
import { ShieldCheck, PartyPopper } from 'lucide-react';
import type { Role } from '@/types/gauntletStreak';
import type { Dictionary } from '@/locales/types';

export interface CheckpointModalProps {
  checkpoint: number | null;
  role: Role;
  onClose: () => void;
  dict?: Dictionary;
}

export const CheckpointModal: React.FC<CheckpointModalProps> = ({
  checkpoint,
  role: _role,
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
          <span>{dict?.streaks?.checkpointBanked || 'Checkpoint reached'}</span>
        </div>
        <h2 id="checkpoint-modal-title" className="mt-2 text-3xl font-black tracking-tight text-text-primary font-mono">
          {checkpoint} {dict?.streaks?.winsSuffix || 'wins'}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {dict?.streaks?.checkpointLoseFallback || 'Lose from here and you fall back to'}{' '}
          <strong className="text-accent-green font-mono">{checkpoint}</strong>.
        </p>
      </div>
    </div>
  );
};

