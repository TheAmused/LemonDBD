'use client';
// frontend/src/components/streaks/history/HistoryPerkModal.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import { Sparkles, Lock } from 'lucide-react';
import { PerkIcon } from '@/components/ui/PerkIcon';
import { Modal } from '@/components/common/Modal';
import { Perk } from '@/types/gauntletStreak';
import { perkIconUrl as perkIconFor } from '@/utils/staticUrl';
import { usePerkDisplayName } from '@/context/DisplayNamesContext';
import { CELEBRATION_CARD_CLASSES, CELEBRATION_LABEL_CLASSES, CelebrationBadge } from '../CelebrationBadge';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";

import { Button } from '@/components/common/Button';
import { useOnValueChange } from '@/hooks/useOnValueChange';
/** "You unlocked 3 new perks", worded and declined for the locale. */
function unlockedPerksMessage(dict: Dictionary, locale: string, count: number): string {
  return formatMessage(dict.streaks.unlockedPerks, { count }, locale);
}

type LockPhase = 'locked' | 'shaking' | 'breaking' | 'unlocked';

const LOCK_SHAKE_DELAY_MS = 500;
const LOCK_BREAK_DELAY_MS = 880;
const LOCK_UNLOCKED_DELAY_MS = 1560;

const PerkTile: React.FC<{ perk: Perk; index: number; phase: LockPhase }> = ({ perk, index, phase }) => {
  const displayName = usePerkDisplayName()(perk.name);
  const src = perkIconFor(perk);
  const isUnlocked = phase === 'unlocked';
  const isRevealed = phase === 'breaking' || phase === 'unlocked';
  const delay = { transitionDelay: `${index * 150}ms` };
  const animationDelay = { animationDelay: `${index * 150}ms` };

  return (
    <div
      className="relative flex flex-col items-center gap-1.5 p-2 rounded-chip border border-border-color bg-bg-elevated overflow-hidden"
      style={delay}
    >
      <div
        className={`w-full aspect-square rounded-chip overflow-hidden bg-bg-elevated flex items-center justify-center transition-all duration-500 ${
          isRevealed ? '' : 'grayscale opacity-40'
        }`}
        style={delay}
      >
        <PerkIcon
          perk={perk}
          src={src}
          alt={displayName}
          imageClassName="w-full h-full object-contain"
          fallbackIcon={<Sparkles className="w-5 h-5 text-text-muted" />}
        />
      </div>
      <span className="type-strong-2xs text-text-secondary truncate w-full text-center">
        {displayName}
      </span>

      {!isUnlocked && (
        <div
          className={`absolute inset-0 bg-bg-primary/70 flex items-center justify-center transition-opacity duration-300 ${
            phase === 'breaking' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div
            className={`p-1.5 rounded-full bg-bg-elevated border border-border-color ${
              phase === 'shaking' ? 'history-lock-shake' : ''
            }`}
            style={animationDelay}
          >
            <Lock className="w-3.5 h-3.5 text-text-secondary" />
          </div>
        </div>
      )}
    </div>
  );
};

export interface HistoryPerkModalProps {
  killerName: string | null;
  perks: Perk[];
  locale: string;
  onClose: () => void;
}

export const HistoryPerkModal: React.FC<HistoryPerkModalProps> = ({ killerName, perks, locale, onClose }) => {
  const dict = useDictionary();
  const [phase, setPhase] = useState<LockPhase>('locked');
  const unlockedMessage = unlockedPerksMessage(dict, locale, perks.length);

  // Every killer's perks start locked, then the lock shakes, breaks and opens.
  useOnValueChange(killerName, () => setPhase('locked'));

  useEffect(() => {
    if (!killerName) return;
    const shakeTimer = setTimeout(() => setPhase('shaking'), LOCK_SHAKE_DELAY_MS);
    const breakTimer = setTimeout(() => setPhase('breaking'), LOCK_BREAK_DELAY_MS);
    const unlockTimer = setTimeout(() => setPhase('unlocked'), LOCK_UNLOCKED_DELAY_MS);
    return () => {
      clearTimeout(shakeTimer);
      clearTimeout(breakTimer);
      clearTimeout(unlockTimer);
    };
  }, [killerName]);

  return (
    <Modal
      isOpen={killerName != null}
      onClose={onClose}
      variant="lightbox"
      size="sm"
      closeButton="none"
      ariaLabel={dict.streaks.victoryCongrats}
    >
      <div className={`relative w-full ${CELEBRATION_CARD_CLASSES} px-8 py-10`}>
        <CelebrationBadge />

        <p className={`mt-6 ${CELEBRATION_LABEL_CLASSES}`}>{dict.streaks.victoryCongrats}</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">
          {perks.length > 0 ? unlockedMessage : dict.streaks.noNewPerks}
        </h2>

        {perks.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {perks.map((perk, i) => (
              <PerkTile key={perk.name} perk={perk} index={i} phase={phase} />
            ))}
          </div>
        )}

        <Button
          onClick={onClose}
          variant="amber" size="md" className="mt-6 w-full"
        >
          {dict.streaks.continueButton}
        </Button>
      </div>
    </Modal>
  );
};
