'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Sparkles, Skull, Zap, Eye, Ban, Flame, RefreshCw } from 'lucide-react';
import { Perk } from './PerkCard';

export interface ChaosMutator {
  id: string;
  name: string;
  description: string;
  type: 'curse' | 'buff';
  icon: string;
  badgeBg: string;
  borderColor: string;
  textColor: string;
}

export const CHAOS_MUTATORS: ChaosMutator[] = [
  {
    id: 'blindness',
    name: 'Curse of Blindness',
    description: 'Perk icons and names are obscured during the trial! Rely on memory.',
    type: 'curse',
    icon: '👁️',
    badgeBg: 'bg-purple-950/80',
    borderColor: 'border-purple-500/60',
    textColor: 'text-purple-300',
  },
  {
    id: 'no_exhaustion',
    name: 'No Exhaustion Perks',
    description: 'Exhaustion perks are forbidden! If rolled, reroll or play without perks.',
    type: 'curse',
    icon: '🚫',
    badgeBg: 'bg-rose-950/80',
    borderColor: 'border-rose-500/60',
    textColor: 'text-rose-300',
  },
  {
    id: 'meme_loadout',
    name: 'Meme Loadout',
    description: 'Must run gimmick / off-meta perk combinations for maximum chaos!',
    type: 'curse',
    icon: '🤡',
    badgeBg: 'bg-amber-950/80',
    borderColor: 'border-amber-500/60',
    textColor: 'text-amber-300',
  },
  {
    id: 'double_xp',
    name: 'Double XP',
    description: 'Earn 2x XP rewards upon completing this trial successfully!',
    type: 'buff',
    icon: '⚡',
    badgeBg: 'bg-emerald-950/80',
    borderColor: 'border-emerald-500/60',
    textColor: 'text-emerald-300',
  },
];

