'use client';
// frontend/src/components/ChaosWheelModal.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Skull, Sparkles, X, Check } from 'lucide-react';
import { ChaosMutator } from '@/types/chaos';
import { PerkDictionary } from '@/types/perks';
import { CHAOS_MUTATORS } from '@/constants/chaosMutators';

export { CHAOS_MUTATORS };
export type { ChaosMutator };

interface ChaosWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMutator: (mutator: ChaosMutator) => void;
  activeMutator: ChaosMutator | null;
  dict?: PerkDictionary;
}

export const ChaosWheelModal: React.FC<ChaosWheelModalProps> = ({
  isOpen,
  onClose,
  onSelectMutator,
  activeMutator,
  dict,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const angleRef = useRef<number>(0);

  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wonMutator, setWonMutator] = useState<ChaosMutator | null>(activeMutator);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 24;

    ctx.clearRect(0, 0, size, size);

    const total = CHAOS_MUTATORS.length;
    const sliceAngle = (2 * Math.PI) / total;

    // Slices background
    for (let i = 0; i < total; i++) {
      const startAngle = angleRef.current + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const m = CHAOS_MUTATORS[i];

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      const grad = ctx.createRadialGradient(center, center, 10, center, center, radius);
      if (m.type === 'curse') {
        grad.addColorStop(0, '#31102f');
        grad.addColorStop(1, i % 2 === 0 ? '#1e081e' : '#140414');
      } else {
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(1, '#022c22');
      }

      ctx.fillStyle = grad;
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = m.type === 'curse' ? '#9333ea' : '#10b981';
      ctx.stroke();

      // Slice Text with Orientation Normalization
      ctx.save();
      ctx.translate(center, center);
      const midAngle = startAngle + sliceAngle / 2;
      ctx.rotate(midAngle);

      const normalizedAngle = ((midAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const isLeft = normalizedAngle > Math.PI / 2 && normalizedAngle < (3 * Math.PI) / 2;

      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#f8fafc';

      if (isLeft) {
        ctx.rotate(Math.PI);
        ctx.textAlign = 'left';
        ctx.fillText(`${m.icon} ${m.name}`, -(radius - 35), 4);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(`${m.icon} ${m.name}`, radius - 35, 4);
      }

      ctx.restore();
    }

    // Center Hub Badge
    ctx.beginPath();
    ctx.arc(center, center, 42, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CHAOS', center, center - 4);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 9px system-ui, sans-serif';
    ctx.fillText('WHEEL', center, center + 10);

    // Top Pointer Arrow
    ctx.beginPath();
    ctx.moveTo(center - 16, 4);
    ctx.lineTo(center + 16, 4);
    ctx.lineTo(center, 34);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (isOpen) {
      drawWheel();
    }
  }, [isOpen, drawWheel]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const spinChaosWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWonMutator(null);

    const total = CHAOS_MUTATORS.length;
    const sliceAngle = (2 * Math.PI) / total;
    const winningIdx = Math.floor(Math.random() * total);

    const targetAngle = (3 * Math.PI) / 2 - winningIdx * sliceAngle - sliceAngle / 2;
    const startAngle = angleRef.current;
    const fullSpins = 6 * 2 * Math.PI;
    const finalAngle = startAngle + fullSpins + (targetAngle - (startAngle % (2 * Math.PI)));

    const startTime = performance.now();
    const duration = 3000;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 4);

      angleRef.current = startAngle + (finalAngle - startAngle) * easeOut;
      drawWheel();

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        angleRef.current = finalAngle % (2 * Math.PI);
        drawWheel();
        setIsSpinning(false);
        const won = CHAOS_MUTATORS[winningIdx];
        setWonMutator(won);
        onSelectMutator(won);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chaos-modal-title"
      aria-describedby="chaos-modal-desc"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md cursor-pointer animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl border border-purple-500/30 bg-white dark:bg-slate-900 p-6 shadow-2xl text-slate-900 dark:text-slate-100 cursor-default animate-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={dict?.modal?.close || 'Close modal'}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 dark:bg-purple-900/50 border border-purple-500/30 text-purple-600 dark:text-purple-300 shadow-sm">
            <Skull className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h2 id="chaos-modal-title" className="text-lg font-black tracking-wide text-slate-900 dark:text-white">
              Chaos Wheel of Curses
            </h2>
            <p id="chaos-modal-desc" className="text-xs text-slate-600 dark:text-slate-400">
              Spin to apply a single trial Curse or Buff to your 4 perk loadout.
            </p>
          </div>
        </div>

        {/* Wheel Canvas Container */}
        <div className="relative flex flex-col items-center justify-center my-4">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="h-[300px] w-[300px] sm:h-[360px] sm:w-[360px] drop-shadow-[0_0_25px_rgba(147,51,234,0.3)]"
          />

          <button
            type="button"
            onClick={spinChaosWheel}
            disabled={isSpinning}
            className={`mt-4 flex items-center gap-2 rounded-2xl px-6 py-3 font-extrabold text-sm shadow-lg transition-all cursor-pointer ${
              isSpinning
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 via-rose-600 to-amber-600 text-white hover:brightness-110 active:scale-95 shadow-purple-900/40'
            }`}
          >
            <Sparkles className={`h-4 w-4 ${isSpinning ? 'animate-spin' : ''}`} />
            {isSpinning ? 'Spinning Chaos Curses...' : 'Spin Chaos Wheel!'}
          </button>
        </div>

        {/* Active Won Mutator Display Card */}
        {wonMutator && (
          <div
            aria-live="polite"
            className={`mt-4 rounded-2xl border p-4 backdrop-blur-sm transition-all shadow-sm ${wonMutator.badgeBg} ${wonMutator.borderColor}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl" aria-hidden="true">
                  {wonMutator.icon}
                </span>
                <div>
                  <h3 className={`text-sm font-extrabold ${wonMutator.textColor}`}>
                    {wonMutator.name}
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                    {wonMutator.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                <Check className="h-3.5 w-3.5" />
                Active
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-2.5 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
