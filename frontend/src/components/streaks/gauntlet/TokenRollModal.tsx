'use client';
// frontend/src/components/streaks/gauntlet/TokenRollModal.tsx

import React, { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { useDictionary } from '@/context/DictionaryContext';
import { TokenRoulette } from './TokenRoulette';
import type { TokenRollPlay } from './useGauntletRun';

interface TokenRollModalProps {
  /** The win's token roll to play; null keeps the modal closed. */
  tokenRoll: TokenRollPlay | null;
  onClose: () => void;
}

/**
 * Shown right after a win: the token roulette plays on its own, and only
 * closing it lets the next killer's draw begin, so the two never compete
 * for the player's eyes.
 */
export const TokenRollModal: React.FC<TokenRollModalProps> = ({ tokenRoll, onClose }) => {
  const dict = useDictionary();
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (!tokenRoll) setLanded(false);
  }, [tokenRoll]);

  return (
    <Modal
      isOpen={tokenRoll != null}
      // Closing while the reel still spins would hide the result.
      onClose={() => {
        if (landed) onClose();
      }}
      variant="lightbox"
      size="sm"
      closeButton="none"
      ariaLabel={dict.streaks.tokensLabel}
    >
      <div className="ck-card-in relative flex min-h-[22rem] w-full cursor-default flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border border-accent-amber/60 bg-gradient-to-b from-accent-amber/20 via-bg-surface to-bg-primary px-8 py-12 text-center">
        <Coins className="h-12 w-12 text-accent-amber" aria-hidden="true" />
        <p className="type-label-sm tracking-spaced-md text-accent-amber">{dict.streaks.tokensLabel}</p>
        {tokenRoll && <TokenRoulette large roll={tokenRoll.roll} onDone={() => setLanded(true)} />}
        <Button variant="primary" size="md" onClick={onClose} disabled={!landed}>
          {dict.streaks.continueButton}
        </Button>
      </div>
    </Modal>
  );
};
