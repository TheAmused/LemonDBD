'use client';
// frontend/src/components/streaks/gauntlet/LemonTokenPanel.tsx

import React from 'react';
import { Coins } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import { canAddSlot } from '@/utils/perkSlots';
import { BOOST_ICONS } from './boostIcons';
import type { BoostConfig, BuyableBoost, TierInfo } from '@/types/gauntletStreak';

interface LemonTokenPanelProps {
  boosts: BoostConfig;
  tokens: number;
  tierInfo: TierInfo;
  bonusSlots: number;
  /** False until the match is started, and once the run is over. */
  matchActive: boolean;
  /** False when the killer in play is the last one left to beat, so there is nobody to reroll or pick. */
  hasOtherKiller: boolean;
  busy: boolean;
  /** True while the player is choosing a killer from the roster; the confirm and cancel buttons live in the action bar. */
  picking: boolean;
  onStartPick: () => void;
  onBuy: (boost: BuyableBoost) => void;
}

interface BoostTileProps {
  boost: BuyableBoost;
  label: string;
  price: number;
  disabled: boolean;
  onClick: () => void;
}

/** One boost as a compact button: icon, name and its price in tokens. */
const BoostTile: React.FC<BoostTileProps> = ({ boost, label, price, disabled, onClick }) => {
  const Icon = BOOST_ICONS[boost];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-control border border-border-color bg-bg-surface px-2 py-2 text-center transition-colors sm:flex-row sm:gap-2 sm:px-3 sm:text-left enabled:cursor-pointer enabled:hover:border-accent-amber/60 enabled:hover:bg-bg-elevated disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Icon className="h-5 w-5 shrink-0 text-accent-amber" aria-hidden="true" />
      <span className="type-caption min-w-0 text-text-primary max-sm:text-xs max-sm:leading-tight">{label}</span>
      <span className="type-label-sm text-accent-amber">{price}</span>
    </button>
  );
};

export const LemonTokenPanel: React.FC<LemonTokenPanelProps> = ({
  boosts,
  tokens,
  tierInfo,
  bonusSlots,
  matchActive,
  hasOtherKiller,
  busy,
  picking,
  onStartPick,
  onBuy,
}) => {
  const dict = useDictionary();
  const { prices } = boosts;
  const locked = busy || !matchActive;
  const canPay = (amount: number) => !locked && tokens >= amount;

  return (
    <section
      aria-label={dict.streaks.boostsTitle}
      className="mt-4 flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border-color px-1 pt-4"
    >
      {picking ? (
        <p className="text-xs text-text-secondary">{dict.streaks.boostPickHint}</p>
      ) : (
        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <BoostTile
            boost="reroll"
            label={dict.streaks.boostReroll}
            price={prices.reroll}
            disabled={!canPay(prices.reroll) || !hasOtherKiller}
            onClick={() => onBuy('reroll')}
          />
          <BoostTile
            boost="pick"
            label={dict.streaks.boostPick}
            price={prices.pick}
            disabled={!canPay(prices.pick) || !hasOtherKiller}
            onClick={onStartPick}
          />
          <BoostTile
            boost="slot"
            label={dict.streaks.boostSlot}
            price={prices.slot}
            disabled={!canPay(prices.slot) || !canAddSlot(tierInfo, bonusSlots, boosts.max_perk_slots)}
            onClick={() => onBuy('slot')}
          />
        </div>
      )}

      <div className="ml-auto flex items-center gap-1.5 type-card-title max-sm:order-first">
        <Coins className="h-4 w-4 text-accent-amber" aria-hidden="true" />
        <span>
          {dict.streaks.tokensLabel}: {tokens} / {boosts.cap}
        </span>
      </div>
    </section>
  );
};
