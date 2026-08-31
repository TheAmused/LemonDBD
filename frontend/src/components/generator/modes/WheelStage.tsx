// frontend/src/components/generator/modes/WheelStage.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play } from 'lucide-react';
import { DbdButton } from '../shared/DbdButton';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { getPerkIconUrl } from '@/utils/perkUtils';
import { isPerkBlockedByMutator, filterPerksByMutator } from '../lib/perkPicker';
import { getSlotInteraction } from '../lib/blindnessCurse';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';

export interface WheelStageProps {
  totalPages: number;
  perksPerPage: number;
  lastPagePerks: number;
  spinDurationSec: number;
  role: RoleCategory;
  sortedPerks: Perk[];
  loadout: (DrawnSlot | null)[];
  activeSlotIdx: number;
  activeMutator: ChaosMutator | null;
  onWinSlot: (wonData: DrawnSlot) => void;
  revealedSlots: boolean[];
  onRevealSlot: (idx: number) => void;
  onSelectPerk: (perk: Perk) => void;
  isBlind?: boolean;
  dict?: Dictionary;
  backendBase?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

export const WheelStage: React.FC<WheelStageProps> = ({
  totalPages,
  perksPerPage,
  lastPagePerks,
  spinDurationSec,
  role,
  sortedPerks,
  loadout,
  activeSlotIdx,
  onWinSlot,
  revealedSlots,
  onRevealSlot,
  onSelectPerk,
  isBlind = false,
  dict,
  backendBase,
  activeMutator,
}) => {
  const [wheelPhase, setWheelPhase] = useState<'page' | 'perk'>('page');
  const [selectedPageUI, setSelectedPageUI] = useState<number>(1);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [isMorphing, setIsMorphing] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');
  const [reduceMotion, setReduceMotion] = useState(false);

  const wheelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wheelWrapperRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const wheelAngleRef = useRef<number>(0);
  const wheelPhaseRef = useRef<'page' | 'perk'>('page');
  const activePageRef = useRef<number>(1);

  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const emberAnimFrameRef = useRef<number | null>(null);

  const { flavorLine, celebrate } = useJackpotCelebration(dict);

  const effectiveTotalPages = Math.max(1, totalPages);

  const getIconSrc = useCallback(
    (perk?: Perk) => getPerkIconUrl(perk, backendBase) || '',
    [backendBase]
  );

  const drawThornedRim = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
    const spikeCount = 28;
    const spikeAngle = (2 * Math.PI) / spikeCount;
    const spikeHeight = 14;

    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < spikeCount; i++) {
      const baseAngle1 = i * spikeAngle;
      const baseAngle2 = baseAngle1 + spikeAngle * 0.5;
      const tipAngle = baseAngle1 + spikeAngle * 0.25;

      const x1 = centerX + Math.cos(baseAngle1) * radius;
      const y1 = centerY + Math.sin(baseAngle1) * radius;
      const xTip = centerX + Math.cos(tipAngle) * (radius + spikeHeight);
      const yTip = centerY + Math.sin(tipAngle) * (radius + spikeHeight);
      const x2 = centerX + Math.cos(baseAngle2) * radius;
      const y2 = centerY + Math.sin(baseAngle2) * radius;

      if (i === 0) ctx.moveTo(x1, y1);
      else ctx.lineTo(x1, y1);
      ctx.lineTo(xTip, yTip);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();

    // Without this inner circle subpath + evenodd fill, the zig-zag path
    // above has no hole -- ctx.fill() would flood the ENTIRE disk (center
    // to spike tips) with the rim gradient, painting over every slice,
    // badge, and hub drawn earlier in the same pass. That's what silently
    // reduced the whole wheel to a solid circle with nothing visible on it.
    ctx.moveTo(centerX + (radius - 10), centerY);
    ctx.arc(centerX, centerY, radius - 10, 0, Math.PI * 2);
    ctx.closePath();

    const rimGrad = ctx.createRadialGradient(centerX, centerY, radius - 10, centerX, centerY, radius + spikeHeight);
    rimGrad.addColorStop(0, '#961f1f');
    rimGrad.addColorStop(1, '#1a0303');
    ctx.fillStyle = rimGrad;
    ctx.fill('evenodd');
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#5c1414';
    ctx.stroke();
    ctx.restore();
  };

