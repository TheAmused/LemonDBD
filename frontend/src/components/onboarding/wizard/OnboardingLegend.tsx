'use client';
// frontend/src/components/onboarding/wizard/OnboardingLegend.tsx
import React from 'react';
import { CharacterOwnershipOverlay } from '@/components/characters/CharacterOwnershipOverlay';
import { useDictionary } from '@/context/DictionaryContext';
import { type OnboardingCharacter, resolveOnboardingAvatar } from '../CharacterOnboardingWizardParts';

interface LegendItemProps {
  legendCharacter: OnboardingCharacter | undefined;
  backendBase: string;
  label: string;
  isOwned: boolean;
  hasPartialPerks: boolean;
}

function LegendItem({ legendCharacter, backendBase, label, isOwned, hasPartialPerks }: LegendItemProps) {
  return (
    <div className="flex flex-col items-center text-center gap-2 w-full max-w-[150px]">
      <span className="relative flex aspect-[3/4] w-14 sm:w-16 md:w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-color bg-bg-surface shadow-sm">
        {legendCharacter && (
          <img
            src={resolveOnboardingAvatar(backendBase, legendCharacter)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        )}
        <CharacterOwnershipOverlay
          isOwned={isOwned}
          hasPartialPerks={hasPartialPerks}
          avatarSrc={legendCharacter ? resolveOnboardingAvatar(backendBase, legendCharacter) : undefined}
          badgeSize="sm"
        />
      </span>
      <span className="text-tiny sm:text-xs font-semibold text-text-primary leading-tight">{label}</span>
    </div>
  );
}

interface OnboardingLegendProps {
  legendCharacter: OnboardingCharacter | undefined;
  backendBase: string;
}

/** "How it works": the three ownership states, drawn on a real portrait. */
export function OnboardingLegend({ legendCharacter, backendBase }: OnboardingLegendProps) {
  const t = useDictionary().onboarding;
  const shared = { legendCharacter, backendBase };

  return (
    <section className="flex flex-col items-center text-center space-y-1.5 sm:space-y-2">
      <h2 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wider text-text-primary">
        {t.legendTitle}
      </h2>
      <div className="grid grid-cols-3 items-start justify-items-center gap-2 sm:gap-6 w-full max-w-xl mx-auto">
        <LegendItem {...shared} label={t.legendLocked} isOwned={false} hasPartialPerks={false} />
        <LegendItem {...shared} label={t.legendPartial} isOwned={false} hasPartialPerks />
        <LegendItem {...shared} label={t.legendOwned} isOwned hasPartialPerks={false} />
      </div>
    </section>
  );
}
