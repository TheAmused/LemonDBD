'use client';
// frontend/src/components/ChaosWheelModal.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check, Trash2 } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { ChaosMutator } from '@/types/chaos';
import { lookup, type ChaosMutatorCopy } from '@/utils/lookup';
import { CHAOS_MUTATORS, getChaosMutatorsForRole } from '@/constants/chaosMutators';
import { Button, DbdButton, type DbdButtonRole } from '@/components/common/Button';
import { getLocalizedMutator } from './generator/lib/chaosMutatorLocalization';

import { tip } from '@/components/common/Tooltip';
import { Modal } from '@/components/common/Modal';
import { canvasEmojiFont, canvasFont } from '@/utils/canvasFont';
import { useDictionary } from "@/context/DictionaryContext";

import { paletteColor } from '@/utils/themeColor';
import { useOnValueChange } from '@/hooks/useOnValueChange';
export { CHAOS_MUTATORS };
export type { ChaosMutator };

interface ChaosWheelModalProps {
  isOpen: boolean;
  role: DbdButtonRole;
  onClose: () => void;
  onSelectMutator: (mutator: ChaosMutator) => void;
  onClearMutator?: () => void;
  activeMutator: ChaosMutator | null;
}

export function getMutatorDisplayLines(
  m: ChaosMutator | string | null | undefined,
  dict?: Dictionary
): [string, string] {
  if (!m) return ['', ''];
  const id = typeof m === 'string' ? m : m.id;

  // Check localized dictionary if available
  const localized = lookup<ChaosMutatorCopy>(dict?.generator.chaosMutators, id);
  if (localized?.line1) {
    return [localized.line1, localized.line2 || ''];
  }

  switch (id) {
    case 'no_exhaustion':  return ['Curse of', 'Exhaustion'];
    case 'no_slowdown':    return ['No Slowdown', 'Perks'];
    case 'blindness':      return ['Curse of', 'Blindness'];
    case 'solo_queue':     return ['Curse of', 'Solitude'];
    case 'chase_only':     return ['Pure', 'Bloodlust'];
    case 'meme_loadout':   return ['Curse of the', 'Clown'];
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


export const ChaosWheelModal: React.FC<ChaosWheelModalProps> = ({ isOpen, role, onClose, onSelectMutator, onClearMutator, activeMutator }) => {
  const dict = useDictionary();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Modal mounts its content one render after `isOpen` flips, so the first draw must wait for the canvas.
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const setCanvas = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
    setCanvasEl(el);
  }, []);
  const animFrameRef = useRef<number | null>(null);
  const angleRef = useRef<number>(0);

  // Derive the mutator list from the current role
  const mutators = getChaosMutatorsForRole(role);

  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wonMutator, setWonMutator] = useState<ChaosMutator | null>(activeMutator);

  useOnValueChange(activeMutator, setWonMutator);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const scale = size / 500;
    // Canvas pixels per CSS pixel: the wheel is drawn at 800 but shown at about 300 on a phone.
    const displayPx = canvas.clientWidth || size;
    const pxPerCss = size / displayPx;
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
        grad.addColorStop(0, i % 2 === 0 ? paletteColor('blood-850') : paletteColor('blood-800'));
        grad.addColorStop(1, i % 2 === 0 ? paletteColor('blood-950') : paletteColor('blood-960'));
      } else {
        grad.addColorStop(0, paletteColor('emerald-900'));
        grad.addColorStop(1, paletteColor('emerald-950'));
      }

      ctx.fillStyle = grad;
      ctx.fill();

      ctx.lineWidth = 2.5 * scale;
      ctx.strokeStyle = m.type === 'curse' ? paletteColor('red-700') : paletteColor('green-600');
      ctx.stroke();

      const midAngle = startAngle + sliceAngle / 2;
      const [line1, line2] = getMutatorDisplayLines(m, dict);
      const contentRadius = 158 * scale;

      const cx = center + Math.cos(midAngle) * contentRadius;
      const cy = center + Math.sin(midAngle) * contentRadius;

      // Sizes are chosen in CSS pixels (the canvas is drawn at 800 and shown much smaller on a phone),
      // then narrowed until the longest line fits the slice at this distance from the hub.
      const sliceWidth = 2 * contentRadius * Math.sin(sliceAngle / 2) * 0.92;
      let textPx = Math.min(12, Math.max(8.5, displayPx * 0.03)) * pxPerCss;
      const iconPx = Math.min(26, Math.max(16, displayPx * 0.057)) * pxPerCss;
      ctx.font = canvasFont('bold', textPx);
      const widest = Math.max(ctx.measureText(line1).width, line2 ? ctx.measureText(line2).width : 0);
      if (widest > sliceWidth) textPx = Math.max(7.5 * pxPerCss, (textPx * sliceWidth) / widest);

      const lineH = textPx * 1.2;
      const gap = 3 * pxPerCss;
      const blockH = iconPx + gap + (line2 ? 2 : 1) * lineH;
      const top = cy - blockH / 2;

      ctx.save();
      // Icon and label always face the user upright (no rotation).
      ctx.font = canvasEmojiFont(iconPx);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.icon, cx, top + iconPx / 2);

      ctx.font = canvasFont('bold', textPx);
      ctx.fillStyle = paletteColor('slate-50');
      const firstLineY = top + iconPx + gap + lineH / 2;
      ctx.fillText(line1, cx, firstLineY);
      if (line2) ctx.fillText(line2, cx, firstLineY + lineH);
      ctx.restore();
    }

    // Outer wheel border
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 3 * scale;
    ctx.strokeStyle = paletteColor('red-600');
    ctx.stroke();

    // Center hub
    ctx.beginPath();
    ctx.arc(center, center, hubRadius, 0, 2 * Math.PI);
    ctx.fillStyle = paletteColor('void-black');
    ctx.fill();
    ctx.lineWidth = 3.5 * scale;
    ctx.strokeStyle = paletteColor('red-600');
    ctx.stroke();

    ctx.fillStyle = paletteColor('amber-500');
    ctx.font = canvasFont('900', Math.round(13 * scale));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CHAOS', center, center - 7 * scale);
    ctx.fillStyle = paletteColor('zinc-400');
    ctx.font = canvasFont('800', Math.round(10 * scale));
    ctx.fillText('WHEEL', center, center + 9 * scale);

    // Top pointer
    ctx.beginPath();
    ctx.moveTo(center - 18 * scale, 6 * scale);
    ctx.lineTo(center + 18 * scale, 6 * scale);
    ctx.lineTo(center, 40 * scale);
    ctx.closePath();
    ctx.fillStyle = paletteColor('red-700');
    ctx.fill();
    ctx.lineWidth = 2.5 * scale;
    ctx.strokeStyle = paletteColor('white');
    ctx.stroke();
  }, [mutators, dict]);

  useEffect(() => {
    if (isOpen) {
      drawWheel();
    }
  }, [isOpen, drawWheel, canvasEl]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

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

  // Same card for a fresh spin result and for the curse that was already active when the modal opened.
  const shownMutator = wonMutator ?? activeMutator;
  const locShown = shownMutator ? getLocalizedMutator(shownMutator, dict) : null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="dialog"
      size="xl"
      title={dict.generator.chaosWheelTitle}
      closeButtonAriaLabel={dict.modal.close}
      ariaLabel={dict.generator.chaosWheelTitle}
      ariaDescribedBy="chaos-modal-desc"
      padded
    >
    {dict.generator.chaosWheelDesc && (
      <p id="chaos-modal-desc" className="max-w-lg mx-auto text-center type-strong-fluid text-text-secondary">
        {dict.generator.chaosWheelDesc}
      </p>
    )}

    <div className="relative flex flex-col items-center justify-center my-2 sm:my-4">
      <canvas
        ref={setCanvas}
        width={800}
        height={800}
        aria-label={dict.generator.chaosWheelTitle}
        className="w-chaos-wheel h-chaos-wheel sm:w-chaos-wheel-sm sm:h-chaos-wheel-sm md:w-chaos-wheel-md md:h-chaos-wheel-md xl:w-chaos-wheel-xl xl:h-chaos-wheel-xl 2xl:w-chaos-wheel-2xl 2xl:h-chaos-wheel-2xl max-w-full aspect-square transition-all duration-300"
      />

      <DbdButton
        role={role}
        size="md"
        onClick={spinChaosWheel}
        disabled={isSpinning}
        className="mt-3 sm:mt-4 xl:mt-4 xl:px-8 xl:py-3 xl:text-sm 2xl:px-9 2xl:py-3 2xl:text-base"
      >
        {isSpinning
          ? dict.generator.spinningCurses
          : dict.generator.spinChaosWheel}
      </DbdButton>
    </div>

    {/* Spin result and already active curse share one card, with the Active badge. */}
    {shownMutator && locShown && (
      <div
        aria-live="polite"
        className={`mt-3 sm:mt-4 xl:mt-5 rounded-card border p-3 sm:p-4 bg-bg-primary ${shownMutator.borderColor || 'border-border-color'}`}
      >
        {/* On a phone the actions drop under the text, so the description gets the full width and is never cut. */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="text-xl sm:text-2xl shrink-0" aria-hidden="true">{shownMutator.icon}</span>
            <div className="min-w-0">
              <h3 className={`text-xs sm:text-sm font-extrabold ${shownMutator.textColor}`}>
                {locShown.name}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">{locShown.description}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 shrink-0 sm:justify-end">
            <Button
              type="button"
              onClick={handleClearCurse}
              {...tip(dict.generator.clearMutatorTooltip, undefined, 'action')} aria-label={dict.generator.clearMutatorTooltip}
              variant="ghostDanger" size="sm"
            >
              <Trash2 className="icon-sm sm:icon-md" />
              <span>{dict.generator.clearMutator}</span>
            </Button>
            <div className="flex items-center gap-1 text-accent-green type-strong-fluid bg-accent-green/10 px-2.5 py-1 rounded-chip border border-accent-green/30">
              <Check className="icon-sm sm:icon-md" aria-hidden="true" />
              <span>{dict.smashOrPass.active}</span>
            </div>
          </div>
        </div>
      </div>
    )}
    </Modal>
  );
};