  const drawUnifiedWheel = useCallback(() => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const radius = size / 2 - 32;
    const centerX = size / 2;
    const centerY = size / 2;

    ctx.clearRect(0, 0, size, size);

    if (wheelPhaseRef.current === 'page') {
      const sliceAngle = (2 * Math.PI) / effectiveTotalPages;

      for (let i = 0; i < effectiveTotalPages; i++) {
        const angle = wheelAngleRef.current + i * sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
        ctx.closePath();

        const grad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, radius);
        if (i % 2 === 0) {
          grad.addColorStop(0, '#4a0d0d');
          grad.addColorStop(1, '#1c0404');
        } else {
          grad.addColorStop(0, '#5c1414');
          grad.addColorStop(1, '#1a0505');
        }

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#a3232f';
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        const midAngle = angle + sliceAngle / 2;
        ctx.rotate(midAngle);

        const badgeRadiusPos = radius - 75;

        ctx.beginPath();
        ctx.arc(badgeRadiusPos, 0, 28, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#f59e0b';
        ctx.stroke();

        ctx.font = '900 18px system-ui, sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`P${i + 1}`, badgeRadiusPos, 1);

        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, 58, 0, 2 * Math.PI);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#f59e0b';
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = '900 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAGE WHEEL', centerX, centerY);

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 4, 0, 2 * Math.PI);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#dc2626';
      ctx.stroke();
      drawThornedRim(ctx, centerX, centerY, radius);
    } else {
      const pageNumber = activePageRef.current;
      const maxSlotsOnPage = Math.max(
        1,
        pageNumber === effectiveTotalPages ? lastPagePerks || perksPerPage : perksPerPage
      );
      const sliceAngle = (2 * Math.PI) / maxSlotsOnPage;

      for (let i = 0; i < maxSlotsOnPage; i++) {
        const angle = wheelAngleRef.current + i * sliceAngle;
        const index = (pageNumber - 1) * perksPerPage + i;
        const perk = sortedPerks[index] || sortedPerks[index % Math.max(1, sortedPerks.length)];
        const isBlocked = isPerkBlockedByMutator(perk, activeMutator);

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
        ctx.closePath();

        const grad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, radius);
        if (isBlocked) {
          grad.addColorStop(0, '#1f1924');
          grad.addColorStop(1, '#0f0a12');
        } else if (role === 'Survivor') {
          grad.addColorStop(0, i % 2 === 0 ? '#064e3b' : '#022c22');
          grad.addColorStop(1, i % 2 === 0 ? '#022c22' : '#0f172a');
        } else {
          grad.addColorStop(0, i % 2 === 0 ? '#881337' : '#4c0519');
          grad.addColorStop(1, i % 2 === 0 ? '#4c0519' : '#0f172a');
        }

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = isBlocked ? '#e11d48' : role === 'Survivor' ? '#047857' : '#be123c';
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        const midAngle = angle + sliceAngle / 2;
        ctx.rotate(midAngle + Math.PI / 2);

        const iconSrc = getIconSrc(perk);
        const imgObj = iconSrc ? imageCacheRef.current.get(iconSrc) : undefined;
        const iconSize = 72;
        const iconRadiusPos = -(radius - 85);

        if (imgObj && imgObj.complete && imgObj.naturalWidth > 0) {
          ctx.save();
          if (isBlocked) ctx.globalAlpha = 0.25;

          ctx.shadowColor = role === 'Survivor' ? '#10b981' : '#f43f5e';
          ctx.shadowBlur = 16;

          ctx.drawImage(imgObj, -iconSize / 2, iconRadiusPos - iconSize / 2, iconSize, iconSize);
          ctx.restore();
        } else {
          ctx.save();
          ctx.translate(0, iconRadiusPos);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = isBlocked ? '#4c0519' : role === 'Survivor' ? '#047857' : '#9f1239';
          ctx.fillRect(-24, -24, 48, 48);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(-24, -24, 48, 48);
          ctx.restore();

          ctx.font = '900 16px system-ui, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText((perk?.name || 'P').charAt(0).toUpperCase(), 0, iconRadiusPos);
        }

        if (isBlocked) {
          ctx.font = 'bold 24px sans-serif';
          ctx.fillStyle = '#f43f5e';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚫', 0, iconRadiusPos);
        }

        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, 62, 0, 2 * Math.PI);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = role === 'Survivor' ? '#10b981' : '#f43f5e';
      ctx.stroke();

      ctx.fillStyle = role === 'Survivor' ? '#34d399' : '#fb7185';
      ctx.font = '900 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`PAGE ${pageNumber}`, centerX, centerY - 10);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText(`${maxSlotsOnPage} PERKS`, centerX, centerY + 12);

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 4, 0, 2 * Math.PI);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#dc2626';
      ctx.stroke();
      drawThornedRim(ctx, centerX, centerY, radius);
    }

    // Top Pointer: a dripping 3-claw shape instead of a single triangle
    ctx.beginPath();
    ctx.moveTo(centerX - 22, 2);
    ctx.lineTo(centerX - 14, 2);
    ctx.lineTo(centerX - 9, 30);
    ctx.lineTo(centerX - 3, 8);
    ctx.lineTo(centerX, 46);
    ctx.lineTo(centerX + 3, 8);
    ctx.lineTo(centerX + 9, 30);
    ctx.lineTo(centerX + 14, 2);
    ctx.lineTo(centerX + 22, 2);
    ctx.closePath();
    ctx.fillStyle = '#b91c1c';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1a0303';
    ctx.stroke();
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

  useEffect(() => {
    return () => {
      if (emberAnimFrameRef.current !== null) {
        cancelAnimationFrame(emberAnimFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const startEmberDrift = useCallback(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;

    const spawnEmber = (): Particle => ({
      x: width / 2 + (Math.random() - 0.5) * width * 0.7,
      y: height / 2 + (Math.random() - 0.5) * height * 0.7,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -Math.random() * 1.2 - 0.3,
      size: Math.random() * 3 + 1,
      alpha: Math.random() * 0.4 + 0.2,
      color: Math.random() > 0.5 ? '#f97316' : '#dc2626',
    });

    const embers: Particle[] = Array.from({ length: 40 }, spawnEmber);

    // Deliberately does NOT check the `isSpinning` state variable here --
    // calling startEmberDrift() synchronously right after setIsSpinning(true)
    // would close over the pre-update value of isSpinning (still false from
    // the render that scheduled this call), stopping the loop on its very
    // first frame. This loop runs until explicitly cancelled via
    // stopEmberDrift() instead.
    const renderEmbers = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      embers.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha *= 0.995;
        if (p.alpha < 0.05 || p.y < 0) {
          embers[i] = spawnEmber();
          return;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      emberAnimFrameRef.current = requestAnimationFrame(renderEmbers);
    };

    renderEmbers();
  }, []);

  const stopEmberDrift = useCallback(() => {
    if (emberAnimFrameRef.current !== null) {
      cancelAnimationFrame(emberAnimFrameRef.current);
      emberAnimFrameRef.current = null;
    }
    const canvas = particlesCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
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

      const allowedPerks = filterPerksByMutator(pagePerksWithSlot.map((e) => e.perk), activeMutator);
      const allowedSlots = pagePerksWithSlot
        .filter((e) => allowedPerks.includes(e.perk))
        .map((e) => e.slot);

      const targetSlot =
        allowedSlots.length > 0
          ? allowedSlots[Math.floor(Math.random() * allowedSlots.length)]
          : Math.floor(Math.random() * maxSlotsOnPage) + 1;

      const targetIndex = (targetPage - 1) * perksPerPage + (targetSlot - 1);
      const targetPerk = sortedPerks[targetIndex] || sortedPerks[0];

      if (effectiveTotalPages > 1) {
        wheelPhaseRef.current = 'page';
        setWheelPhase('page');
        setStatusText(
          dict?.generator?.spinningPageWheel
            ? dict.generator.spinningPageWheel.replace('{slot}', String(activeSlotIdx + 1))
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
          dict?.generator?.landedPage
            ? dict.generator.landedPage.replace('{page}', String(targetPage))
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
        dict?.generator?.spinningPerkWheel
          ? dict.generator.spinningPerkWheel.replace('{page}', String(targetPage))
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

  const renderFlankSlot = (idx: number) => {
    const slotData = loadout[idx];
    const perk = slotData?.perk;
    const { isObscured, onClick } = getSlotInteraction(
      idx,
      perk,
      activeMutator,
      revealedSlots,
      onRevealSlot,
      onSelectPerk
    );

    return (
      <PerkSlot
        key={idx}
        perk={perk}
        role={role}
        page={slotData?.page}
        slot={slotData?.slot}
        isActive={activeSlotIdx === idx}
        isObscured={isObscured}
        isBlind={isBlind}
        onClick={onClick}
        dict={dict}
      />
    );
  };

  const spinButtonText = isSpinning
    ? dict?.generator?.spinningWheel || 'Spinning Wheel...'
    : `${dict?.generator?.spinWheelButton || 'Spin for Perk Slot'} #${activeSlotIdx + 1}`;

  return (
    <div className="flex h-full w-full flex-1 flex-col items-center justify-center gap-4">
      <p className="max-w-lg text-center text-sm font-bold text-slate-300 sm:text-base">
        {dict?.generator?.spinOrRollPrompt ||
          'Spin the Page Wheel to land on a random page, then the Perk Wheel to land on a random perk from it -- one slot at a time until all four are filled.'}
      </p>

      <div className="flex w-full flex-1 min-h-0 flex-col items-center justify-center gap-6 lg:flex-row lg:items-center lg:justify-center lg:gap-10 xl:gap-16">
      <div className="order-2 grid grid-cols-2 gap-3 lg:order-1 lg:grid-cols-1 lg:gap-4">
        {renderFlankSlot(0)}
        {renderFlankSlot(1)}
      </div>

      <div ref={wheelWrapperRef} className="order-1 flex flex-col items-center lg:order-2">
        <div className="relative flex items-center justify-center w-full">
          <canvas
            ref={particlesCanvasRef}
            width={800}
            height={800}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          />
          <div
            className={`w-full max-w-[360px] sm:max-w-[440px] md:max-w-[520px] lg:max-w-[560px] xl:max-w-[640px] 2xl:max-w-[720px] aspect-square transition-all duration-500 ease-out transform ${
              isMorphing && !reduceMotion ? 'scale-75 opacity-0 rotate-[180deg]' : 'scale-100 opacity-100 rotate-0'
            }`}
          >
            <canvas
              ref={wheelCanvasRef}
              width={800}
              height={800}
              className={`h-full w-full ${
                role === 'Survivor'
                  ? 'drop-shadow-[0_0_30px_rgba(16,185,129,0.35)]'
                  : 'drop-shadow-[0_0_30px_rgba(244,63,94,0.35)]'
              }`}
            />
          </div>
        </div>

        <DbdButton
          role={role}
          size="md"
          onClick={handleStartSpin}
          disabled={isSpinning || sortedPerks.length === 0}
          className="mt-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          icon={<Play className={`h-5 w-5 fill-current ${isSpinning && !reduceMotion ? 'animate-spin' : ''}`} />}
        >
          {spinButtonText}
        </DbdButton>

        {statusText && (
          <p aria-live="polite" className={`mt-3 text-xs font-black text-amber-400 font-mono ${reduceMotion ? '' : 'animate-pulse'}`}>
            {statusText}
          </p>
        )}

        <div aria-live="polite" className="mt-2 text-xs font-black text-amber-400 text-center">
          {flavorLine}
        </div>
      </div>

      <div className="order-3 grid grid-cols-2 gap-3 lg:order-3 lg:grid-cols-1 lg:gap-4">
        {renderFlankSlot(2)}
        {renderFlankSlot(3)}
      </div>
      </div>
    </div>
  );
};
