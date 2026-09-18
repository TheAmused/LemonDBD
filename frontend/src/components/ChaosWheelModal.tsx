'use client';
// frontend/src/components/ChaosWheelModal.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Skull, Sparkles, X, Check, Trash2 } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { ChaosMutator } from '@/types/chaos';
import { CHAOS_MUTATORS, getChaosMutatorsForRole } from '@/constants/chaosMutators';
import { DbdButton, DbdButtonRole } from './generator/shared/DbdButton';
import { getLocalizedMutator } from './generator/lib/chaosMutatorLocalization';

export { CHAOS_MUTATORS };
export type { ChaosMutator };

interface ChaosWheelModalProps {
  isOpen: boolean;
  role: DbdButtonRole;
  onClose: () => void;
  onSelectMutator: (mutator: ChaosMutator) => void;
  onClearMutator?: () => void;
  activeMutator: ChaosMutator | null;
  dict?: Dictionary;
}

export function getMutatorDisplayLines(
  m: ChaosMutator | string | null | undefined,
  dict?: Dictionary
): [string, string] {
  if (!m) return ['', ''];
  const id = typeof m === 'string' ? m : m.id;

  // Check localized dictionary if available
  const localized = (dict?.generator as any)?.chaosMutators?.[id];
  if (localized?.line1) {
    return [localized.line1, localized.line2 || ''];
  }

  switch (id) {
    case 'no_exhaustion':  return ['No Exhaustion', 'Perks'];
    case 'no_slowdown':    return ['No Slowdown', 'Perks'];
    case 'blindness':      return ['Curse of', 'Blindness'];
    case 'solo_queue':     return ['Curse of', 'Solitude'];
    case 'chase_only':     return ['Pure', 'Bloodlust'];
    case 'meme_loadout':   return ['Meme / Off-Meta', 'Loadout'];
    case 'hex_boon_only':  return ['Hex & Boon', 'Ritual'];
    case 'hex_roulette':   return ['Hex Totem', 'Madness'];
    case 'negative_only':  return ['Curse of', 'Sacrifice'];
    default: {
      const rawName = (typeof m === 'string' ? m : m.name || '').trim();
      if (!rawName) return ['', ''];
      const parts = rawName.split(/\s+/).filter(Boolean);
      if (parts.length > 2) {
        const mid = Math.ceil(parts.length / 2);
        return [parts.slice(0, mid).join(' '), parts.slice(mid).join(' ')];
      }
      return [parts[0] || rawName, parts.slice(1).join(' ')];
    }
  }
}


