'use client';
// frontend/src/components/streaks/gauntlet/LemonTokenPanel.tsx

import React from 'react';
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
  const price = (amount: number) => formatMessage(dict.streaks.boostPrice, { price: amount });
  const locked = busy || !matchActive;
  const canPay = (amount: number) => !locked && tokens >= amount;

  return (
    <section
      aria-label={dict.streaks.boostsTitle}
      className="mt-3 w-full rounded-xl border border-border-color bg-bg-elevated p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="type-label text-text-primary">{dict.streaks.boostsTitle}</h3>
        <div className="flex items-center gap-2 type-card-title">
          <span>
            {dict.streaks.tokensLabel}: {tokens} / {boosts.cap}
          </span>
        </div>
      </div>

      {picking ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="text-xs text-text-secondary">{dict.streaks.boostPickHint}</p>
          <Button variant="primary" size="sm" onClick={onConfirmPick} disabled={!pendingPick || !canPay(prices.pick)}>
            {dict.streaks.boostConfirmPick} ({price(prices.pick)})
          </Button>
          <Button variant="secondary" size="sm" onClick={onCancelPick}>
            {dict.streaks.cancel}
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<BOOST_ICONS.reroll className="h-3.5 w-3.5" />}
            onClick={() => onBuy('reroll')}
            disabled={!canPay(prices.reroll)}
          >
            {dict.streaks.boostReroll} ({price(prices.reroll)})
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<BOOST_ICONS.pick className="h-3.5 w-3.5" />}
            onClick={onStartPick}
            disabled={!canPay(prices.pick)}
          >
            {dict.streaks.boostPick} ({price(prices.pick)})
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<BOOST_ICONS.slot className="h-3.5 w-3.5" />}
            onClick={() => onBuy('slot')}
            disabled={!canPay(prices.slot) || !canAddSlot(tierInfo, bonusSlots, boosts.max_perk_slots)}
          >
            {dict.streaks.boostSlot} ({price(prices.slot)})
          </Button>
        </div>
      )}
    </section>
  );
};
