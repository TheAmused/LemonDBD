'use client';
// frontend/src/components/streaks/chaos/SlotMachineStage.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Perk } from '@/types/gauntletStreak';
import { AddonRarity } from '@/types/chaosStreak';
import { ADDON_RARITY_ICONS } from '@/constants/addonRarityIcons';
import { useSlotReels, ReelDirection, REEL_SPIN_MS } from './useSlotReels';
import { perkIconUrl as perkIconFor } from '@/utils/staticUrl';
import { usePerkDisplayName } from '@/context/DisplayNamesContext';

const REEL_DIRECTIONS: ReelDirection[] = ['up', 'down', 'down', 'up'];
const STRIP_LENGTH = 16;

const PerkImg: React.FC<{ perk: Perk | null; className: string }> = ({ perk, className }) => {
  const [failed, setFailed] = useState(false);
  const displayName = usePerkDisplayName()(perk?.name || '');
  const src = perk ? perkIconFor(perk) : undefined;
  if (!perk || !src || failed) {
    return <span className="text-2xl font-black text-text-muted" aria-hidden="true">?</span>;
  }
  return (
    <img src={src} alt={displayName} className={className} draggable={false} onError={() => setFailed(true)} />
  );
};

const ReelStrip: React.FC<{
  finalPerk: Perk | null;
  pool: Perk[];
  spinToken: number;
  direction: ReelDirection;
  durationMs: number;
  onLanded: () => void;
}> = ({ finalPerk, pool, spinToken, direction, durationMs, onLanded }) => {
  const windowRef = useRef<HTMLDivElement | null>(null);
  const [itemPx, setItemPx] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [offsetPx, setOffsetPx] = useState(0);
  const [animated, setAnimated] = useState(false);
  const lastToken = useRef(spinToken);

  useEffect(() => {
    const el = windowRef.current;
    if (!el) return;
    const measure = () => setItemPx(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const strip = useMemo(() => {
    if (!finalPerk) return [] as Perk[];
    const filler = pool.length ? pool : [finalPerk];
    const passers = Array.from({ length: STRIP_LENGTH - 1 }, (_, i) => filler[i % filler.length]);
    return direction === 'up' ? [...passers, finalPerk] : [finalPerk, ...passers];
  }, [finalPerk, pool, direction]);

  useEffect(() => {
    if (spinToken === lastToken.current) return;
    if (!finalPerk || !itemPx) return;
    lastToken.current = spinToken;
    const landedOffset = direction === 'up' ? -(STRIP_LENGTH - 1) * itemPx : 0;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSpinning(false);
      onLanded();
      return;
    }

    setSpinning(true);
    setAnimated(false);
    setOffsetPx(direction === 'up' ? 0 : -(STRIP_LENGTH - 1) * itemPx);

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimated(true);
        setOffsetPx(landedOffset);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [spinToken, itemPx, finalPerk, direction, onLanded]);

  return (
    <div
      ref={windowRef}
      className={`relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 shrink-0 overflow-hidden rounded-xl border-2 transition-shadow ${
        !spinning && finalPerk
          ? 'border-accent-red'
          : 'border-accent-red/30'
      }`}
    >
      {spinning ? (
        <div
          style={{
            transform: `translateY(${offsetPx}px)`,
            transition: animated ? `transform ${durationMs}ms cubic-bezier(.13,.7,.25,1)` : 'none',
          }}
          onTransitionEnd={(e) => {
            if (e.propertyName !== 'transform') return;
            setAnimated(false);
            setSpinning(false);
            onLanded();
          }}
        >
          {strip.map((perk, i) => (
            <div key={i} className="flex items-center justify-center bg-bg-elevated" style={{ height: itemPx }}>
              <PerkImg perk={perk} className="w-full h-full object-contain p-1.5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-bg-elevated">
          <PerkImg perk={finalPerk} className="w-full h-full object-contain p-1.5" />
        </div>
      )}
    </div>
  );
};

const RarityBadge: React.FC<{ rarity: AddonRarity; visible: boolean }> = ({ rarity, visible }) => {
  if (!visible) return <div className="h-10" />;
  return (
    <span className="chaos-badge-pop inline-flex items-center gap-2 rounded-lg border border-accent-red/30 bg-bg-surface/80 pl-1 pr-3 py-1 text-sm font-bold text-text-primary">
      <img
        src={ADDON_RARITY_ICONS[rarity]}
        alt=""
        className="h-9 w-9 rounded object-cover border border-border-color"
      />
      {rarity}
    </span>
  );
};

export interface SlotMachineStageProps {
  perks: Perk[];
  addonRarities: AddonRarity[];
  revealed: boolean;
  onPullLever: () => void;
  loading?: boolean;
  locked?: boolean;
  dict?: Dictionary;
}

export const SlotMachineStage: React.FC<SlotMachineStageProps> = ({
  perks,
  addonRarities,
  revealed,
  onPullLever,
  loading = false,
  locked = false,
  dict,
}) => {
  const { spinToken, start, reportLanded } = useSlotReels(4);
  const [leverPulled, setLeverPulled] = useState(false);
  const [hasSpunThisBuild, setHasSpunThisBuild] = useState(revealed);
  const pendingSpinRef = useRef(false);

  useEffect(() => {
    if (!revealed) {
      setHasSpunThisBuild(false);
      pendingSpinRef.current = false;
      return;
    }
    if (hasSpunThisBuild) return;
    if (pendingSpinRef.current) {
      pendingSpinRef.current = false;
      start(() => setHasSpunThisBuild(true));
    } else {
      setHasSpunThisBuild(true);
    }
  }, [revealed, perks, hasSpunThisBuild, start]);

  const handlePull = () => {
    if (revealed || loading || locked) return;
    pendingSpinRef.current = true;
    setLeverPulled(true);
    setTimeout(() => setLeverPulled(false), 550);
    onPullLever();
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl p-6 sm:p-8">
      <div className="relative z-10">
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          <div className="flex items-end gap-2">
            {[0, 1, 2, 3].map((i) => (
              <ReelStrip
                key={i}
                finalPerk={revealed ? perks[i] ?? null : null}
                pool={perks}
                spinToken={spinToken}
                direction={REEL_DIRECTIONS[i]}
                durationMs={REEL_SPIN_MS[i]}
                onLanded={reportLanded}
              />
            ))}
          </div>

          <SlotLever down={revealed || leverPulled} disabled={revealed || loading || locked} onPull={handlePull} />

          <div className="w-40 sm:w-48 shrink-0 pl-2 sm:pl-3">
            {revealed ? (
              <div className="flex flex-col gap-2">
                <RarityBadge rarity={addonRarities[0]} visible={hasSpunThisBuild} />
                <RarityBadge rarity={addonRarities[1]} visible={hasSpunThisBuild} />
              </div>
            ) : (
              <p className="text-lg sm:text-xl font-black leading-tight text-text-primary">
                {dict?.streaks?.pullTheLever || 'Pull the lever!'}
              </p>
            )}
          </div>
        </div>
      </div>

      <div
        className={`absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-2 text-text-muted text-xs ${
          loading ? 'visible' : 'invisible'
        }`}
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>{dict?.app?.loading || 'Loading...'}</span>
      </div>
    </div>
  );
};

const LEVER_STICK_PX = 54;

const SlotLever: React.FC<{ down: boolean; disabled: boolean; onPull: () => void; label?: string }> = ({
  down,
  disabled,
  onPull,
  label = 'Pull the lever',
}) => (
  <button
    type="button"
    onClick={onPull}
    disabled={disabled}
    aria-label={label}
    className="relative shrink-0 cursor-pointer disabled:cursor-default"
    style={{ perspective: '420px' }}
  >
    <div
      className="relative h-[150px] w-[74px] rounded-2xl border border-border-color transition-shadow duration-500"
      style={{
        background: 'linear-gradient(180deg, #0c0d11, #191a20)',
        boxShadow: down
          ? 'inset 0 6px 14px rgba(0,0,0,0.65), 0 0 26px rgba(239,68,68,0.35)'
          : 'inset 0 6px 14px rgba(0,0,0,0.65)',
      }}
    >
      <div
        className="absolute left-1/2 top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
        style={{ background: '#2c2e38', borderColor: '#5a5f73' }}
      />
      <div
        className="absolute left-1/2 w-[10px] -ml-[5px] rounded-full"
        style={{
          top: `calc(50% - ${LEVER_STICK_PX}px)`,
          height: LEVER_STICK_PX,
          transformOrigin: '50% 100%',
          transformStyle: 'preserve-3d',
          transform: down ? 'rotateX(-180deg)' : 'rotateX(0deg)',
          transition: 'transform 550ms cubic-bezier(0.34, 1.35, 0.64, 1)',
          background: 'linear-gradient(90deg, #8d93a8, #eef0f6, #5a5f73)',
        }}
      >
        <div
          className="absolute -top-[15px] -left-[10px] h-[30px] w-[30px] rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #fca5a5, #ef4444 50%, #7f1d1d)',
            boxShadow: '0 0 14px rgba(239,68,68,0.45)',
          }}
        />
      </div>
    </div>
  </button>
);
