'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Sparkles, Skull, Zap, Eye, Ban, Flame, RefreshCw, ShieldAlert, Check } from 'lucide-react';
import { Perk } from './PerkCard';
import { ChaosMutator } from './ChaosWheelModal';

export const EXHAUSTION_PERK_NAMES = new Set([
  'adrenaline',
  'balanced landing',
  'dead hard',
  'lithe',
  'sprint burst',
  'overcome',
  'smash hit',
  'background player',
  'finesse',
  'dramaturgy',
  'head on',
]);

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
  activeMutator?: ChaosMutator | null;
  onOpenChaosModal?: () => void;
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
}) => {
  const [selectedPageUI, setSelectedPageUI] = useState<number>(1);
  const [isSpinning, setIsSpinning] = useState(false);
  const [statusText, setStatusText] = useState<string>('');

  const pageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const perkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const pageAngleRef = useRef<number>(0);
  const perkAngleRef = useRef<number>(0);
  const activePageRef = useRef<number>(1);

  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const particleListRef = useRef<Particle[]>([]);
  const particleAnimFrameRef = useRef<number | null>(null);

  const getPerkIconSrc = useCallback(
    (perk?: Perk) => {
      if (!perk) return '';
      if (perk.icon_local_path) {
        return `${backendBase}/static/${perk.icon_local_path}`;
      }
      return perk.icon_url || '';
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

  const preloadPageIcons = useCallback(
    (pageNumber: number) => {
      const maxSlots = pageNumber === totalPages ? lastPagePerks : perksPerPage;
      for (let i = 0; i < maxSlots; i++) {
        const index = (pageNumber - 1) * perksPerPage + i;
        const perk = sortedPerks[index];
        if (perk) {
          const src = getPerkIconSrc(perk);
          if (src && !imageCacheRef.current.has(src)) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = src;
            img.onload = () => {
              drawPerkWheel(activePageRef.current);
            };
            imageCacheRef.current.set(src, img);
          }
        }
      }
    },
    [getPerkIconSrc, lastPagePerks, perksPerPage, sortedPerks, totalPages]
  );

  const triggerParticleBurst = useCallback(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;
    const count = 45;

    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      newParticles.push({
        x: width / 2,
        y: height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5 + 2,
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
          p.alpha *= 0.94;
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

      const grad = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, radius);
      if (i % 2 === 0) {
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(1, '#0f172a');
      } else {
        grad.addColorStop(0, '#334155');
        grad.addColorStop(1, '#1e293b');
      }

      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#475569';
      ctx.stroke();

      // Page Text Label with Normalized Right-Side-Up Rotation
      ctx.save();
      ctx.translate(centerX, centerY);
      const midAngle = angle + sliceAngle / 2;
      ctx.rotate(midAngle);

      const normAngle = (midAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const isLeftHalf = normAngle > Math.PI / 2 && normAngle < (3 * Math.PI) / 2;

      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#f8fafc';

      if (isLeftHalf) {
        ctx.rotate(Math.PI);
        ctx.textAlign = 'left';
        ctx.fillText(`Page ${i + 1}`, -(radius - 35), 4);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(`Page ${i + 1}`, radius - 35, 4);
      }

      ctx.restore();
    }

    // Center Hub Logo
    ctx.beginPath();
    ctx.arc(centerX, centerY, 38, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAGE', centerX, centerY - 3);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 9px system-ui, sans-serif';
    ctx.fillText('SELECTOR', centerX, centerY + 10);

    // Outer Glow Ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    // Top Pointer Arrow
    ctx.beginPath();
    ctx.moveTo(centerX - 16, 2);
    ctx.lineTo(centerX + 16, 2);
    ctx.lineTo(centerX, 30);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
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

        const isBlocked = isPerkBlockedByMutator(perk);

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
        ctx.closePath();

        // Gradient & Colors
        const grad = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, radius);
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
        ctx.lineWidth = 2;
        ctx.strokeStyle = isBlocked ? '#e11d48' : '#334155';
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        const midAngle = angle + sliceAngle / 2;
        ctx.rotate(midAngle);

        // Render Perk Icon
        const iconSrc = getPerkIconSrc(perk);
        const imgObj = imageCacheRef.current.get(iconSrc);
        const iconSize = 34;
        const iconRadiusPos = radius - 45;

        if (imgObj && imgObj.complete) {
          ctx.save();
          if (isBlocked) {
            ctx.globalAlpha = 0.35;
          }
          ctx.drawImage(
            imgObj,
            iconRadiusPos - iconSize / 2,
            -iconSize / 2,
            iconSize,
            iconSize
          );
          ctx.restore();
        }

        // Ban overlay if blocked
        if (isBlocked) {
          ctx.font = 'bold 16px sans-serif';
          ctx.fillStyle = '#f43f5e';
          ctx.textAlign = 'center';
          ctx.fillText('🚫', iconRadiusPos, 5);
        }

        // Render Text with Normalized Right-Side-Up Rotation
        const normAngle = (midAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        const isLeftHalf = normAngle > Math.PI / 2 && normAngle < (3 * Math.PI) / 2;

        const perkName = perk ? perk.name : `Slot ${i + 1}`;
        const truncatedName =
          perkName.length > 15 ? perkName.substring(0, 13) + '..' : perkName;

        ctx.font = isBlocked ? 'italic 11px system-ui, sans-serif' : 'bold 12px system-ui, sans-serif';
        ctx.fillStyle = isBlocked ? '#94a3b8' : '#f8fafc';

        if (isLeftHalf) {
          ctx.rotate(Math.PI);
          ctx.textAlign = 'left';
          ctx.fillText(`[${pageNumber}/${i + 1}] ${truncatedName}`, -(radius - 75), 4);
        } else {
          ctx.textAlign = 'right';
          ctx.fillText(`[${pageNumber}/${i + 1}] ${truncatedName}`, radius - 75, 4);
        }

        ctx.restore();
      }

      // Center Hub Logo
      ctx.beginPath();
      ctx.arc(centerX, centerY, 38, 0, 2 * Math.PI);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = role === 'Survivor' ? '#10b981' : '#f43f5e';
      ctx.stroke();

      ctx.fillStyle = role === 'Survivor' ? '#34d399' : '#fb7185';
      ctx.font = '900 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(role.toUpperCase(), centerX, centerY - 3);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '700 9px system-ui, sans-serif';
      ctx.fillText('PERK WHEEL', centerX, centerY + 10);

      // Outer Glow Ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.lineWidth = 6;
      ctx.strokeStyle = role === 'Survivor' ? '#10b981' : '#f43f5e';
      ctx.stroke();

      // Top Pointer Arrow
      ctx.beginPath();
      ctx.moveTo(centerX - 16, 2);
      ctx.lineTo(centerX + 16, 2);
      ctx.lineTo(centerX, 30);
      ctx.closePath();
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    },
    [
      getPerkIconSrc,
      isPerkBlockedByMutator,
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
    activeMutator,
  ]);

  const handleStartSpin = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setStatusText(dict.generator.spinning);

    const totalDurationMs = Math.max(1500, spinDurationSec * 1000);
    const pageSpinDuration = totalDurationMs * 0.45;
    const pauseDelay = 400;
    const perkSpinDuration = totalDurationMs * 0.55;

    // Pick a valid page and slot with SAFEGUARD against blocked perks
    let targetPage = Math.floor(Math.random() * totalPages) + 1;
    let maxSlotsOnPage = targetPage === totalPages ? lastPagePerks : perksPerPage;
    let targetSlot = Math.floor(Math.random() * maxSlotsOnPage) + 1;
    let targetIndex = (targetPage - 1) * perksPerPage + (targetSlot - 1);
    let targetPerk = sortedPerks[targetIndex];

    // Safeguard loop: if picked perk is blocked by mutator, retry up to 20 times for unblocked perk
    let attempts = 0;
    while (isPerkBlockedByMutator(targetPerk) && attempts < 25) {
      attempts++;
      targetPage = Math.floor(Math.random() * totalPages) + 1;
      maxSlotsOnPage = targetPage === totalPages ? lastPagePerks : perksPerPage;
      targetSlot = Math.floor(Math.random() * maxSlotsOnPage) + 1;
      targetIndex = (targetPage - 1) * perksPerPage + (targetSlot - 1);
      targetPerk = sortedPerks[targetIndex];
    }

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
        const easeOut = 1 - Math.pow(1 - progress, 4);

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

    setIsSpinning(false);
    setStatusText('');
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

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-4xl mx-auto p-4 sm:p-6 bg-slate-900/60 rounded-3xl border border-slate-800 backdrop-blur-md shadow-2xl">
      {/* Active Mutator Banner */}
      {activeMutator ? (
        <div className={`w-full mb-6 rounded-2xl border p-3.5 flex items-center justify-between backdrop-blur-md ${activeMutator.badgeBg} ${activeMutator.borderColor}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{activeMutator.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className={`text-xs font-black uppercase tracking-wider ${activeMutator.textColor}`}>
                  Active Curse: {activeMutator.name}
                </h4>
                <span className="text-[10px] font-bold bg-slate-900/80 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
                  Applied Once to Loadout
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {activeMutator.description}
              </p>
            </div>
          </div>
          {onOpenChaosModal && (
            <button
              onClick={onOpenChaosModal}
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
            >
              Change Curse
            </button>
          )}
        </div>
      ) : (
        onOpenChaosModal && (
          <div className="w-full mb-6 rounded-2xl border border-dashed border-purple-500/40 bg-purple-950/20 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Skull className="h-5 w-5 text-purple-400" />
              <div>
                <h4 className="text-xs font-bold text-purple-300">
                  No Active Curse
                </h4>
                <p className="text-xs text-slate-400">
                  Spin the Chaos Wheel to apply trial curses (e.g. No Exhaustion Perks).
                </p>
              </div>
            </div>
            <button
              onClick={onOpenChaosModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/50 transition-all active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Spin Chaos Wheel
            </button>
          </div>
        )
      )}

      {/* Dual Wheels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-center justify-items-center relative">
        {/* Particle Canvas */}
        <canvas
          ref={particlesCanvasRef}
          width={520}
          height={520}
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        />

        {/* Wheel 1: Page Selector */}
        <div className="flex flex-col items-center">
          <h4 className="mb-2 font-black text-xs uppercase tracking-wider text-amber-400">
            Wheel 1: Page Wheel (1-{totalPages})
          </h4>
          <div className="relative">
            <canvas
              ref={pageCanvasRef}
              width={520}
              height={520}
              className="h-[280px] w-[280px] sm:h-[340px] sm:w-[340px] drop-shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            />
          </div>
        </div>

        {/* Wheel 2: Perk Selector */}
        <div className="flex flex-col items-center">
          <h4 className={`mb-2 font-black text-xs uppercase tracking-wider ${role === 'Survivor' ? 'text-emerald-400' : 'text-rose-400'}`}>
            Wheel 2: Perk Wheel (Page {selectedPageUI})
          </h4>
          <div className="relative">
            <canvas
              ref={perkCanvasRef}
              width={520}
              height={520}
              className={`h-[280px] w-[280px] sm:h-[340px] sm:w-[340px] ${
                role === 'Survivor'
                  ? 'drop-shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'drop-shadow-[0_0_15px_rgba(244,63,94,0.25)]'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Spin Control Button */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          onClick={handleStartSpin}
          disabled={isSpinning}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-base tracking-wider uppercase shadow-xl transition-all ${
            isSpinning
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : role === 'Survivor'
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:brightness-110 text-white shadow-emerald-950/60 active:scale-95'
              : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:brightness-110 text-white shadow-rose-950/60 active:scale-95'
          }`}
        >
          <Play className={`h-5 w-5 fill-current ${isSpinning ? 'animate-spin' : ''}`} />
          {isSpinning ? 'Spinning Perk Wheels...' : `Spin for Perk Slot #${activeSlotIdx + 1}`}
        </button>

        {statusText && (
          <p className="text-xs font-bold text-amber-400 animate-pulse">
            {statusText}
          </p>
        )}
      </div>
    </div>
  );
};