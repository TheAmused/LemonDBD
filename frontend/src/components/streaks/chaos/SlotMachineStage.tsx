// frontend/src/components/streaks/chaos/SlotMachineStage.tsx
'use client';

import React, { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Perk } from '@/types/gauntletStreak';
import { AddonRarity } from '@/types/chaosStreak';
import { getRarityTileStyle } from '@/components/character-detail/types';
import { useSlotReels, ReelDirection } from './useSlotReels';

const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const REEL_DIRECTIONS: ReelDirection[] = ['up', 'down', 'down', 'up'];

const perkIconFor = (perk: Perk) => {
  const cleanPath = (perk.icon_local_path || '').replace(/^\/?(static\/)?/, '');
  return cleanPath ? `${backendBase}/static/${cleanPath}` : perk.icon_url;
};

const ReelWindow: React.FC<{ perk: Perk | null; direction: ReelDirection; spinning: boolean; landed: boolean }> = ({
  perk,
  direction,
  spinning,
  landed,
}) => {
  const [failed, setFailed] = useState(false);
  const src = perk ? perkIconFor(perk) : undefined;
  const motionClass = spinning ? (direction === 'up' ? 'chaos-reel-up' : 'chaos-reel-down') : '';

  return (
    <div
      className={`relative w-full aspect-square overflow-hidden rounded-2xl border-2 bg-slate-950 flex items-center justify-center transition-shadow ${
        landed ? 'border-violet-400 shadow-[0_0_18px_rgba(167,139,250,0.5)]' : 'border-violet-500/30'
      }`}
    >
      {perk && src && !failed ? (
        <img
          key={perk.id ?? perk.name}
          src={src}
          alt={perk.name}
          className={`w-full h-full object-contain p-2 ${motionClass}`}
          onError={() => setFailed(true)}
        />
      ) : (
        <Sparkles className="w-8 h-8 text-violet-400/50" />
      )}
    </div>
  );
};

const RarityBadge: React.FC<{ rarity: AddonRarity; index: number; visible: boolean }> = ({
  rarity,
  index,
  visible,
}) => {
  const style = getRarityTileStyle(rarity);
  if (!visible) return <div className="h-9" />;
  return (
    <span
      className={`chaos-badge-pop inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${style.badge}`}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      Add-on {index + 1}: {rarity}
    </span>
  );
};

export interface SlotMachineStageProps {
  perks: Perk[];
  addonRarities: AddonRarity[];
  revealed: boolean;
  onPullLever: () => void;
  loading?: boolean;
}

export const SlotMachineStage: React.FC<SlotMachineStageProps> = ({
  perks,
  addonRarities,
  revealed,
  onPullLever,
  loading = false,
}) => {
  const { isSpinning, reelDisplay, landedMask, start } = useSlotReels(perks);
  const [leverPulled, setLeverPulled] = useState(false);
  const [hasSpunThisBuild, setHasSpunThisBuild] = useState(revealed);

  const needsSpin = revealed && !hasSpunThisBuild && !isSpinning;

  React.useEffect(() => {
    if (!revealed) {
      setHasSpunThisBuild(false);
    }
  }, [revealed, perks]);

  React.useEffect(() => {
    if (needsSpin) {
      start(() => setHasSpunThisBuild(true));
    }
  }, [needsSpin, start]);

  const handlePull = () => {
    if (isSpinning || loading) return;
    setLeverPulled(true);
    setTimeout(() => setLeverPulled(false), 600);
    onPullLever();
  };

  const showBadges = revealed && hasSpunThisBuild;

  return (
    <div className="w-full rounded-3xl border-2 border-violet-500/40 bg-gradient-to-b from-[#1a0b2e] to-[#0d0517] p-6 shadow-2xl shadow-violet-950/50">
      <div className="flex items-end gap-4">
        <div className="grid flex-1 grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <ReelWindow
              key={i}
              perk={revealed ? reelDisplay[i] : null}
              direction={REEL_DIRECTIONS[i]}
              spinning={isSpinning}
              landed={landedMask[i] && !isSpinning}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handlePull}
          disabled={isSpinning || loading}
          aria-label="Pull the lever"
          className="flex flex-col items-center gap-1 pb-2 disabled:opacity-50 cursor-pointer"
        >
          <div className="h-16 w-3 rounded-full bg-gradient-to-b from-slate-700 to-slate-900" />
          <div
            className={`h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-2 border-red-300 shadow-lg ${
              leverPulled ? 'chaos-lever-pull' : ''
            }`}
          />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 justify-center min-h-[2.25rem]">
        {revealed ? (
          <>
            <RarityBadge rarity={addonRarities[0]} index={0} visible={showBadges} />
            <RarityBadge rarity={addonRarities[1]} index={1} visible={showBadges} />
          </>
        ) : (
          <p className="text-xs text-violet-300/70">Pull the lever to draw this round's build.</p>
        )}
      </div>

      {loading && (
        <div className="mt-3 flex items-center justify-center gap-2 text-violet-300/60 text-xs">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Loading...</span>
        </div>
      )}
    </div>
  );
};
