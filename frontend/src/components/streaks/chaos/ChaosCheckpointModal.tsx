'use client';
// frontend/src/components/streaks/chaos/ChaosCheckpointModal.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect } from 'react';
import { ShieldCheck, PartyPopper } from 'lucide-react';

export interface ChaosCheckpointModalProps {
  checkpoint: number | null;
  onClose: () => void;
  dict?: Dictionary;
}

export const ChaosCheckpointModal: React.FC<ChaosCheckpointModalProps> = ({ checkpoint, onClose, dict }) => {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-md cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border-2 border-accent-green bg-gradient-to-b from-accent-green/15 via-bg-surface to-bg-primary p-8 text-center shadow-2xl cursor-default"
      >
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-accent-green bg-accent-green/15 text-accent-green">
          <ShieldCheck className="h-10 w-10" />
        </div>
        <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-accent-green">
          <PartyPopper className="h-3.5 w-3.5" />
          {dict?.streaks?.checkpointBanked || 'Checkpoint reached'}
        </div>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-text-primary">
          {checkpoint} {dict?.streaks?.winsSuffix || 'wins'}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {dict?.streaks?.checkpointLoseFallback || 'Lose from here and you fall back to'} <strong className="text-accent-green">{checkpoint}</strong>.
        </p>
      </div>
    </div>
  );
};