export const ChaosWheelModal: React.FC<ChaosWheelModalProps> = ({
  isOpen,
  role,
  onClose,
  onSelectMutator,
  onClearMutator,
  activeMutator,
  dict,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const angleRef = useRef<number>(0);

  // Derive the mutator list from the current role
  const mutators = getChaosMutatorsForRole(role);

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

    const size = canvas.width;
    const scale = size / 500;
    const center = size / 2;
    const radius = center - 26 * scale;
    const hubRadius = 46 * scale;

    ctx.clearRect(0, 0, size, size);

    const total = mutators.length;
    const sliceAngle = (2 * Math.PI) / total;

    for (let i = 0; i < total; i++) {
      const startAngle = angleRef.current + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const m = mutators[i];

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      const grad = ctx.createRadialGradient(center, center, hubRadius, center, center, radius);
      if (m.type === 'curse') {
        grad.addColorStop(0, i % 2 === 0 ? '#4a0d0d' : '#5c1414');
        grad.addColorStop(1, i % 2 === 0 ? '#1c0404' : '#1a0505');
      } else {
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(1, '#022c22');
      }

      ctx.fillStyle = grad;
      ctx.fill();

      ctx.lineWidth = 2.5 * scale;
      ctx.strokeStyle = m.type === 'curse' ? '#b91c1c' : '#16a34a';
      ctx.stroke();

      const midAngle = startAngle + sliceAngle / 2;
      const [line1, line2] = getMutatorDisplayLines(m, dict);
      const iconFontSize = Math.round(22 * scale);
      const textFontSize = Math.round(12.5 * scale);
      const contentRadius = 145 * scale;

      const cx = center + Math.cos(midAngle) * contentRadius;
      const cy = center + Math.sin(midAngle) * contentRadius;

      ctx.save();
      // Draw icon - Always faces the user upright (no rotation)
      ctx.font = `${iconFontSize}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.icon, cx, cy - 18 * scale);

      // Draw label lines - Always faces the user upright (no rotation)
      ctx.font = `bold ${textFontSize}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(line1, cx, cy + 4 * scale);
      if (line2) {
        ctx.fillText(line2, cx, cy + 18 * scale);
      }
      ctx.restore();
    }

    // Outer wheel border
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 3 * scale;
    ctx.strokeStyle = '#dc2626';
    ctx.stroke();

    // Center hub
    ctx.beginPath();
    ctx.arc(center, center, hubRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#0a0a0c';
    ctx.fill();
    ctx.lineWidth = 3.5 * scale;
    ctx.strokeStyle = '#dc2626';
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = `900 ${Math.round(13 * scale)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CHAOS', center, center - 7 * scale);
    ctx.fillStyle = '#a1a1aa';
    ctx.font = `800 ${Math.round(10 * scale)}px system-ui, -apple-system, sans-serif`;
    ctx.fillText('WHEEL', center, center + 9 * scale);

    // Top pointer
    ctx.beginPath();
    ctx.moveTo(center - 18 * scale, 6 * scale);
    ctx.lineTo(center + 18 * scale, 6 * scale);
    ctx.lineTo(center, 40 * scale);
    ctx.closePath();
    ctx.fillStyle = '#b91c1c';
    ctx.fill();
    ctx.lineWidth = 2.5 * scale;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }, [mutators, dict]);

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

    const total = mutators.length;
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
        const won = mutators[winningIdx];
        setWonMutator(won);
        // Notify parent of the new mutator selection — modal stays open
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

  const locWon = wonMutator ? getLocalizedMutator(wonMutator, dict) : null;
  const locActive = activeMutator && activeMutator !== wonMutator
    ? getLocalizedMutator(activeMutator, dict) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chaos-modal-title"
      aria-describedby="chaos-modal-desc"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/70 p-3 sm:p-4 backdrop-blur-md cursor-pointer animate-in fade-in duration-200 select-none lemon-modal-overlay-sidebar-aware"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-[480px] xl:max-w-2xl 2xl:max-w-[700px] rounded-3xl border border-border-color bg-bg-surface p-4 sm:p-6 xl:p-7 shadow-2xl text-text-primary cursor-default animate-in zoom-in-95 duration-200 transition-all max-h-[94vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={dict?.modal?.close}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-xl p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 mb-3 sm:mb-4 pr-8">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 xl:h-11 xl:w-11 shrink-0 items-center justify-center rounded-xl bg-bg-elevated border border-border-color text-text-secondary shadow-xs" aria-hidden="true">
            <Skull className="h-5 w-5 sm:h-6 sm:w-6 xl:h-7 xl:w-7 animate-pulse" />
          </div>
          {dict?.generator?.chaosWheelTitle && (
            <h2 id="chaos-modal-title" className="text-base sm:text-lg xl:text-xl font-black tracking-wide text-text-primary">
              {dict.generator.chaosWheelTitle}
            </h2>
          )}
        </div>

        {dict?.generator?.chaosWheelDesc && (
          <p id="chaos-modal-desc" className="max-w-lg mx-auto text-center text-xs sm:text-sm font-bold text-text-secondary">
            {dict.generator.chaosWheelDesc}
          </p>
        )}

        <div className="relative flex flex-col items-center justify-center my-2 sm:my-4">
          <canvas
            ref={canvasRef}
            width={800}
            height={800}
            aria-label={dict?.generator?.chaosWheelTitle}
            className="w-[260px] h-[260px] xs:w-[290px] xs:h-[290px] sm:w-[330px] sm:h-[330px] md:w-[370px] md:h-[370px] lg:w-[370px] lg:h-[370px] xl:w-[480px] xl:h-[480px] 2xl:w-[540px] 2xl:h-[540px] max-w-full aspect-square transition-all duration-300"
          />

          <DbdButton
            role={role}
            size="md"
            onClick={spinChaosWheel}
            disabled={isSpinning}
            className="mt-3 sm:mt-4 xl:mt-5"
            icon={<Sparkles className={`h-4 w-4 xl:h-5 xl:w-5 ${isSpinning ? 'animate-spin' : ''}`} />}
          >
            {isSpinning
              ? dict?.generator?.spinningCurses
              : dict?.generator?.spinChaosWheel}
          </DbdButton>
        </div>

        {/* --- Spin result card --- */}
        {wonMutator && locWon && (
          <div
            aria-live="polite"
            className={`mt-3 sm:mt-4 xl:mt-5 rounded-2xl border p-3 sm:p-4 xl:p-5 backdrop-blur-sm transition-all shadow-xs ${wonMutator.borderColor || 'border-border-color'} bg-bg-primary`}
          >
            {/* Result header row */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <span className="text-xl sm:text-2xl xl:text-3xl shrink-0" aria-hidden="true">
                  {wonMutator.icon}
                </span>
                <div className="min-w-0">
                  <h3 className={`text-xs sm:text-sm xl:text-base font-extrabold truncate ${wonMutator.textColor}`}>
                    {locWon.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-text-secondary mt-0.5 line-clamp-3">
                    {locWon.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Effect pill */}
            {locWon.effect && (
              <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mb-3 ${wonMutator.badgeBg} text-text-primary border ${wonMutator.borderColor}`}>
                {locWon.effect}
              </div>
            )}

            {/* Action row -- the curse is already applied to app state the
                instant the spin lands (see onSelectMutator in the spin
                animation above), so this is just a "done, close the modal"
                button, not a separate apply step. The wheel's own "Spin
                Chaos Wheel!" button above re-spins the exact same way, so
                there is no separate "Spin Again" action here anymore. */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-lg bg-accent-green/15 text-accent-green border border-accent-green/30 hover:bg-accent-green/25 transition-colors cursor-pointer"
              >
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {(dict?.generator as any)?.chaosApplyAndClose || 'Close'}
              </button>

              {/* Clear */}
              <button
                type="button"
                onClick={handleClearCurse}
                title={dict?.generator?.clearMutatorTooltip || 'Remove active curse'}
                className="flex items-center gap-1 text-xs sm:text-sm text-accent-red hover:text-accent-red-hover font-bold px-2 py-1.5 rounded-lg hover:bg-accent-red/10 transition-colors cursor-pointer ml-auto"
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">{dict?.generator?.clearMutator || 'Clear'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Previously active mutator (shown when modal opened without spinning) */}
        {!wonMutator && activeMutator && locActive && (
          <div className="mt-3 sm:mt-4 xl:mt-5 rounded-2xl border border-border-color p-3 sm:p-4 bg-bg-primary">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl sm:text-2xl shrink-0">{activeMutator.icon}</span>
                <div className="min-w-0">
                  <h3 className={`text-xs sm:text-sm font-extrabold truncate ${activeMutator.textColor}`}>
                    {locActive.name}
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{locActive.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleClearCurse}
                  title={dict?.generator?.clearMutatorTooltip || 'Remove active curse'}
                  className="flex items-center gap-1 text-xs sm:text-sm text-accent-red hover:text-accent-red-hover font-bold px-2 py-1 rounded-lg hover:bg-accent-red/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">{dict?.generator?.clearMutator || 'Clear'}</span>
                </button>
                <div className="flex items-center gap-1 text-accent-green font-bold text-xs sm:text-sm bg-accent-green/10 px-2.5 py-1 rounded-lg border border-accent-green/30">
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                  <span>{dict?.smashOrPass?.active || 'Active'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
