'use client';
// frontend/src/components/ChaosWheelModal.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Skull, Sparkles, X, Check, Trash2 } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { ChaosMutator } from '@/types/chaos';
import { CHAOS_MUTATORS } from '@/constants/chaosMutators';

export { CHAOS_MUTATORS };
export type { ChaosMutator };

interface ChaosWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMutator: (mutator: ChaosMutator) => void;
  onClearMutator?: () => void;
  activeMutator: ChaosMutator | null;
  dict?: Dictionary;
}

function getMutatorDisplayLines(m: ChaosMutator): [string, string] {
  switch (m.id) {
    case 'no_exhaustion':
      return ['No Exhaustion', 'Perks'];
    case 'blindness':
      return ['Curse of', 'Blindness'];
    case 'meme_loadout':
      return ['Meme / Off-Meta', 'Loadout'];
    case 'hex_boon_only':
      return ['Hex & Boon', 'Ritual'];
    case 'negative_only':
      return ['Curse of', 'Sacrifice'];
    default: {
      const parts = m.name.split(' ');
      if (parts.length > 2) {
        const mid = Math.ceil(parts.length / 2);
        return [parts.slice(0, mid).join(' '), parts.slice(mid).join(' ')];
      }
      return [parts[0] || m.name, parts.slice(1).join(' ')];
    }
  }
}

export const ChaosWheelModal: React.FC<ChaosWheelModalProps> = ({
  isOpen,
  onClose,
  onSelectMutator,
  onClearMutator,
  activeMutator,
  dict,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const angleRef = useRef<number>(0);

  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wonMutator, setWonMutator] = useState<ChaosMutator | null>(activeMutator);

  useEffect(() => {
    setWonMutator(activeMutator);
  }, [activeMutator]);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width; // 500
    const center = size / 2; // 250
    const radius = center - 26; // 224
    const hubRadius = 46;

    ctx.clearRect(0, 0, size, size);

    const total = CHAOS_MUTATORS.length;
    const sliceAngle = (2 * Math.PI) / total;

    for (let i = 0; i < total; i++) {
      const startAngle = angleRef.current + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const m = CHAOS_MUTATORS[i];

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      const grad = ctx.createRadialGradient(center, center, hubRadius, center, center, radius);
      if (m.type === 'curse') {
        grad.addColorStop(0, '#2e1035');
        grad.addColorStop(1, i % 2 === 0 ? '#18061a' : '#110313');
      } else {
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(1, '#022c22');
      }

      ctx.fillStyle = grad;
      ctx.fill();

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = m.type === 'curse' ? '#9333ea' : '#10b981';
      ctx.stroke();

      ctx.save();
      ctx.translate(center, center);
      const midAngle = startAngle + sliceAngle / 2;
      ctx.rotate(midAngle);

      const normalizedAngle = ((midAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const isLeft = normalizedAngle > Math.PI / 2 && normalizedAngle < (3 * Math.PI) / 2;

      const [line1, line2] = getMutatorDisplayLines(m);

      if (isLeft) {
        ctx.rotate(Math.PI);
        // Outer icon
        ctx.font = '22px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(m.icon, -192, 0);

        // Label lines centered between hub and outer icon
        ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(line1, -120, -8);
        ctx.fillText(line2, -120, 10);
      } else {
        // Outer icon
        ctx.font = '22px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(m.icon, 192, 0);

        // Label lines centered between hub and outer icon
        ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(line1, 120, -8);
        ctx.fillText(line2, 120, 10);
      }

      ctx.restore();
    }

    // Outer wheel border
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#c084fc';
    ctx.stroke();

    // Center hub
    ctx.beginPath();
    ctx.arc(center, center, hubRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#090d16';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#c084fc';
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 13px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CHAOS', center, center - 7);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 10px system-ui, -apple-system, sans-serif';
    ctx.fillText('WHEEL', center, center + 9);

    // Top pointer
    ctx.beginPath();
    ctx.moveTo(center - 18, 6);
    ctx.lineTo(center + 18, 6);
    ctx.lineTo(center, 40);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = 2.5;
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

  const handleClearCurse = () => {
    setWonMutator(null);
    onClearMutator?.();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chaos-modal-title"
      aria-describedby="chaos-modal-desc"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-md cursor-pointer animate-in fade-in duration-200 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm sm:max-w-md md:max-w-lg rounded-3xl border border-border-color bg-bg-surface p-4 sm:p-6 shadow-2xl text-text-primary cursor-default animate-in zoom-in-95 duration-200 transition-colors max-h-[92vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={dict?.modal?.close}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-xl p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 mb-3 sm:mb-4 pr-8">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 shadow-xs" aria-hidden="true">
            <Skull className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" />
          </div>
          <div>
            {dict?.generator?.chaosWheelTitle && (
              <h2 id="chaos-modal-title" className="text-base sm:text-lg font-black tracking-wide text-text-primary">
                {dict.generator.chaosWheelTitle}
              </h2>
            )}
            {dict?.generator?.chaosWheelDesc && (
              <p id="chaos-modal-desc" className="text-xs text-text-secondary line-clamp-2 sm:line-clamp-none">
                {dict.generator.chaosWheelDesc}
              </p>
            )}
          </div>
        </div>

        <div className="relative flex flex-col items-center justify-center my-2 sm:my-4">
          <canvas
            ref={canvasRef}
            width={500}
            height={500}
            aria-label={dict?.generator?.chaosWheelTitle}
            className="w-[260px] h-[260px] xs:w-[290px] xs:h-[290px] sm:w-[340px] sm:h-[340px] md:w-[380px] md:h-[380px] max-w-full aspect-square drop-shadow-[0_0_25px_rgba(147,51,234,0.35)]"
          />

          <button
            type="button"
            onClick={spinChaosWheel}
            disabled={isSpinning}
            className={`mt-3 sm:mt-4 flex items-center gap-2 rounded-2xl px-5 sm:px-6 py-2.5 sm:py-3 font-extrabold text-xs sm:text-sm shadow-lg transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
              isSpinning
                ? 'bg-bg-elevated text-text-muted cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 via-rose-600 to-amber-600 text-white hover:brightness-110 active:scale-95 shadow-purple-900/40'
            }`}
          >
            <Sparkles className={`h-4 w-4 ${isSpinning ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>
              {isSpinning
                ? dict?.generator?.spinningCurses
                : dict?.generator?.spinChaosWheel}
            </span>
          </button>
        </div>

        {wonMutator && (
          <div
            aria-live="polite"
            className="mt-3 sm:mt-4 rounded-2xl border p-3 sm:p-4 backdrop-blur-sm transition-all shadow-xs border-border-color bg-bg-primary"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl sm:text-2xl shrink-0" aria-hidden="true">
                  {wonMutator.icon}
                </span>
                <div className="min-w-0">
                  <h3 className={`text-xs sm:text-sm font-extrabold truncate ${wonMutator.textColor}`}>
                    {wonMutator.name}
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                    {wonMutator.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleClearCurse}
                  title={dict?.generator?.clearMutatorTooltip || 'Remove active curse'}
                  className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-400 font-bold px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">{dict?.generator?.clearMutator || 'Clear'}</span>
                </button>
                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{dict?.smashOrPass?.active || 'Active'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 sm:mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border-color bg-bg-surface hover:bg-bg-elevated px-5 py-2 sm:py-2.5 font-bold text-xs text-text-primary transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            {dict?.modal?.done || dict?.generator?.done || 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
