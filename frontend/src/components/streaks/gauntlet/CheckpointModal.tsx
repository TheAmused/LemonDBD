'use client';
// frontend/src/components/streaks/gauntlet/CheckpointModal.tsx

import React, { useRef } from 'react';
import { ShieldCheck, PartyPopper } from 'lucide-react';
import type { Role } from '@/types/gauntletStreak';
import type { Dictionary } from '@/locales/types';
import { Modal } from '@/components/common/Modal';

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
  // Keep the last value so the exit animation does not flash an empty number.
  const lastRef = useRef<number>(0);
  if (checkpoint != null) lastRef.current = checkpoint;
  const value = checkpoint ?? lastRef.current;

  return (
    <Modal
      isOpen={checkpoint != null}
      onClose={onClose}
      variant="confirm"
      tone="success"
      icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
      title={`${value} ${dict?.streaks?.winsSuffix || 'wins'}`}
      subtitle={
        <span className="inline-flex items-center gap-1.5 font-black uppercase tracking-wider text-accent-green">
          <PartyPopper className="h-3.5 w-3.5" aria-hidden="true" />
          {dict?.streaks?.checkpointBanked || 'Checkpoint reached'}
        </span>
      }
      closeButtonAriaLabel={dict?.modal?.close}
      className="gn-land-frame"
      bodyClassName="p-6 text-center"
    >
      <p className="text-sm text-text-secondary">
        {dict?.streaks?.checkpointLoseFallback || 'Lose from here and you fall back to'}{' '}
        <strong className="text-accent-green font-mono">{value}</strong>.
      </p>
    </Modal>
  );
};
