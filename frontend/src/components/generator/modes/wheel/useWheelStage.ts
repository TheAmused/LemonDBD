// frontend/src/components/generator/modes/wheel/useWheelStage.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';
import { useDictionary } from '@/context/DictionaryContext';
import { getPerkIconUrl } from '@/utils/perkUtils';
import { formatMessage } from '@/utils/i18nFormat';
import { useJackpotCelebration } from '../../shared/useJackpotCelebration';
import { drawWheel } from './wheelDrawing';
import { pickTargetSlot } from './wheelSpin';
import { useEmberDrift } from './useEmberDrift';

interface WheelStageInput {
  totalPages: number;
  perksPerPage: number;
  lastPagePerks: number;
  spinDurationSec: number;
  role: RoleCategory;
  sortedPerks: Perk[];
  activeSlotIdx: number;
  activeMutator: ChaosMutator | null;
  onWinSlot: (wonData: DrawnSlot) => void;
  backendBase?: string;
}

/** The wheel's canvas drawing, two-stage spin (page wheel, then perk wheel) and result handling. */
export function useWheelStage({
  totalPages,
  perksPerPage,
  lastPagePerks,
  spinDurationSec,
  role,
  sortedPerks,
  activeSlotIdx,
  activeMutator,
  onWinSlot,
  backendBase,
}: WheelStageInput) {
  const dict = useDictionary();
  const [wheelPhase, setWheelPhase] = useState<'page' | 'perk'>('page');
  const [selectedPageUI, setSelectedPageUI] = useState<number>(1);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [isMorphing, setIsMorphing] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');
  const [reduceMotion, setReduceMotion] = useState(false);

  const wheelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wheelWrapperRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const wheelAngleRef = useRef<number>(0);
  const wheelPhaseRef = useRef<'page' | 'perk'>('page');
  const activePageRef = useRef<number>(1);

  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const { particlesCanvasRef, startEmberDrift, stopEmberDrift } = useEmberDrift();

  const { celebrate } = useJackpotCelebration();

  const effectiveTotalPages = Math.max(1, totalPages);

  const getIconSrc = useCallback(
    (perk?: Perk) => getPerkIconUrl(perk, backendBase) || '',
    [backendBase]
  );

  const drawUnifiedWheel = useCallback(() => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawWheel(ctx, canvas.width, {
      phase: wheelPhaseRef.current,
      angle: wheelAngleRef.current,
      activePage: activePageRef.current,
      effectiveTotalPages,
      lastPagePerks,
      perksPerPage,
      sortedPerks,
      activeMutator,
      role,
      getIconSrc,
      imageCache: imageCacheRef.current,
    });
  }, [effectiveTotalPages, lastPagePerks, perksPerPage, sortedPerks, activeMutator, role, getIconSrc]);

  useEffect(() => {
    sortedPerks.forEach((perk) => {
      const src = getIconSrc(perk);
      if (src && !imageCacheRef.current.has(src)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        img.onload = () => drawUnifiedWheel();
        imageCacheRef.current.set(src, img);
      }
    });
  }, [sortedPerks, getIconSrc, drawUnifiedWheel]);

  useEffect(() => {
    drawUnifiedWheel();
  }, [drawUnifiedWheel, selectedPageUI, sortedPerks, activeMutator, wheelPhase]);

  // With exactly one page, the "page wheel" is a single 360-degree slice --
  // one solid color with nothing to differentiate and nothing for a spin to
  // visibly change. Skip it entirely and show the real per-perk wheel (with
  // actual slice colors and icons) from the start instead of a wheel that
  // looks broken for anyone with a small playable pool.
  useEffect(() => {
    if (effectiveTotalPages <= 1 && wheelPhaseRef.current !== 'perk') {
      wheelPhaseRef.current = 'perk';
      activePageRef.current = 1;
      setWheelPhase('perk');
      setSelectedPageUI(1);
    }
  }, [effectiveTotalPages]);

  // The Wheel now stays mounted across a Survivor/Killer role switch (see
  // GeneratorPage's key) instead of being torn down and rebuilt, so it no
  // longer gets a fresh `activePageRef`/`wheelPhase` for free. Without this,
  // a page landed on for the old role (its label, its slice count) would
  // keep showing after the switch until the next spin recomputed it -- back
  // to the page wheel and a clean angle, same starting point a fresh mount
  // would have given it.
  useEffect(() => {
    if (isSpinning) return;
    wheelAngleRef.current = 0;
    setStatusText('');
    if (effectiveTotalPages > 1) {
      wheelPhaseRef.current = 'page';
      activePageRef.current = 1;
      setWheelPhase('page');
      setSelectedPageUI(1);
    } else {
      wheelPhaseRef.current = 'perk';
      activePageRef.current = 1;
      setWheelPhase('perk');
      setSelectedPageUI(1);
    }
  }, [role]);

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const runSpinTween = (
    startAngle: number,
    finalAngle: number,
    durationMs: number
  ): Promise<void> => {
    const startTime = performance.now();
    return new Promise<void>((resolve) => {
      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        wheelAngleRef.current = startAngle + (finalAngle - startAngle) * easeOut;
        drawUnifiedWheel();

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          wheelAngleRef.current = finalAngle % (2 * Math.PI);
          drawUnifiedWheel();
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  };

  const handleStartSpin = async () => {
    if (isSpinning || sortedPerks.length === 0) return;
    setIsSpinning(true);
    if (!reduceMotion) startEmberDrift();

    try {
      const totalDurationMs = Math.max(1500, spinDurationSec * 1000);
      const pageSpinDuration = reduceMotion ? Math.min(500, totalDurationMs * 0.45) : totalDurationMs * 0.45;
      const perkSpinDuration = reduceMotion ? Math.min(500, totalDurationMs * 0.55) : totalDurationMs * 0.55;
      // Reduced motion still spins -- it just does one fast rotation
      // instead of several. Skipping the animation entirely (as an earlier
      // version did) made the whole draw look like nothing happened at all,
      // which defeats the point of a "Wheel" mode.
      const pageRotations = reduceMotion ? 1 : 4;
      const perkRotations = reduceMotion ? 1 : 5;
      const morphWaitMs = reduceMotion ? 100 : 250;

      const targetPage = Math.floor(Math.random() * effectiveTotalPages) + 1;
      const maxSlotsOnPage = Math.max(
        1,
        targetPage === effectiveTotalPages ? lastPagePerks || perksPerPage : perksPerPage
      );

      const pagePerksWithSlot: { slot: number; perk: Perk }[] = [];
      for (let s = 1; s <= maxSlotsOnPage; s++) {
        const idx = (targetPage - 1) * perksPerPage + (s - 1);
        const perk = sortedPerks[idx];
        if (perk) pagePerksWithSlot.push({ slot: s, perk });
      }

      const targetSlot = pickTargetSlot(pagePerksWithSlot, maxSlotsOnPage, activeMutator);

      const targetIndex = (targetPage - 1) * perksPerPage + (targetSlot - 1);
      const targetPerk = sortedPerks[targetIndex] || sortedPerks[0];

      if (effectiveTotalPages > 1) {
        wheelPhaseRef.current = 'page';
        setWheelPhase('page');
        setStatusText(
          dict.generator.spinningPageWheel
            ? formatMessage(dict.generator.spinningPageWheel, { slot: activeSlotIdx + 1 })
            : `Spinning Page Wheel for Slot #${activeSlotIdx + 1}...`
        );

        const pageSliceAngle = (2 * Math.PI) / effectiveTotalPages;
        const pageTargetAngle = (3 * Math.PI) / 2 - (targetPage - 1) * pageSliceAngle - pageSliceAngle / 2;
        const pageStartAngle = wheelAngleRef.current;
        const pageFinalAngle =
          pageStartAngle + pageRotations * 2 * Math.PI + (pageTargetAngle - (pageStartAngle % (2 * Math.PI)));

        await runSpinTween(pageStartAngle, pageFinalAngle, pageSpinDuration);
        if (!isMountedRef.current) return;

        activePageRef.current = targetPage;
        setSelectedPageUI(targetPage);
        setStatusText(
          dict.generator.landedPage
            ? formatMessage(dict.generator.landedPage, { page: targetPage })
            : `Landed on Page ${targetPage}! Swapping to Perk Wheel...`
        );

        setIsMorphing(true);
        await new Promise((res) => setTimeout(res, morphWaitMs));
        if (!isMountedRef.current) return;

        wheelPhaseRef.current = 'perk';
        setWheelPhase('perk');
        wheelAngleRef.current = 0;
        drawUnifiedWheel();

        setIsMorphing(false);
        await new Promise((res) => setTimeout(res, morphWaitMs));
        if (!isMountedRef.current) return;
      } else {
        // Only one page exists -- there's nothing meaningful for a page
        // wheel to spin (a single 360-degree slice looks identical at any
        // rotation), so skip straight to the real per-perk wheel.
        activePageRef.current = targetPage;
        wheelPhaseRef.current = 'perk';
        setWheelPhase('perk');
        setSelectedPageUI(targetPage);
        wheelAngleRef.current = 0;
        drawUnifiedWheel();
      }

      setStatusText(
        dict.generator.spinningPerkWheel
          ? formatMessage(dict.generator.spinningPerkWheel, { page: targetPage })
          : `Spinning Perk Wheel (Page ${targetPage})...`
      );

      const perkSliceAngle = (2 * Math.PI) / maxSlotsOnPage;
      const perkTargetAngle = (3 * Math.PI) / 2 - (targetSlot - 1) * perkSliceAngle - perkSliceAngle / 2;
      const perkStartAngle = 0;
      const perkFinalAngle =
        perkStartAngle + perkRotations * 2 * Math.PI + (perkTargetAngle - (perkStartAngle % (2 * Math.PI)));

      await runSpinTween(perkStartAngle, perkFinalAngle, perkSpinDuration);
      if (!isMountedRef.current) return;

      stopEmberDrift();
      setIsSpinning(false);
      setStatusText(targetPerk ? `${targetPerk.name} [P${targetPage}/S${targetSlot}]` : '');
      celebrate(role, wheelWrapperRef.current);

      if (targetPerk) {
        onWinSlot({ page: targetPage, slot: targetSlot, perk: targetPerk });
      }
    } catch (err) {
      // Guarantees the button never gets stuck permanently disabled on an
      // unexpected error -- without this, isSpinning could stay true
      // forever with no visible feedback, which looks exactly like "the
      // button does nothing."
      console.error('Wheel spin failed:', err);
      if (isMountedRef.current) {
        stopEmberDrift();
        setIsSpinning(false);
        setIsMorphing(false);
        setStatusText('');
      }
    }
  };

  const spinButtonText = isSpinning
    ? dict.generator.spinningWheel
    : `${dict.generator.spinWheelButton} #${activeSlotIdx + 1}`;

  return {
    isSpinning,
    isMorphing,
    statusText,
    reduceMotion,
    wheelCanvasRef,
    particlesCanvasRef,
    wheelWrapperRef,
    spinButtonText,
    handleStartSpin,
  };
}
