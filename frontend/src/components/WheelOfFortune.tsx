'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play } from 'lucide-react';
import { Perk } from './PerkCard';

interface WheelOfFortuneProps {
  totalPages: number;
  perksPerPage: number;
  lastPagePerks: number;
  spinDurationSec: number;
  role: 'Survivor' | 'Killer';
  sortedPerks: Perk[];
  activeSlotIdx: number;
  onWinSlot: (wonData: { page: number; slot: number; perk: Perk }) => void;
  dict: any;
  backendBase: string;
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

  const pageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const perkCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const pageAngleRef = useRef<number>(0);
  const perkAngleRef = useRef<number>(0);
  const activePageRef = useRef<number>(1);

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

    onWinSlot({ page: targetPage, slot: targetSlot, perk: wonPerk });
    setIsSpinning(false);
    setStatusText('');
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/60 text-center">
      <div className="mb-6 flex items-center justify-center">
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