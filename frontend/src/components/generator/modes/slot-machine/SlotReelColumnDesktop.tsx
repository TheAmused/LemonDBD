'use client';
// frontend/src/components/generator/modes/slot-machine/SlotReelColumnDesktop.tsx
import React from 'react';
import { Ban, Lock } from 'lucide-react';
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

/** Desktop layout: one vertical column per reel, spinning upwards. */
export function SlotReelColumnDesktop({
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

  const reelWindow = (
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
        'relative overflow-hidden rounded-lg border-2 shadow-inner transition-all duration-200',
        'bg-gradient-to-b from-bg-elevated/40 via-bg-surface to-bg-elevated/40',
        isClickable && 'cursor-pointer hover:scale-[1.03] active:scale-[0.98]',
        reel.locked
          ? 'border-accent-amber'
          : isStaged
            ? 'border-accent-green hover:border-accent-green hover:shadow-md hover:shadow-accent-green/40'
            : landedBroken
              ? 'border-accent-red/70'
              : isClickable
                ? 'border-border-color hover:border-accent-amber hover:shadow-md hover:shadow-accent-amber/40'
                : 'border-border-color'
      )}
      style={{ height: cellPx * 3, width: cellPx }}
    >
      <div
        key={reel.spinToken}
        onTransitionEnd={(e) => handleReelTransitionEnd(reel.id, e)}
        className="flex flex-col ease-[cubic-bezier(0.13,0.82,0.22,1)]"
        style={{
          transform: `translateY(${reel.translateY}px)`,
          transition: reel.strip.length ? `transform ${reel.spinDurationMs}ms cubic-bezier(0.13,0.82,0.22,1)` : 'none',
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
              style={{ height: cellPx }}
            >
              {cell.broken ? (
                <Ban className="text-accent-red" style={{ height: cellPx * 0.58, width: cellPx * 0.58 }} />
              ) : cell.perk ? (
                <img
                  src={getPerkIconUrl(cell.perk, backendBase) || ''}
                  alt=""
                  className="object-contain drop-shadow-md"
                  style={{ height: cellPx * 0.62, width: cellPx * 0.62 }}
                  loading="lazy"
                />
              ) : (
                <div className="rounded-md bg-bg-elevated border border-border-color" style={{ height: cellPx * 0.62, width: cellPx * 0.62 }} />
              )}
              {coordLabel && (
                <span
                  className="pointer-events-none absolute left-0.5 top-0.5 z-10 whitespace-nowrap font-black text-accent-amber drop-shadow-xs"
                  style={{ fontSize: Math.max(7, Math.min(11, cellPx * 0.09)) }}
                >
                  {coordLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-bg-surface/85 via-transparent to-bg-surface/85" />
    </div>
  );

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5" style={{ width: cellPx }}>
      {/* Wrapping the window (rather than nesting the badge inside
          it) keeps the lock badge un-clipped: the window itself
          needs `overflow-hidden` to mask the spinning strip, and
          a badge positioned with a negative offset to "peek out"
          of a clipped ancestor gets clipped right along with it. */}
      <div className="relative">
        {landedBroken ? (
          <Tooltip variant="action"
            title={dict.generator.slotJammedTitle}
            description={
              dict.generator.slotJammedDesc
            }
          >
            {reelWindow}
          </Tooltip>
        ) : (
          reelWindow
        )}
        {reel.locked && (
          <div className="absolute -top-2 -right-2 z-30 flex h-6 w-6 items-center justify-center rounded-full bg-accent-amber text-text-inverted shadow-xs">
            <Lock className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <span
        className={cn(
          'text-tiny font-black uppercase tracking-wide',
          reel.locked ? 'text-accent-amber' : landedBroken ? 'text-accent-red' : 'text-text-muted'
        )}
      >
        {reel.locked ? (dict.generator.slotLockedLabel) : landedBroken ? (dict.generator.slotBrokenLabel) : `#${reel.id + 1}`}
      </span>
    </div>
  );
}
