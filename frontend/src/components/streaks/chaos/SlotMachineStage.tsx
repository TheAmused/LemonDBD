// frontend/src/components/streaks/chaos/SlotMachineStage.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Perk } from '@/types/gauntletStreak';
import { AddonRarity } from '@/types/chaosStreak';
import { ADDON_RARITY_ICONS } from '@/constants/addonRarityIcons';
import { useSlotReels, ReelDirection, REEL_SPIN_MS } from './useSlotReels';

const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const REEL_DIRECTIONS: ReelDirection[] = ['up', 'down', 'down', 'up'];
const STRIP_LENGTH = 16;

const perkIconFor = (perk: Perk) => {
  const cleanPath = (perk.icon_local_path || '').replace(/^\/?(static\/)?/, '');
  return cleanPath ? `${backendBase}/static/${cleanPath}` : perk.icon_url;
};

const PerkImg: React.FC<{ perk: Perk | null; className: string }> = ({ perk, className }) => {
  const [failed, setFailed] = useState(false);
  const src = perk ? perkIconFor(perk) : undefined;
  if (!perk || !src || failed) {
    return <Sparkles className="w-5 h-5 text-violet-400/50" />;
  }
  return (
    <img src={src} alt={perk.name} className={className} draggable={false} onError={() => setFailed(true)} />
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
          ? 'border-violet-400 shadow-[0_0_14px_rgba(167,139,250,0.5)]'
          : 'border-violet-500/30'
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
            <div key={i} className="flex items-center justify-center bg-slate-950" style={{ height: itemPx }}>
              <PerkImg perk={perk} className="w-full h-full object-contain p-1.5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-950">
          <PerkImg perk={finalPerk} className="w-full h-full object-contain p-1.5" />
        </div>
      )}
    </div>
  );
};

const RarityBadge: React.FC<{ rarity: AddonRarity; visible: boolean }> = ({ rarity, visible }) => {
  if (!visible) return <div className="h-10" />;
  return (
    <span className="chaos-badge-pop inline-flex items-center gap-2 rounded-lg border border-violet-500/30 bg-slate-950/60 pl-1 pr-3 py-1 text-sm font-bold text-violet-100">
      <img
        src={ADDON_RARITY_ICONS[rarity]}
        alt=""
        className="h-9 w-9 rounded object-cover border border-white/10"
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
}

export const SlotMachineStage: React.FC<SlotMachineStageProps> = ({
  perks,
  addonRarities,
  revealed,
  onPullLever,
  loading = false,
  locked = false,
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
    <div className="relative w-full overflow-hidden rounded-2xl border-2 border-violet-500/40 bg-gradient-to-b from-[#1a0b2e] to-[#0d0517] p-6 sm:p-8 shadow-xl shadow-violet-950/50">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 14px)',
        }}
      />
      <div className="pointer-events-none absolute inset-x-3 top-1.5 flex justify-between">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="chaos-marquee-bulb h-1 w-1 rounded-full"
            style={{
              backgroundColor: i % 2 === 0 ? '#c4b5fd' : '#fbbf24',
              boxShadow: `0 0 4px ${i % 2 === 0 ? '#c4b5fd' : '#fbbf24'}`,
              animationDelay: `${i * 150}ms`,
            }}
          />
        ))}
      </div>

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

          <SlotLever pulled={leverPulled} disabled={revealed || loading || locked} onPull={handlePull} />

          {revealed ? (
            <div className="flex flex-col gap-2 pl-2 sm:pl-3">
              <RarityBadge rarity={addonRarities[0]} visible={hasSpunThisBuild} />
              <RarityBadge rarity={addonRarities[1]} visible={hasSpunThisBuild} />
            </div>
          ) : (
            <p className="pl-2 sm:pl-3 max-w-[10rem] sm:max-w-xs text-lg sm:text-xl font-black leading-tight text-violet-100">
              Pull the lever!
            </p>
          )}
        </div>
      </div>

      <div
        className={`absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-2 text-violet-300/60 text-xs ${
          loading ? 'visible' : 'invisible'
        }`}
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Loading...</span>
      </div>
    </div>
  );
};

const SlotLever: React.FC<{ pulled: boolean; disabled: boolean; onPull: () => void }> = ({
  pulled,
  disabled,
  onPull,
}) => (
  <button
    type="button"
    onClick={onPull}
    disabled={disabled}
    aria-label="Pull the lever"
    className="group relative flex flex-col items-center pb-1 disabled:opacity-50 cursor-pointer"
  >
    <div
      className={`relative ${pulled ? 'chaos-lever-pull' : ''}`}
      style={{ transformOrigin: '50% 100%' }}
    >
      <svg width="28" height="72" viewBox="0 0 28 72" className="drop-shadow-md">
        <defs>
          <linearGradient id="chaosLeverRail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="45%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <radialGradient id="chaosLeverBall" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="45%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </radialGradient>
        </defs>
        <rect x="11" y="19" width="6" height="48" rx="3" fill="url(#chaosLeverRail)" />
        <circle cx="14" cy="15" r="14" fill="url(#chaosLeverBall)" stroke="#fecaca" strokeWidth="1" />
        <ellipse cx="9" cy="10" rx="4.2" ry="2.8" fill="#fff" opacity="0.55" />
      </svg>
    </div>
    <svg width="42" height="14" viewBox="0 0 42 14" className="-mt-0.5">
      <ellipse cx="21" cy="6" rx="19.5" ry="4.9" fill="#1e293b" stroke="#475569" strokeWidth="1.4" />
    </svg>
  </button>
);
