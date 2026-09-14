'use client';
// frontend/src/components/streaks/history/HistoryPerkModal.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import { PartyPopper, Sparkles, Lock } from 'lucide-react';
import { Perk } from '@/types/gauntletStreak';
import { perkIconUrl as perkIconFor } from '@/utils/staticUrl';
import { useCharacterDisplayName, usePerkDisplayName } from '@/context/DisplayNamesContext';

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
      className={`relative flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-colors duration-500 overflow-hidden ${
        isRevealed
          ? 'bg-accent-green/10 border-accent-green/40'
          : 'bg-bg-elevated border-border-color'
      }`}
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
          <Sparkles className="w-5 h-5 text-accent-green" />
        )}
      </div>
      <span className="text-[10px] font-bold text-text-secondary truncate w-full text-center">
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
  onClose: () => void;
  dict?: Dictionary;
}

export const HistoryPerkModal: React.FC<HistoryPerkModalProps> = ({ killerName, perks, onClose, dict }) => {
  const [phase, setPhase] = useState<LockPhase>('locked');
  const killerDisplayName = useCharacterDisplayName()(killerName || '');

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

  if (!killerName) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-md cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border-2 border-accent-green bg-bg-surface p-8 text-center shadow-2xl cursor-default"
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-accent-green bg-accent-green/15 text-accent-green">
          <PartyPopper className="h-8 w-8" />
        </div>

        <h2 className="text-xl font-black tracking-tight text-text-primary">{killerDisplayName} {dict?.stats?.win || 'beaten'}!</h2>
        <p className="mt-1 text-xs text-text-muted uppercase tracking-wider font-bold">
          {dict?.streaks?.perksUnlocked || 'Perks unlocked'}
        </p>

        {perks.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">
            {dict?.streaks?.noNewPerks || 'No new perks this time.'}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {perks.map((perk, i) => (
              <PerkTile key={perk.name} perk={perk} index={i} phase={phase} />
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-accent-green py-3 text-sm font-extrabold text-white shadow-lg transition-all hover:bg-accent-green-hover cursor-pointer"
        >
          {dict?.streaks?.continueButton || 'Continue'}
        </button>
      </div>
    </div>
  );
};