interface WheelOfFortuneProps {
  totalPages: number;
  perksPerPage: number;
  lastPagePerks: number;
  spinDurationSec: number;
  role: 'Survivor' | 'Killer';
  sortedPerks: Perk[];
  activeSlotIdx: number;
  onWinSlot: (wonData: { page: number; slot: number; perk: Perk; mutator?: ChaosMutator }) => void;
  dict: any;
  backendBase: string;
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
}) => {
  const [selectedPageUI, setSelectedPageUI] = useState<number>(1);
  const [isSpinning, setIsSpinning] = useState(false);
  const [statusText, setStatusText] = useState<string>('');
  const [activeMutator, setActiveMutator] = useState<ChaosMutator | null>(null);

  const pageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const perkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const pageAngleRef = useRef<number>(0);
  const perkAngleRef = useRef<number>(0);
  const activePageRef = useRef<number>(1);

  const particlesRef = useRef<Particle[]>([]);
  const particleAnimFrameRef = useRef<number | null>(null);

  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const getPerkIconSrc = useCallback(
    (perk?: Perk) => {
      if (!perk) return '';
      return perk.icon_local_path
        ? `${backendBase}/static/${perk.icon_local_path}`
        : perk.icon_url;
    },
    [backendBase]
  );

  const preloadPageIcons = useCallback(
    (pageNumber: number) => {
      const maxSlotsOnPage =
        pageNumber === totalPages ? lastPagePerks : perksPerPage;

      for (let i = 0; i < maxSlotsOnPage; i++) {
        const index = (pageNumber - 1) * perksPerPage + i;
        const perk = sortedPerks[index];
        const src = getPerkIconSrc(perk);

        if (src && !imageCacheRef.current.has(src)) {
          const img = new Image();
          img.src = src;
          img.onload = () => {
            imageCacheRef.current.set(src, img);
          };
        }
      }
    },
    [totalPages, lastPagePerks, perksPerPage, sortedPerks, getPerkIconSrc]
  );

  /**
   * Visual Particle Burst Trigger (HTML5 Canvas Embers / Sparkles)
   */
  const triggerParticleBurst = useCallback(() => {
    const pCanvas = particleCanvasRef.current;
    if (!pCanvas) return;
    const ctx = pCanvas.getContext('2d');
    if (!ctx) return;

    const width = pCanvas.width;
    const height = pCanvas.height;

    // Create 50 burst particles
    const colors = ['#f59e0b', '#ef4444', '#10b981', '#a855f7', '#3b82f6'];
    const newParticles: Particle[] = [];

    for (let i = 0; i < 60; i++) {
      newParticles.push({
        x: width / 2 + (Math.random() * 80 - 40),
        y: height / 2 + (Math.random() * 80 - 40),
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 2,
        size: Math.random() * 5 + 2,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    particlesRef.current = newParticles;

    const renderParticles = () => {
      ctx.clearRect(0, 0, width, height);

      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0.02);

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha *= 0.94;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      });

      if (particlesRef.current.length > 0) {
        particleAnimFrameRef.current = requestAnimationFrame(renderParticles);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    if (particleAnimFrameRef.current) {
      cancelAnimationFrame(particleAnimFrameRef.current);
    }
    renderParticles();
  }, []);

  /**
   * Draw Wheel 1: Page Selector (520x520 HD Canvas)
   */
  const drawPageWheel = useCallback(() => {
    const canvas = pageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const radius = size / 2 - 20;
    const centerX = size / 2;
    const centerY = size / 2;

    ctx.clearRect(0, 0, size, size);
    const sliceAngle = (2 * Math.PI) / totalPages;

    for (let i = 0; i < totalPages; i++) {
      const angle = pageAngleRef.current + i * sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
      ctx.closePath();

      ctx.fillStyle = i % 2 === 0 ? '#1e293b' : '#0f172a';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#334155';
      ctx.stroke();

      // Page Text Label
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`Page ${i + 1}`, radius - 30, 6);
      ctx.restore();
    }

    // Outer Glow Ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    // Top Pointer Arrow
    ctx.beginPath();
    ctx.moveTo(centerX - 18, 2);
    ctx.lineTo(centerX + 18, 2);
    ctx.lineTo(centerX, 32);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
  }, [totalPages]);

  /**
   * Draw Wheel 2: Perk Slot Selector (520x520 HD Canvas)
   */
  const drawPerkWheel = useCallback(
    (pageNumber: number) => {
      const canvas = perkCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const radius = size / 2 - 20;
      const centerX = size / 2;
      const centerY = size / 2;

      ctx.clearRect(0, 0, size, size);

      const maxSlotsOnPage =
        pageNumber === totalPages ? lastPagePerks : perksPerPage;
      const sliceAngle = (2 * Math.PI) / maxSlotsOnPage;

      for (let i = 0; i < maxSlotsOnPage; i++) {
        const angle = perkAngleRef.current + i * sliceAngle;
        const index = (pageNumber - 1) * perksPerPage + i;
        const perk =
          sortedPerks[index] ||
          sortedPerks[index % Math.max(1, sortedPerks.length)];

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
        ctx.closePath();

        ctx.fillStyle =
          i % 2 === 0
            ? role === 'Survivor'
              ? '#064e3b'
              : '#881337'
            : '#0f172a';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#334155';
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle + sliceAngle / 2);

        // Render Perk Icon
        const iconSrc = getPerkIconSrc(perk);
        const imgObj = imageCacheRef.current.get(iconSrc);
        const iconSize = 36;
        const iconRadiusPos = radius - 52;

        if (imgObj && imgObj.complete) {
          ctx.drawImage(
            imgObj,
            iconRadiusPos - iconSize / 2,
            -iconSize / 2,
            iconSize,
            iconSize
          );
        }

        // Render Code & Title
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';

        const perkName = perk ? perk.name : `Slot ${i + 1}`;
        const truncatedName =
          perkName.length > 17 ? perkName.substring(0, 15) + '..' : perkName;

        ctx.fillText(
          `[${pageNumber}/${i + 1}] ${truncatedName}`,
          radius - 80,
          5
        );
        ctx.restore();
      }

      // Outer Glow Ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.lineWidth = 8;
      ctx.strokeStyle = role === 'Survivor' ? '#10b981' : '#f43f5e';
      ctx.stroke();

      // Top Pointer Arrow
      ctx.beginPath();
      ctx.moveTo(centerX - 18, 2);
      ctx.lineTo(centerX + 18, 2);
      ctx.lineTo(centerX, 32);
      ctx.closePath();
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
    },
    [
      getPerkIconSrc,
      totalPages,
      lastPagePerks,
      perksPerPage,
      role,
      sortedPerks,
    ]
  );

  useEffect(() => {
    preloadPageIcons(activePageRef.current);
    drawPageWheel();
    drawPerkWheel(activePageRef.current);
  }, [
    preloadPageIcons,
    drawPageWheel,
    drawPerkWheel,
    selectedPageUI,
    sortedPerks,
  ]);

  // Roll Random Mutator
  const handleRollMutator = () => {
    const randomMutator = CHAOS_MUTATORS[Math.floor(Math.random() * CHAOS_MUTATORS.length)];
    setActiveMutator(randomMutator);
    triggerParticleBurst();
  };

  const handleStartSpin = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setStatusText(dict.generator.spinning);

    const totalDurationMs = Math.max(1500, spinDurationSec * 1000);
    const pageSpinDuration = totalDurationMs * 0.45;
    const pauseDelay = 400;
    const perkSpinDuration = totalDurationMs * 0.55;

    const targetPage = Math.floor(Math.random() * totalPages) + 1;
    const maxSlotsOnPage =
      targetPage === totalPages ? lastPagePerks : perksPerPage;
    const targetSlot = Math.floor(Math.random() * maxSlotsOnPage) + 1;

    // Phase 1: Spin Page Wheel
    const pageSliceAngle = (2 * Math.PI) / totalPages;
    const pageTargetAngle =
      (3 * Math.PI) / 2 - (targetPage - 1) * pageSliceAngle - pageSliceAngle / 2;

    const pageStartAngle = pageAngleRef.current;
    const pageFinalAngle =
      pageStartAngle + 5 * 2 * Math.PI + (pageTargetAngle - (pageStartAngle % (2 * Math.PI)));

    const pageStartTime = performance.now();

    await new Promise<void>((resolve) => {
      const animatePage = (now: number) => {
        const elapsed = now - pageStartTime;
        const progress = Math.min(elapsed / pageSpinDuration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        pageAngleRef.current = pageStartAngle + (pageFinalAngle - pageStartAngle) * easeOut;
        drawPageWheel();

        if (progress < 1) {
          requestAnimationFrame(animatePage);
        } else {
          pageAngleRef.current = pageFinalAngle % (2 * Math.PI);
          drawPageWheel();
          resolve();
        }
      };
      requestAnimationFrame(animatePage);
    });

    // Update active page ref
    activePageRef.current = targetPage;
    setSelectedPageUI(targetPage);
    preloadPageIcons(targetPage);
    drawPerkWheel(targetPage);

    await new Promise((res) => setTimeout(res, pauseDelay));

    // Phase 2: Spin Perk Wheel
    const perkSliceAngle = (2 * Math.PI) / maxSlotsOnPage;
    const perkTargetAngle =
      (3 * Math.PI) / 2 - (targetSlot - 1) * perkSliceAngle - perkSliceAngle / 2;

    const perkStartAngle = perkAngleRef.current;
    const perkFinalAngle =
      perkStartAngle + 6 * 2 * Math.PI + (perkTargetAngle - (perkStartAngle % (2 * Math.PI)));

    const perkStartTime = performance.now();

    await new Promise<void>((resolve) => {
      const animatePerk = (now: number) => {
        const elapsed = now - perkStartTime;
        const progress = Math.min(elapsed / perkSpinDuration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        perkAngleRef.current = perkStartAngle + (perkFinalAngle - perkStartAngle) * easeOut;
        drawPerkWheel(targetPage);

        if (progress < 1) {
          requestAnimationFrame(animatePerk);
        } else {
          perkAngleRef.current = perkFinalAngle % (2 * Math.PI);
          drawPerkWheel(targetPage);
          resolve();
        }
      };
      requestAnimationFrame(animatePerk);
    });

    const index = (targetPage - 1) * perksPerPage + (targetSlot - 1);
    const wonPerk =
      sortedPerks[index] || sortedPerks[index % Math.max(1, sortedPerks.length)];

    // 50% chance to also roll a Chaos Mutator if none active
    let drawnMutator = activeMutator;
    if (Math.random() > 0.4) {
      drawnMutator = CHAOS_MUTATORS[Math.floor(Math.random() * CHAOS_MUTATORS.length)];
      setActiveMutator(drawnMutator);
    }

    triggerParticleBurst();
    onWinSlot({ page: targetPage, slot: targetSlot, perk: wonPerk, mutator: drawnMutator || undefined });
    setIsSpinning(false);
    setStatusText('');
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/60 text-center">
      {/* Particle Canvas Overlay */}
      <canvas
        ref={particleCanvasRef}
        width={1000}
        height={600}
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      />

      {/* Secret Mutator / Curse Alert Badge when Won */}
      {activeMutator && (
        <div
          className={`mb-6 rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all animate-in zoom-in-95 duration-300 ${activeMutator.badgeBg} ${activeMutator.borderColor} ${activeMutator.textColor}`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950/60 text-2xl border border-white/10 shadow-lg">
                {activeMutator.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-black/40 border border-white/20">
                    {activeMutator.type === 'curse' ? '💀 Secret Curse Active' : '⚡ Chaos Buff Active'}
                  </span>
                  <h4 className="font-extrabold text-base tracking-wide text-white">
                    {activeMutator.name}
                  </h4>
                </div>
                <p className="text-xs text-slate-300 mt-1">{activeMutator.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleRollMutator}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs font-bold border border-white/10 text-slate-200 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reroll Curse</span>
              </button>
              <button
                onClick={() => setActiveMutator(null)}
                className="px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spin Control & Chaos 2.0 Trigger Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={handleStartSpin}
          disabled={isSpinning}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-3.5 text-sm font-black text-white shadow-xl shadow-amber-900/30 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition-all cursor-pointer"
        >
          <Play className={`h-5 w-5 ${isSpinning ? 'animate-spin' : ''}`} />
          <span>
            {isSpinning
              ? statusText
              : dict.generator.spinWheels.replace('{slot}', (activeSlotIdx + 1).toString())}
          </span>
        </button>

        <button
          onClick={handleRollMutator}
          disabled={isSpinning}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-rose-700 px-5 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-purple-950/40 hover:from-purple-500 hover:to-rose-600 disabled:opacity-50 transition-all cursor-pointer"
        >
          <Sparkles className="h-4 w-4 text-purple-200 animate-pulse" />
          <span>Chaos Wheel 2.0 Mutator</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center justify-items-center">
        {/* Page Wheel */}
        <div className="flex flex-col items-center w-full">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-500">
            {dict.generator.pageWheelTitle}
          </h3>
          <canvas
            ref={pageCanvasRef}
            width={520}
            height={520}
            className="w-full max-w-[480px] xl:max-w-[500px] h-auto rounded-full shadow-2xl bg-slate-950/40 p-2 border border-slate-800"
          />
        </div>

        {/* Perk Wheel */}
        <div className="flex flex-col items-center w-full">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-500">
            {dict.generator.perkWheelTitle} (
            {dict.generator.selectedPage.replace('{page}', selectedPageUI.toString())})
          </h3>
          <canvas
            ref={perkCanvasRef}
            width={520}
            height={520}
            className="w-full max-w-[480px] xl:max-w-[500px] h-auto rounded-full shadow-2xl bg-slate-950/40 p-2 border border-slate-800"
          />
        </div>
      </div>
    </div>
  );
};