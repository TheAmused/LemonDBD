'use client';
// frontend/src/components/streaks/history/HistoryPerkModal.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import { Sparkles, Lock } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Perk } from '@/types/gauntletStreak';
import { perkIconUrl as perkIconFor } from '@/utils/staticUrl';
import { usePerkDisplayName } from '@/context/DisplayNamesContext';
import { CELEBRATION_CARD_CLASSES, CELEBRATION_LABEL_CLASSES, CelebrationBadge } from '../CelebrationBadge';

const PLURAL_SUFFIX = { one: 'One', few: 'Few', many: 'Many' } as const;

/** "You unlocked 3 new perks", worded and declined for the locale. */
function unlockedPerksMessage(dict: Dictionary | undefined, locale: string, count: number): string {
  const category = new Intl.PluralRules(locale).select(count);
  const suffix = PLURAL_SUFFIX[category as keyof typeof PLURAL_SUFFIX] ?? 'Other';
  const template = dict?.streaks?.[`unlockedPerks${suffix}` as 'unlockedPerksOther'] || 'You unlocked {count} new perks';
  return template.replace('{count}', String(count));
}

type LockPhase = 'locked' | 'shaking' | 'breaking' | 'unlocked';

const LOCK_SHAKE_DELAY_MS = 500;
const LOCK_BREAK_DELAY_MS = 880;
const LOCK_UNLOCKED_DELAY_MS = 1560;

const PerkTile: React.FC<{ perk: Perk; index: number; phase: LockPhase }> = ({ perk, index, phase }) => {
  const [failed, setFailed] = useState(false);
  const displayName = usePerkDisplayName()(perk.name);
  const src = perkIconFor(perk);
  const isUnlocked = phase === 'unlocked';
  const isRevealed = phase === 'breaking' || phase === 'unlocked';
  const delay = { transitionDelay: `${index * 150}ms` };
  const animationDelay = { animationDelay: `${index * 150}ms` };

  return (
    <div
      className="relative flex flex-col items-center gap-1.5 p-2 rounded-lg border border-border-color bg-bg-elevated overflow-hidden"
      style={delay}
    >
      <div
        className={`w-full aspect-square rounded-md overflow-hidden bg-bg-elevated flex items-center justify-center transition-all duration-500 ${
          isRevealed ? '' : 'grayscale opacity-40'
        }`}
        style={delay}
      >
        {src && !failed ? (
          <img
            src={src}
            alt={displayName}
            className="w-full h-full object-contain"
            onError={() => setFailed(true)}
          />
        ) : (
          <Sparkles className="w-5 h-5 text-text-muted" />
        )}
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
  dict?: Dictionary;
}

export const HistoryPerkModal: React.FC<HistoryPerkModalProps> = ({ killerName, perks, locale, onClose, dict }) => {
  const [phase, setPhase] = useState<LockPhase>('locked');
  const unlockedMessage = unlockedPerksMessage(dict, locale, perks.length);

  useEffect(() => {
    if (!killerName) {
      setPhase('locked');
      return;
    }
    setPhase('locked');
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
      ariaLabel={dict?.streaks?.victoryCongrats || 'Congratulations'}
    >
      <div className={`relative w-full ${CELEBRATION_CARD_CLASSES} px-8 py-10`}>
        <CelebrationBadge />

        <p className={`mt-6 ${CELEBRATION_LABEL_CLASSES}`}>{dict?.streaks?.victoryCongrats || 'Congratulations'}</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">
          {perks.length > 0 ? unlockedMessage : dict?.streaks?.noNewPerks || 'No new perks this time.'}
        </h2>

        {perks.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {perks.map((perk, i) => (
              <PerkTile key={perk.name} perk={perk} index={i} phase={phase} />
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-accent-amber py-3 type-card-title text-text-inverted transition-colors hover:bg-accent-amber-hover cursor-pointer"
        >
          {dict?.streaks?.continueButton || 'Continue'}
        </button>
      </div>
    </Modal>
  );
};
