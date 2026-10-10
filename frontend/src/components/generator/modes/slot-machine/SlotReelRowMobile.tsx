'use client';
// frontend/src/components/generator/modes/slot-machine/SlotReelRowMobile.tsx
import React from 'react';
import { Ban, Check, Lock, Plus } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import { Tooltip } from '@/components/common/Tooltip';
import { cn } from '@/utils/cn';
import { getPerkIconUrl } from '@/utils/perkUtils';
import type { MachinePhase, Reel } from './slotMachineTypes';

export interface SlotReelProps {
  reel: Reel;
  cellPx: number;
  phase: MachinePhase;
  isStaged: boolean;
  isSpinning: boolean;
  backendBase?: string;
  toggleStage: (id: number) => void;
  handleReelTransitionEnd: (id: number, e: React.TransitionEvent<HTMLDivElement>) => void;
}

/** Mobile layout: one stacked row per reel, spinning left to right. */
export function SlotReelRowMobile({
  reel,
  cellPx,
  phase,
  isStaged,
  isSpinning,
  backendBase,
  toggleStage,
  handleReelTransitionEnd,
}: SlotReelProps) {
  const dict = useDictionary();
  const isClickable = phase === 'awaiting' && !reel.locked && !reel.broken && !isSpinning;
  const landedBroken = reel.broken && !isSpinning;

  const mobileWindow = (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? () => toggleStage(reel.id) : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') toggleStage(reel.id);
            }
          : undefined
      }
      className={cn(
        'relative overflow-hidden rounded-xl border-2 shadow-inner transition-colors duration-200 shrink-0',
        'bg-gradient-to-r from-bg-elevated/40 via-bg-surface to-bg-elevated/40',
        isClickable && 'cursor-pointer',
        reel.locked
          ? 'border-accent-amber'
          : isStaged
          ? 'border-accent-green'
          : landedBroken
          ? 'border-accent-red/70'
          : 'border-border-color hover:border-accent-amber/40'
      )}
      style={{ height: cellPx, width: cellPx * 3 }}
    >
      {/* Horizontal Moving Strip (Animates Left to Right) */}
      <div
        key={reel.spinToken}
        onTransitionEnd={(e) => handleReelTransitionEnd(reel.id, e)}
        className="flex flex-row ease-[cubic-bezier(0.13,0.82,0.22,1)]"
        style={{
          transform: `translateX(${reel.translateX}px)`,
          transition: reel.strip.length
            ? `transform ${reel.spinDurationMs}ms cubic-bezier(0.13,0.82,0.22,1)`
            : 'none',
        }}
      >
        {reel.strip.map((cell, i) => {
          const coordLabel =
            cell.perk && cell.page !== undefined && cell.slot !== undefined
              ? `${dict.generator.coordOpenPage}${cell.page}${dict.generator.coordSlot}${cell.slot}${dict.generator.coordClose}`
              : null;
          return (
            <div
              key={i}
              className="relative flex shrink-0 items-center justify-center"
              style={{ width: cellPx, height: cellPx }}
            >
              {cell.broken ? (
                <Ban className="text-accent-red" style={{ height: cellPx * 0.65, width: cellPx * 0.65 }} />
              ) : cell.perk ? (
                <img
                  src={getPerkIconUrl(cell.perk, backendBase) || ''}
                  alt=""
                  className="object-contain drop-shadow-md"
                  style={{ height: cellPx * 0.72, width: cellPx * 0.72 }}
                  loading="lazy"
                />
              ) : (
                <div
                  className="rounded-md bg-bg-elevated border border-border-color"
                  style={{ height: cellPx * 0.65, width: cellPx * 0.65 }}
                />
              )}
              {coordLabel && (
                <span
                  className="pointer-events-none absolute left-1 top-1 z-10 whitespace-nowrap font-black text-accent-amber drop-shadow-xs"
                  style={{ fontSize: Math.max(8, Math.min(11, cellPx * 0.12)) }}
                >
                  {coordLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Center Payline Target Box */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 z-10 border-x-2 border-accent-amber/70 bg-accent-amber/10"
        style={{ left: cellPx, width: cellPx }}
      />

      {/* Left and Right Vignette Gradients */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-r from-bg-surface/85 via-transparent to-bg-surface/85"
      />
    </div>
  );

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 p-1.5 rounded-xl border transition-all duration-200 w-full',
        reel.locked
          ? 'bg-accent-amber/10 border-accent-amber/60 shadow-xs'
          : isStaged
          ? 'bg-accent-green/10 border-accent-green/60 shadow-xs hover:border-accent-green hover:shadow-sm hover:shadow-accent-green/30'
          : landedBroken
          ? 'bg-accent-red/10 border-accent-red/50'
          : isClickable
          ? 'bg-bg-elevated/40 border-border-color hover:bg-bg-elevated/70 hover:border-accent-amber/70 hover:shadow-sm hover:shadow-accent-amber/25'
          : 'bg-bg-elevated/40 border-border-color'
      )}
    >
      {/* Reel Identifier / Status Badge */}
      <div className="flex flex-col items-center justify-center w-14 sm:w-16 shrink-0">
        <span
          className={cn(
            'text-mini sm:text-xs font-black uppercase tracking-wider text-center',
            reel.locked
              ? 'text-accent-amber'
              : landedBroken
              ? 'text-accent-red'
              : isStaged
              ? 'text-accent-green'
              : 'text-text-secondary'
          )}
        >
          {reel.locked
            ? (dict.generator.slotLockedLabel)
            : landedBroken
            ? (dict.generator.slotBrokenLabel)
            : `#${reel.id + 1}`}
        </span>
        {reel.locked ? (
          <Lock className="h-4 w-4 text-accent-amber mt-0.5" />
        ) : landedBroken ? (
          <Ban className="h-4 w-4 text-accent-red mt-0.5" />
        ) : null}
      </div>

      {/* Horizontal Reel Window */}
      {landedBroken ? (
        <Tooltip variant="action"
          title={dict.generator.slotJammedTitle}
          description={
            dict.generator.slotJammedDesc
          }
        >
          {mobileWindow}
        </Tooltip>
      ) : (
        mobileWindow
      )}

      {/* Action / Lock Target Button */}
      <div className="shrink-0 flex items-center justify-center w-11 sm:w-12">
        {isClickable ? (
          <button
            type="button"
            onClick={() => toggleStage(reel.id)}
            className={cn(
              'pointer-coarse:min-h-11 pointer-coarse:min-w-11 h-10 w-10 rounded-xl flex items-center justify-center font-black transition-all duration-200 cursor-pointer touch-manipulation border shadow-xs',
              isStaged
                ? 'bg-accent-green text-text-inverted border-accent-green hover:bg-accent-green/90 hover:scale-110 active:scale-95 hover:shadow-md hover:shadow-accent-green/40'
                : 'bg-bg-elevated text-text-secondary border-border-color hover:text-text-primary hover:border-accent-amber hover:bg-bg-elevated/90 hover:scale-110 active:scale-95 hover:shadow-md hover:shadow-accent-amber/35'
            )}
            aria-label={`#${reel.id + 1}`}
          >
            {isStaged ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </button>
        ) : reel.locked ? (
          <div className="h-10 w-10 rounded-xl bg-accent-amber/20 border border-accent-amber/40 flex items-center justify-center text-accent-amber">
            <Lock className="h-5 w-5" />
          </div>
        ) : (
          <div className="h-10 w-10" />
        )}
      </div>
    </div>
  );
}
