'use client';
// frontend/src/components/WheelOfFortune.tsx

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { Perk, RoleCategory, PerkDictionary } from '@/types/perks';
import { ChaosMutator, WheelWinSlotPayload } from '@/types/chaos';
import { EXHAUSTION_PERK_NAMES, MEME_PERK_NAMES } from '@/constants/chaosMutators';
import { getPerkIconUrl } from '@/utils/perkUtils';

export { EXHAUSTION_PERK_NAMES, MEME_PERK_NAMES };

interface WheelOfFortuneProps {
  totalPages: number;
  perksPerPage: number;
  lastPagePerks: number;
  spinDurationSec: number;
  role: RoleCategory;
  sortedPerks: Perk[];
  activeSlotIdx: number;
  onWinSlot: (wonData: WheelWinSlotPayload) => void;
  dict?: PerkDictionary | any;
  backendBase?: string;
  activeMutator?: ChaosMutator | null;
  onOpenChaosModal?: () => void;
  onResetWheels?: () => void;
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

export const WheelOfFortune: React.FC<WheelOfFortuneProps> = ({
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
  onOpenChaosModal,
  onResetWheels,
}) => {
  const [wheelPhase, setWheelPhase] = useState<'page' | 'perk'>('page');
  const [selectedPageUI, setSelectedPageUI] = useState<number>(1);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [isMorphing, setIsMorphing] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');

  const wheelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const wheelAngleRef = useRef<number>(0);
  const wheelPhaseRef = useRef<'page' | 'perk'>('page');
  const activePageRef = useRef<number>(1);

  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const particleListRef = useRef<Particle[]>([]);
  const particleAnimFrameRef = useRef<number | null>(null);

  const effectiveTotalPages = Math.max(1, totalPages);

  const getIconSrc = useCallback(
    (perk?: Perk) => {
      return getPerkIconUrl(perk, backendBase) || '';
    },
    [backendBase]
  );

  const isPerkBlockedByMutator = useCallback(
    (perk?: Perk) => {
      if (!perk || !activeMutator) return false;
      if (activeMutator.id === 'no_exhaustion') {
        const pNameLower = perk.name.toLowerCase().trim();
        const pDescLower = (perk.description || '').toLowerCase();
        return (
          EXHAUSTION_PERK_NAMES.has(pNameLower) ||
          pDescLower.includes('exhausted') ||
          pDescLower.includes('exhaustion')
        );
      }
      return false;
    },
    [activeMutator]
  );

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
          grad.addColorStop(0, '#1e293b');
          grad.addColorStop(1, '#0f172a');
        } else {
          grad.addColorStop(0, '#334155');
          grad.addColorStop(1, '#1e293b');
        }

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#475569';
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
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#f59e0b';
      ctx.stroke();
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
        const isBlocked = isPerkBlockedByMutator(perk);

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
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.lineWidth = 10;
      ctx.strokeStyle = role === 'Survivor' ? '#10b981' : '#f43f5e';
      ctx.stroke();
    }

    // Top Pointer Arrow
    ctx.beginPath();
    ctx.moveTo(centerX - 22, 2);
    ctx.lineTo(centerX + 22, 2);
    ctx.lineTo(centerX, 42);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }, [
    effectiveTotalPages,
    lastPagePerks,
    perksPerPage,
    sortedPerks,
    isPerkBlockedByMutator,
    role,
    getIconSrc,
  ]);

  useEffect(() => {
    sortedPerks.forEach((perk) => {
      const src = getIconSrc(perk);
      if (src && !imageCacheRef.current.has(src)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        img.onload = () => {
          drawUnifiedWheel();
        };
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

    if (particleAnimFrameRef.current) {
      cancelAnimationFrame(particleAnimFrameRef.current);
    }
    renderParticles();
  }, [role]);

  const handleStartSpin = async () => {
    if (isSpinning || sortedPerks.length === 0) return;
    setIsSpinning(true);

    const totalDurationMs = Math.max(1500, spinDurationSec * 1000);
    const pageSpinDuration = totalDurationMs * 0.45;
    const perkSpinDuration = totalDurationMs * 0.55;

    const targetPage = Math.floor(Math.random() * effectiveTotalPages) + 1;
    const maxSlotsOnPage = Math.max(
      1,
      targetPage === effectiveTotalPages ? lastPagePerks || perksPerPage : perksPerPage
    );

    const isHexOrBoonPerk = (p?: Perk) => {
      if (!p) return false;
      const name = p.name.toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return name.includes('hex:') || name.includes('boon:') || desc.includes('hex:') || desc.includes('boon:');
    };

    const isMemePerk = (p?: Perk) => {
      if (!p) return false;
      const name = p.name.toLowerCase().trim();
      return MEME_PERK_NAMES.has(name);
    };

    const validSlotsOnPage: number[] = [];
    for (let s = 1; s <= maxSlotsOnPage; s++) {
      const idx = (targetPage - 1) * perksPerPage + (s - 1);
      const perk = sortedPerks[idx];
      if (!perk) continue;

      if (isPerkBlockedByMutator(perk)) continue;

      if (activeMutator?.id === 'hex_boon_only') {
        if (isHexOrBoonPerk(perk)) validSlotsOnPage.push(s);
      } else if (activeMutator?.id === 'meme_loadout') {
        if (isMemePerk(perk)) validSlotsOnPage.push(s);
      } else {
        validSlotsOnPage.push(s);
      }
    }

    if (validSlotsOnPage.length === 0) {
      for (let s = 1; s <= maxSlotsOnPage; s++) {
        const idx = (targetPage - 1) * perksPerPage + (s - 1);
        const perk = sortedPerks[idx];
        if (perk && !isPerkBlockedByMutator(perk)) {
          validSlotsOnPage.push(s);
        }
      }
    }

    const targetSlot =
      validSlotsOnPage.length > 0
        ? validSlotsOnPage[Math.floor(Math.random() * validSlotsOnPage.length)]
        : Math.floor(Math.random() * maxSlotsOnPage) + 1;

    const targetIndex = (targetPage - 1) * perksPerPage + (targetSlot - 1);
    const targetPerk = sortedPerks[targetIndex] || sortedPerks[0];

    wheelPhaseRef.current = 'page';
    setWheelPhase('page');

    const pageSpinMsg = dict?.generator?.spinningPageWheel
      ? dict.generator.spinningPageWheel.replace('{slot}', String(activeSlotIdx + 1))
      : `Spinning Page Wheel for Slot #${activeSlotIdx + 1}...`;
    setStatusText(pageSpinMsg);

    const pageSliceAngle = (2 * Math.PI) / effectiveTotalPages;
    const pageTargetAngle =
      (3 * Math.PI) / 2 - (targetPage - 1) * pageSliceAngle - pageSliceAngle / 2;

    const pageStartAngle = wheelAngleRef.current;
    const pageFinalAngle =
      pageStartAngle + 4 * 2 * Math.PI + (pageTargetAngle - (pageStartAngle % (2 * Math.PI)));

    const pageStartTime = performance.now();

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

    activePageRef.current = targetPage;
    setSelectedPageUI(targetPage);

    const landedPageMsg = dict?.generator?.landedPage
      ? dict.generator.landedPage.replace('{page}', String(targetPage))
      : `Landed on Page ${targetPage}! Swapping to Perk Wheel...`;
    setStatusText(landedPageMsg);

    setIsMorphing(true);
    await new Promise((res) => setTimeout(res, 250));

    wheelPhaseRef.current = 'perk';
    setWheelPhase('perk');
    wheelAngleRef.current = 0;
    drawUnifiedWheel();

    setIsMorphing(false);
    await new Promise((res) => setTimeout(res, 250));

    const spinningPerkMsg = dict?.generator?.spinningPerkWheel
      ? dict.generator.spinningPerkWheel.replace('{page}', String(targetPage))
      : `Spinning Perk Wheel (Page ${targetPage})...`;
    setStatusText(spinningPerkMsg);

    const perkSliceAngle = (2 * Math.PI) / maxSlotsOnPage;
    const perkTargetAngle =
      (3 * Math.PI) / 2 - (targetSlot - 1) * perkSliceAngle - perkSliceAngle / 2;

    const perkStartAngle = 0;
    const perkFinalAngle =
      perkStartAngle + 5 * 2 * Math.PI + (perkTargetAngle - (perkStartAngle % (2 * Math.PI)));

    const perkStartTime = performance.now();

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

    setIsSpinning(false);
    setStatusText(
      targetPerk
        ? `${targetPerk.name} [P${targetPage}/S${targetSlot}]`
        : ''
    );
    triggerParticleBurst();

    if (targetPerk) {
      onWinSlot({
        page: targetPage,
        slot: targetSlot,
        perk: targetPerk,
        mutator: activeMutator || undefined,
      });
    }
  };

  const curseButtonText = activeMutator
    ? `${dict?.generator?.curseLabel || 'Curse'}: ${activeMutator.name}`
    : dict?.generator?.spinChaosCurse || 'Spin Chaos Curse';

  const phaseHeader =
    wheelPhase === 'page'
      ? dict?.generator?.phase1PageWheel
        ? dict.generator.phase1PageWheel.replace('{total}', String(effectiveTotalPages))
        : `Phase 1: Page Wheel (1 - ${effectiveTotalPages} Pages)`
      : dict?.generator?.phase2PerkWheel
        ? dict.generator.phase2PerkWheel.replace('{page}', String(selectedPageUI))
        : `Phase 2: Perk Wheel (Page ${selectedPageUI})`;

  const spinButtonText = isSpinning
    ? dict?.generator?.spinningWheel || 'Spinning Wheel...'
    : dict?.generator?.spinForSlot
      ? dict.generator.spinForSlot.replace('{slot}', String(activeSlotIdx + 1))
      : `${dict?.generator?.spinWheelButton || 'Spin for Perk Slot'} #${activeSlotIdx + 1}`;

  return (
    <div className="relative flex flex-col items-center justify-center w-full p-4 sm:p-6 bg-white/90 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 backdrop-blur-xl shadow-sm dark:shadow-2xl">
      {onOpenChaosModal && (
        <div className="relative group mb-3 z-30">
          <button
            type="button"
            onClick={onOpenChaosModal}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-xs font-black transition-all cursor-pointer shadow-sm dark:shadow-xl backdrop-blur-xl hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${activeMutator
                ? `${activeMutator.badgeBg} ${activeMutator.borderColor} ${activeMutator.textColor} border-2 scale-105 ring-2 ring-purple-500/40`
                : 'border-purple-500/30 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 shadow-purple-950/20'
              }`}
          >
            <span className="text-base animate-bounce">{activeMutator ? activeMutator.icon : '🔮'}</span>
            <span>{curseButtonText}</span>
          </button>

          {activeMutator && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:flex flex-col w-72 p-3.5 rounded-2xl bg-white/95 dark:bg-slate-950/95 border border-purple-500/60 text-slate-900 dark:text-slate-100 shadow-2xl z-50 text-xs backdrop-blur-2xl pointer-events-none">
              <div className="flex items-center gap-2 font-black text-purple-700 dark:text-purple-300 mb-1">
                <span className="text-base">{activeMutator.icon}</span>
                <span>{activeMutator.name}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                {activeMutator.description}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="relative flex flex-col items-center justify-center w-full">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 font-mono">
            {phaseHeader}
          </span>
        </div>

        <div className="relative flex items-center justify-center w-full">
          <canvas
            ref={particlesCanvasRef}
            width={800}
            height={800}
            className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          />

          <div
            className={`w-full max-w-[580px] sm:max-w-[640px] aspect-square transition-all duration-500 ease-out transform ${isMorphing ? 'scale-75 opacity-0 rotate-[180deg]' : 'scale-100 opacity-100 rotate-0'
              }`}
          >
            <canvas
              ref={wheelCanvasRef}
              width={800}
              height={800}
              className={`h-full w-full ${role === 'Survivor'
                  ? 'drop-shadow-[0_0_30px_rgba(16,185,129,0.35)]'
                  : 'drop-shadow-[0_0_30px_rgba(244,63,94,0.35)]'
                }`}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <button
            type="button"
            onClick={handleStartSpin}
            disabled={isSpinning || sortedPerks.length === 0}
            className={`flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-lg tracking-wider uppercase shadow-2xl transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${isSpinning || sortedPerks.length === 0
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                : role === 'Survivor'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:brightness-110 text-white shadow-emerald-950/40 active:scale-95'
                  : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:brightness-110 text-white shadow-rose-950/40 active:scale-95'
              }`}
          >
            <Play className={`h-6 w-6 fill-current ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{spinButtonText}</span>
          </button>

          {onResetWheels && (
            <button
              type="button"
              onClick={onResetWheels}
              disabled={isSpinning}
              className="flex items-center gap-2 px-6 py-5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 font-extrabold text-xs border border-rose-300 dark:border-rose-500/40 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              title={dict?.generator?.resetAllLabel || ''}
            >
              <RotateCcw className="h-4.5 w-4.5" />
              <span>{dict?.generator?.resetAllLabel || ''}</span>
            </button>
          )}
        </div>

        {statusText && (
          <p aria-live="polite" className="text-xs font-black text-amber-700 dark:text-amber-400 animate-pulse font-mono">
            {statusText}
          </p>
        )}
      </div>
    </div>
  );
};