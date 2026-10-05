'use client';
// frontend/src/components/streaks/gauntlet/LemonTokenPanel.tsx

import React from 'react';
import { Coins } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
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
  busy: boolean;
  /** True while the player is choosing a killer from the roster. */
  picking: boolean;
  pendingPick: string | null;
  onStartPick: () => void;
  onCancelPick: () => void;
  onConfirmPick: () => void;
  onBuy: (boost: BuyableBoost) => void;
}

interface BoostTileProps {
  boost: BuyableBoost;
  label: string;
  price: number;
  disabled: boolean;
  onClick: () => void;
}

/** One boost as a tile: icon, name and its price in tokens. */
const BoostTile: React.FC<BoostTileProps> = ({ boost, label, price, disabled, onClick }) => {
  const Icon = BOOST_ICONS[boost];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-2 rounded-xl border border-border-color bg-bg-surface px-3 py-4 text-center transition-colors enabled:cursor-pointer enabled:hover:border-accent-amber/60 enabled:hover:bg-bg-elevated disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Icon className="h-7 w-7 text-accent-amber" aria-hidden="true" />
      <span className="type-caption text-text-primary">{label}</span>
      <span className="inline-flex items-center gap-1 type-label-sm text-accent-amber">
        <Coins className="h-3.5 w-3.5" aria-hidden="true" />
        {price}
      </span>
    </button>
  );
};

export const LemonTokenPanel: React.FC<LemonTokenPanelProps> = ({
  boosts,
  tokens,
  tierInfo,
  bonusSlots,
  matchActive,
  busy,
  picking,
  pendingPick,
  onStartPick,
  onCancelPick,
  onConfirmPick,
  onBuy,
}) => {
  const dict = useDictionary();
  const { prices } = boosts;
  const locked = busy || !matchActive;
  const canPay = (amount: number) => !locked && tokens >= amount;

  return (
    <section
      aria-label={dict.streaks.boostsTitle}
      className="mx-auto mt-3 w-full max-w-xl rounded-xl border border-border-color bg-bg-elevated p-4"
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <h3 className="type-label text-text-primary">{dict.streaks.boostsTitle}</h3>
        <div className="flex items-center gap-1.5 type-card-title">
          <Coins className="h-4 w-4 text-accent-amber" aria-hidden="true" />
          <span>
            {dict.streaks.tokensLabel}: {tokens} / {boosts.cap}
          </span>
        </div>
      </div>

      {picking ? (
        <div className="mt-4 flex flex-col items-center gap-3 text-center">
          <p className="text-xs text-text-secondary">{dict.streaks.boostPickHint}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="primary" size="sm" onClick={onConfirmPick} disabled={!pendingPick || !canPay(prices.pick)}>
              {dict.streaks.boostConfirmPick} ({formatMessage(dict.streaks.boostPrice, { price: prices.pick })})
            </Button>
            <Button variant="secondary" size="sm" onClick={onCancelPick}>
              {dict.streaks.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <BoostTile
            boost="reroll"
            label={dict.streaks.boostReroll}
            price={prices.reroll}
            disabled={!canPay(prices.reroll)}
            onClick={() => onBuy('reroll')}
          />
          <BoostTile
            boost="pick"
            label={dict.streaks.boostPick}
            price={prices.pick}
            disabled={!canPay(prices.pick)}
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
    </section>
  );
};
