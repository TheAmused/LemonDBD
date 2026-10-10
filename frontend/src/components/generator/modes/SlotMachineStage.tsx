// frontend/src/components/generator/modes/SlotMachineStage.tsx
'use client';

import React from 'react';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { cn } from '@/utils/cn';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from '@/context/DictionaryContext';
import { DbdButton } from '../shared/DbdButton';
import { SlotMachineComplete } from './slot-machine/SlotMachineComplete';
import { SlotMachineIdle } from './slot-machine/SlotMachineIdle';
import { SlotReelColumnDesktop } from './slot-machine/SlotReelColumnDesktop';
import { SlotReelRowMobile } from './slot-machine/SlotReelRowMobile';
import { useSlotMachine } from './slot-machine/useSlotMachine';

export interface SlotMachineStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  revealedSlots: boolean[];
  onRevealSlot: (idx: number) => void;
  onSelectPerk: (perk: Perk) => void;
  isBlind?: boolean;
  backendBase?: string;
}

export const SlotMachineStage: React.FC<SlotMachineStageProps> = ({
  role,
  activePlayablePerks,
  activeMutator,
  onRollComplete,
  revealedSlots,
  onRevealSlot,
  onSelectPerk,
  isBlind = false,
  backendBase,
}) => {
  const dict = useDictionary();
  const machine = useSlotMachine({ role, activePlayablePerks, activeMutator, onRollComplete });
  const {
    phase, reels, spinningIds, staged, cycleIndex, selected, cellPx, isMobile,
    reelAreaRef, resultsRef, canConfirm, confirmHint,
    handleReelTransitionEnd, handlePullLever, toggleStage, handleConfirm, handleReset,
  } = machine;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 sm:gap-4 py-1 sm:py-4">
      <div className="relative flex w-full flex-1 min-h-0 flex-col items-center justify-center gap-2 sm:gap-4">
        {/* Permanently-mounted, invisible measurement box -- always the
            same box the reel row occupies once phase is spinning/awaiting,
            so cellPx is measured continuously and is already correct
            before the very first spin (see the sizing effect above). */}
        <div ref={reelAreaRef} aria-hidden="true" className="pointer-events-none invisible absolute inset-0" />

        {phase === 'idle' && (
          <SlotMachineIdle role={role} disabled={activePlayablePerks.length === 0} onPull={handlePullLever} />
        )}

      {(phase === 'spinning' || phase === 'awaiting') && (
        <>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-black uppercase tracking-wide text-accent-amber">
            <span>{formatMessage((dict.generator.slotCycleLabel), { cycle: cycleIndex + 1 })}</span>
            <span className="text-text-muted">{'•'}</span>
            <span>{formatMessage((dict.generator.slotLockedCount), { count: selected.length })}</span>
          </div>

          {isMobile ? (
            /* Mobile Layout: 8 Vertically Stacked Reel Rows with Horizontal Left-to-Right Spin */
            <div className="flex flex-col gap-2 w-full max-w-md mx-auto px-1">
              {reels.map((reel) => (
                <SlotReelRowMobile
                  key={reel.id}
                  reel={reel}
                  cellPx={cellPx}
                  phase={phase}
                  isStaged={staged.has(reel.id)}
                  isSpinning={spinningIds.has(reel.id)}
                  backendBase={backendBase}
                  toggleStage={toggleStage}
                  handleReelTransitionEnd={handleReelTransitionEnd}
                />
              ))}
            </div>
          ) : (
            /* Desktop Layout: 8 Vertical Columns Side-by-Side */
            <div className="grid grid-cols-4 md:grid-cols-8 items-center justify-items-center justify-center gap-1.5 sm:gap-2.5 w-full max-w-full px-1">
              {reels.map((reel) => (
                <SlotReelColumnDesktop
                  key={reel.id}
                  reel={reel}
                  cellPx={cellPx}
                  phase={phase}
                  isStaged={staged.has(reel.id)}
                  isSpinning={spinningIds.has(reel.id)}
                  backendBase={backendBase}
                  toggleStage={toggleStage}
                  handleReelTransitionEnd={handleReelTransitionEnd}
                />
              ))}
            </div>
          )}

          {/* Always mounted (just visibility-toggled) while spinning or
              awaiting, instead of only rendering during 'awaiting' -- this
              keeps the total content height in this column identical
              across both phases. Otherwise the reel row's flex-1 share of
              the fixed-height stage box changes the instant these two
              lines (dis)appear, which reflows cellPx right as a spin
              lands and desyncs the already-scrolled strip from its
              newly-resized cells -- reels visibly resize/misalign the
              moment the spin ends. */}
          <div className={cn('flex flex-col items-center gap-1.5 sm:gap-3', phase !== 'awaiting' && 'invisible')}>
            <p aria-live="polite" className="max-w-lg text-center text-xs sm:text-base font-bold text-text-secondary">
              {confirmHint}
            </p>
            <DbdButton
              role={role}
              size="md"
              onClick={handleConfirm}
              disabled={!canConfirm || phase !== 'awaiting'}
            >
              {dict.generator.slotConfirmSelection}
            </DbdButton>
          </div>
        </>
      )}

      {phase === 'complete' && (
        <SlotMachineComplete
          role={role}
          selected={selected}
          activeMutator={activeMutator}
          revealedSlots={revealedSlots}
          onRevealSlot={onRevealSlot}
          onSelectPerk={onSelectPerk}
          isBlind={isBlind}
          resultsRef={resultsRef}
          onReset={handleReset}
        />
      )}
      </div>
    </div>
  );
};
