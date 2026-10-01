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
  const leverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (revealed) {
      if (leverTimerRef.current) clearTimeout(leverTimerRef.current);
      setLeverPulled(false);
    }
  }, [revealed]);

  useEffect(() => () => {
    if (leverTimerRef.current) clearTimeout(leverTimerRef.current);
  }, []);

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
    leverTimerRef.current = setTimeout(() => setLeverPulled(false), LEVER_PENDING_MS);
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

/** Keeps the lever down while the reveal request is in flight; releases it if the request never lands. */
const LEVER_PENDING_MS = 4000;
const LEVER_BALL_PX = 26;
const LEVER_ROD_PX = 12;
const LEVER_ROD_FRACTION = 0.38;
const LEVER_PERSPECTIVE_PX = 130;
const LEVER_SWING_MS = 600;
const LEVER_ROD_FILL =
  'linear-gradient(90deg, var(--text-muted) 55%, color-mix(in srgb, var(--text-muted) 65%, var(--bg-primary)) 55%)';
const LEVER_BALL_FILL =
  'radial-gradient(circle at 32% 30%, color-mix(in srgb, var(--accent-red) 55%, white) 0 13%, transparent 14%), var(--accent-red)';

const easeOutBack = (t: number): number => {
  const c1 = 1.3;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const SlotLever: React.FC<{ down: boolean; disabled: boolean; onPull: () => void; label?: string }> = ({
  down,
  disabled,
  onPull,
  label = 'Pull the lever',
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const rodRef = useRef<HTMLDivElement | null>(null);
  const ballRef = useRef<HTMLDivElement | null>(null);
  const angleRef = useRef(down ? Math.PI : 0);

  // Projects the rod tip, swinging about the horizontal pivot axis toward the viewer, with a
  // manual perspective divide. Plain 2D transforms only, so no 3D layer is ever re-rasterised.
  const render = useRef((angle: number) => {
    const panel = panelRef.current;
    const rod = rodRef.current;
    const ball = ballRef.current;
    if (!panel || !rod || !ball) return;
    const pivotY = panel.clientHeight / 2;
    const length = panel.clientHeight * LEVER_ROD_FRACTION;
    const scale = LEVER_PERSPECTIVE_PX / (LEVER_PERSPECTIVE_PX - length * Math.sin(angle));
    const tipY = pivotY - length * Math.cos(angle) * scale;
    const rodHeight = Math.abs(tipY - pivotY);
    const rodWidth = LEVER_ROD_PX * Math.max(1, scale);
    const tipHalf = (LEVER_ROD_PX / 2) * scale;
    const pivotHalf = LEVER_ROD_PX / 2;
    const mid = rodWidth / 2;
    const tipUp = tipY < pivotY;
    const top = tipUp ? tipY : pivotY;
    const [topHalf, bottomHalf] = tipUp ? [tipHalf, pivotHalf] : [pivotHalf, tipHalf];
    rod.style.top = `${top}px`;
    rod.style.height = `${rodHeight}px`;
    rod.style.width = `${rodWidth}px`;
    rod.style.marginLeft = `${-rodWidth / 2}px`;
    rod.style.opacity = rodHeight < 1 ? '0' : '1';
    rod.style.clipPath = `polygon(${mid - topHalf}px 0, ${mid + topHalf}px 0, ${mid + bottomHalf}px 100%, ${mid - bottomHalf}px 100%)`;
    const ballSize = LEVER_BALL_PX * scale;
    ball.style.width = `${ballSize}px`;
    ball.style.height = `${ballSize}px`;
    ball.style.left = `calc(50% - ${ballSize / 2}px)`;
    ball.style.top = `${tipY - ballSize / 2}px`;
  });

  useEffect(() => {
    const target = down ? Math.PI : 0;
    const from = angleRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || from === target) {
      angleRef.current = target;
      render.current(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / LEVER_SWING_MS);
      angleRef.current = from + (target - from) * easeOutBack(t);
      render.current(angleRef.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [down]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const ro = new ResizeObserver(() => render.current(angleRef.current));
    ro.observe(panel);
    return () => ro.disconnect();
  }, []);

  return (
    <button
      type="button"
      onClick={onPull}
      disabled={disabled}
      aria-label={label}
      className="relative shrink-0 cursor-pointer disabled:cursor-default"
    >
      <div
        ref={panelRef}
        className="relative h-24 sm:h-28 md:h-32 w-16 sm:w-[72px] rounded-2xl border border-border-color"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div
          className="absolute left-1/2 top-1/2 h-[40%] w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: 'var(--bg-primary)' }}
        />
        <div ref={rodRef} className="absolute left-1/2" style={{ background: LEVER_ROD_FILL }} />
        <div
          className="absolute left-1/2 top-1/2 h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: 'var(--bg-elevated)', border: '2px solid var(--border-color)' }}
        />
        <div
          ref={ballRef}
          className="absolute rounded-full"
          style={{ background: LEVER_BALL_FILL }}
        />
      </div>
    </button>
  );
};
