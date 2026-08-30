// frontend/src/components/generator/modes/WheelStage.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play } from 'lucide-react';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { getPerkIconUrl } from '@/utils/perkUtils';
import { isPerkBlockedByMutator, filterPerksByMutator } from '../lib/perkPicker';

export interface WheelStageProps {
  totalPages: number;
  perksPerPage: number;
  lastPagePerks: number;
  spinDurationSec: number;
  role: RoleCategory;
  sortedPerks: Perk[];
  activeSlotIdx: number;
  activeMutator: ChaosMutator | null;
  onWinSlot: (wonData: DrawnSlot) => void;
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
  activeSlotIdx,
  onWinSlot,
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
  const isMountedRef = useRef<boolean>(true);

  const wheelAngleRef = useRef<number>(0);
  const wheelPhaseRef = useRef<'page' | 'perk'>('page');
  const activePageRef = useRef<number>(1);

  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const particleListRef = useRef<Particle[]>([]);
  const particleAnimFrameRef = useRef<number | null>(null);
  const emberAnimFrameRef = useRef<number | null>(null);

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

    const rimGrad = ctx.createRadialGradient(centerX, centerY, radius - 10, centerX, centerY, radius + spikeHeight);
    rimGrad.addColorStop(0, '#7f1d1d');
    rimGrad.addColorStop(1, '#1a0303');
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#450a0a';
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
          grad.addColorStop(0, '#3b0a0a');
          grad.addColorStop(1, '#170303');
        } else {
          grad.addColorStop(0, '#4c0f0f');
          grad.addColorStop(1, '#0f0202');
        }

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#7f1d1d';
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

  useEffect(() => {
    return () => {
      if (particleAnimFrameRef.current !== null) {
        cancelAnimationFrame(particleAnimFrameRef.current);
      }
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

  const triggerParticleBurst = useCallback(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;
    const count = 65;

    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 9 + 3;
      newParticles.push({
        x: width / 2,
        y: height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 7 + 2,
        alpha: 1.0,
        color: role === 'Survivor' ? '#10b981' : '#f43f5e',
      });
    }
    particleListRef.current = newParticles;

    const renderParticles = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      let alive = false;
      for (const p of particleListRef.current) {
        if (p.alpha > 0.02) {
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.alpha *= 0.93;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;

      if (alive) {
        particleAnimFrameRef.current = requestAnimationFrame(renderParticles);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    if (particleAnimFrameRef.current) cancelAnimationFrame(particleAnimFrameRef.current);
    renderParticles();
  }, [role]);

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
  }, []);

  const handleStartSpin = async () => {
    if (isSpinning || sortedPerks.length === 0) return;
    setIsSpinning(true);
    if (!reduceMotion) startEmberDrift();

    const totalDurationMs = Math.max(1500, spinDurationSec * 1000);
    const pageSpinDuration = totalDurationMs * 0.45;
    const perkSpinDuration = totalDurationMs * 0.55;

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
    const pageFinalAngle = pageStartAngle + 4 * 2 * Math.PI + (pageTargetAngle - (pageStartAngle % (2 * Math.PI)));
    const pageStartTime = performance.now();

    if (reduceMotion) {
      wheelAngleRef.current = pageFinalAngle % (2 * Math.PI);
      drawUnifiedWheel();
    } else {
      await new Promise<void>((resolve) => {
        const animatePage = (now: number) => {
          const elapsed = now - pageStartTime;
          const progress = Math.min(elapsed / pageSpinDuration, 1);
          const easeOut = 1 - Math.pow(1 - progress, 3);

          wheelAngleRef.current = pageStartAngle + (pageFinalAngle - pageStartAngle) * easeOut;
          drawUnifiedWheel();

          if (progress < 1) {
            requestAnimationFrame(animatePage);
          } else {
            wheelAngleRef.current = pageFinalAngle % (2 * Math.PI);
            drawUnifiedWheel();
            resolve();
          }
        };
        requestAnimationFrame(animatePage);
      });
    }
    if (!isMountedRef.current) return;

    activePageRef.current = targetPage;
    setSelectedPageUI(targetPage);
    setStatusText(
      dict?.generator?.landedPage
        ? dict.generator.landedPage.replace('{page}', String(targetPage))
        : `Landed on Page ${targetPage}! Swapping to Perk Wheel...`
    );

    setIsMorphing(true);
    await new Promise((res) => setTimeout(res, 250));
    if (!isMountedRef.current) return;

    wheelPhaseRef.current = 'perk';
    setWheelPhase('perk');
    wheelAngleRef.current = 0;
    drawUnifiedWheel();

    setIsMorphing(false);
    await new Promise((res) => setTimeout(res, 250));
    if (!isMountedRef.current) return;

    setStatusText(
      dict?.generator?.spinningPerkWheel
        ? dict.generator.spinningPerkWheel.replace('{page}', String(targetPage))
        : `Spinning Perk Wheel (Page ${targetPage})...`
    );

    const perkSliceAngle = (2 * Math.PI) / maxSlotsOnPage;
    const perkTargetAngle = (3 * Math.PI) / 2 - (targetSlot - 1) * perkSliceAngle - perkSliceAngle / 2;
    const perkStartAngle = 0;
    const perkFinalAngle = perkStartAngle + 5 * 2 * Math.PI + (perkTargetAngle - (perkStartAngle % (2 * Math.PI)));
    const perkStartTime = performance.now();

    if (reduceMotion) {
      wheelAngleRef.current = perkFinalAngle % (2 * Math.PI);
      drawUnifiedWheel();
    } else {
      await new Promise<void>((resolve) => {
        const animatePerk = (now: number) => {
          const elapsed = now - perkStartTime;
          const progress = Math.min(elapsed / perkSpinDuration, 1);
          const easeOut = 1 - Math.pow(1 - progress, 4);

          wheelAngleRef.current = perkStartAngle + (perkFinalAngle - perkStartAngle) * easeOut;
          drawUnifiedWheel();

          if (progress < 1) {
            requestAnimationFrame(animatePerk);
          } else {
            wheelAngleRef.current = perkFinalAngle % (2 * Math.PI);
            drawUnifiedWheel();
            resolve();
          }
        };
        requestAnimationFrame(animatePerk);
      });
    }
    if (!isMountedRef.current) return;

    stopEmberDrift();
    setIsSpinning(false);
    setStatusText(targetPerk ? `${targetPerk.name} [P${targetPage}/S${targetSlot}]` : '');
    triggerParticleBurst();

    if (targetPerk) {
      onWinSlot({ page: targetPage, slot: targetSlot, perk: targetPerk });
    }
  };

  const spinButtonText = isSpinning
    ? dict?.generator?.spinningWheel || 'Spinning Wheel...'
    : `${dict?.generator?.spinWheelButton || 'Spin for Perk Slot'} #${activeSlotIdx + 1}`;

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      <div className="relative flex items-center justify-center w-full">
        <canvas
          ref={particlesCanvasRef}
          width={800}
          height={800}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        />
        <div
          className={`w-full max-w-[440px] sm:max-w-[520px] aspect-square transition-all duration-500 ease-out transform ${
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

      <button
        type="button"
        onClick={handleStartSpin}
        disabled={isSpinning || sortedPerks.length === 0}
        className={`mt-6 flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-base tracking-wider uppercase shadow-2xl transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
          isSpinning || sortedPerks.length === 0
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
            : role === 'Survivor'
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
              : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
        }`}
      >
        <Play className={`h-5 w-5 fill-current ${isSpinning && !reduceMotion ? 'animate-spin' : ''}`} />
        <span>{spinButtonText}</span>
      </button>

      {statusText && (
        <p aria-live="polite" className={`mt-3 text-xs font-black text-amber-400 font-mono ${reduceMotion ? '' : 'animate-pulse'}`}>
          {statusText}
        </p>
      )}
    </div>
  );
};
