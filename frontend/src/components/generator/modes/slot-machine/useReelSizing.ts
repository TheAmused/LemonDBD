// frontend/src/components/generator/modes/slot-machine/useReelSizing.ts
import { useEffect, useRef, useState } from 'react';
import { REEL_COUNT, REEL_GAP_PX, REEL_MAX_PX, REEL_MIN_PX } from './slotMachineStrip';
import type { MachinePhase } from './slotMachineTypes';

/** Cell size for the measured reel area, or null while a desktop area has no size yet. */
function measureCellPx(rect: DOMRect, mobile: boolean): number | null {
  if (mobile) {
    const availWidth = rect.width > 0 ? rect.width : window.innerWidth;
    const boundedW = Math.min(availWidth, 420);
    return Math.max(64, Math.min(76, Math.floor((boundedW - 130) / 3)));
  }
  if (rect.width === 0 || rect.height === 0) return null;
  const byHeight = Math.floor(rect.height / 3);
  const byWidth = Math.floor((rect.width - (REEL_COUNT - 1) * REEL_GAP_PX) / REEL_COUNT);
  return Math.max(REEL_MIN_PX, Math.min(REEL_MAX_PX, byHeight, byWidth));
}

/** Sizes the reels off the real rendered area (see `reelAreaRef`) and tracks the mobile breakpoint. */
export function useReelSizing(phase: MachinePhase) {
  const [cellPx, setCellPx] = useState(104);
  const [isMobile, setIsMobile] = useState(false);
  const reelAreaRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<MachinePhase>('idle');

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const el = reelAreaRef.current;
    if (!el) return;

    const compute = () => {
      if (phaseRef.current === 'spinning') return;
      const rect = el.getBoundingClientRect();
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      const next = measureCellPx(rect, mobile);
      if (next !== null) setCellPx((prev) => (Math.abs(prev - next) > 1 ? next : prev));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, []);

  useEffect(() => {
    if (phase === 'spinning') return;
    const el = reelAreaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    const next = measureCellPx(rect, mobile);
    if (next !== null) setCellPx((prev) => (Math.abs(prev - next) > 1 ? next : prev));
  }, [phase]);

  return { reelAreaRef, cellPx, isMobile };
}
