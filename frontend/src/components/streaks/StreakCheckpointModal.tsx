'use client';
// frontend/src/components/streaks/StreakCheckpointModal.tsx
import type { Dictionary } from '@/locales/types';

import React, { useRef } from 'react';
import { ShieldCheck, PartyPopper } from 'lucide-react';
import { Modal } from '@/components/common/Modal';

export interface StreakCheckpointModalProps {
  checkpoint: number | null;
  onClose: () => void;
  /** Extra class on the modal frame (Gauntlet adds its landing animation). */
  className?: string;
  /** Extra class on the highlighted number (Gauntlet uses a monospace face). */
  valueClassName?: string;
  dict?: Dictionary;
}

/** "Checkpoint reached" celebration shared by Chaos and Gauntlet. */
export const StreakCheckpointModal: React.FC<StreakCheckpointModalProps> = ({
  checkpoint,
  onClose,
  className,
  valueClassName,
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
      className={className}
      icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
      title={`${value} ${dict?.streaks?.winsSuffix || 'wins'}`}
      subtitle={
        <span className="inline-flex items-center gap-1.5 font-black uppercase tracking-wider text-accent-green">
          <PartyPopper className="h-3.5 w-3.5" aria-hidden="true" />
          {dict?.streaks?.checkpointBanked || 'Checkpoint reached'}
        </span>
      }
      closeButtonAriaLabel={dict?.modal?.close}
      bodyClassName="p-6 text-center"
    >
      <p className="text-sm text-text-secondary">
        {dict?.streaks?.checkpointLoseFallback || 'Lose from here and you fall back to'}{' '}
        <strong className={`text-accent-green${valueClassName ? ` ${valueClassName}` : ''}`}>{value}</strong>.
      </p>
    </Modal>
  );
};
