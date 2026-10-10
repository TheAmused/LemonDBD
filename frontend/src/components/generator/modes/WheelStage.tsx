// frontend/src/components/generator/modes/WheelStage.tsx
'use client';

import React from 'react';
import { DbdButton } from '../shared/DbdButton';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { getSlotInteraction } from '../lib/blindnessCurse';
import { PerkSlot } from '../shared/PerkSlot';
import { useDictionary } from '@/context/DictionaryContext';
import { useWheelStage } from './wheel/useWheelStage';

export interface WheelStageProps {
  totalPages: number;
  perksPerPage: number;
  lastPagePerks: number;
  spinDurationSec: number;
  role: RoleCategory;
  sortedPerks: Perk[];
  loadout: (DrawnSlot | null)[];
  activeSlotIdx: number;
  activeMutator: ChaosMutator | null;
  onWinSlot: (wonData: DrawnSlot) => void;
  revealedSlots: boolean[];
  onRevealSlot: (idx: number) => void;
  onSelectPerk: (perk: Perk) => void;
  isBlind?: boolean;
  backendBase?: string;
}

export const WheelStage: React.FC<WheelStageProps> = ({
  totalPages,
  perksPerPage,
  lastPagePerks,
  spinDurationSec,
  role,
  sortedPerks,
  loadout,
  activeSlotIdx,
  onWinSlot,
  revealedSlots,
  onRevealSlot,
  onSelectPerk,
  isBlind = false,
  backendBase,
  activeMutator,
}) => {
  const dict = useDictionary();
  const {
    isSpinning, isMorphing, statusText, reduceMotion,
    wheelCanvasRef, particlesCanvasRef, wheelWrapperRef,
    spinButtonText, handleStartSpin,
  } = useWheelStage({
    totalPages, perksPerPage, lastPagePerks, spinDurationSec, role, sortedPerks,
    activeSlotIdx, activeMutator, onWinSlot, backendBase,
  });

  const renderFlankSlot = (idx: number) => {
    const slotData = loadout[idx];
    const perk = slotData?.perk;
    const { isObscured, onClick } = getSlotInteraction(
      idx,
      perk,
      activeMutator,
      revealedSlots,
      onRevealSlot,
      onSelectPerk
    );

    return (
      <PerkSlot
        key={idx}
        perk={perk}
        role={role}
        page={slotData?.page}
        slot={slotData?.slot}
        isActive={activeSlotIdx === idx}
        isObscured={isObscured}
        isBlind={isBlind}
        size="wheelFlank"
        onClick={onClick}
      />
    );
  };

  return (
    <div className="flex h-full w-full flex-1 flex-col items-center justify-center gap-2 sm:gap-3 pt-3 pb-1 sm:pt-4">
      <p className="max-w-md text-center type-strong-fluid text-text-secondary px-3 line-clamp-2 sm:line-clamp-none">
        {dict.generator.spinOrRollPrompt}
      </p>

      <div className="flex w-full flex-col items-center justify-center gap-2 sm:gap-3 xl:flex-row xl:items-center xl:justify-center xl:gap-6 2xl:gap-14 wide:gap-20 wide-2k:gap-28 wide-4k:gap-36">
        <div className="order-2 grid grid-cols-2 gap-2 sm:gap-3 xl:order-1 xl:grid-cols-1 xl:gap-4 2xl:gap-6 wide:gap-8 wide-2k:gap-10 wide-4k:gap-14">
          {renderFlankSlot(0)}
          {renderFlankSlot(1)}
        </div>

        <div ref={wheelWrapperRef} className="order-1 flex flex-col items-center justify-center xl:order-2">
          <div className="relative flex items-center justify-center w-full">
            <canvas
              ref={particlesCanvasRef}
              width={800}
              height={800}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-20 h-full w-full"
            />
            <div
              role={!isSpinning && sortedPerks.length > 0 ? 'button' : undefined}
              tabIndex={!isSpinning && sortedPerks.length > 0 ? 0 : undefined}
              aria-label={dict.generator.spinWheelButton}
              onClick={!isSpinning && sortedPerks.length > 0 ? handleStartSpin : undefined}
              onKeyDown={
                !isSpinning && sortedPerks.length > 0
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleStartSpin();
                      }
                    }
                  : undefined
              }
              // Width and height are driven by the *same* min() expression at every
              // breakpoint (matching PerkSlot's `fill` size pattern) instead of an
              // independent max-w (vw-based) paired with an independent max-h
              // (dvh-based) constrained via aspect-square. Those two caps could land
              // on different pixel values -- e.g. a wide-but-short window, or a
              // mobile browser's dvh shrinking as the post-spin result text and
              // flavor line grow the page below the wheel -- and since the width
              // here is a definite size (not auto), CSS clamps height to max-h
              // without re-deriving width from the new aspect ratio, flattening the
              // circle into an oval. Deriving both axes from one shared min()
              // makes them structurally identical, so they can never diverge.
              className={`w-[min(62vw,36dvh)] h-[min(62vw,36dvh)] min-w-[200px] min-h-[200px] sm:w-[min(285px,38dvh)] sm:h-[min(285px,38dvh)] md:w-[min(320px,38dvh)] md:h-[min(320px,38dvh)] lg:w-[min(350px,38dvh)] lg:h-[min(350px,38dvh)] xl:w-[min(480px,46dvh)] xl:h-[min(480px,46dvh)] 2xl:w-[min(600px,52dvh)] 2xl:h-[min(600px,52dvh)] wide:w-[min(720px,58dvh)]! wide:h-[min(720px,58dvh)]! wide-2k:w-[min(900px,60dvh)]! wide-2k:h-[min(900px,60dvh)]! wide-4k:w-[min(1100px,62dvh)]! wide-4k:h-[min(1100px,62dvh)]! transition-all duration-300 ease-out transform select-none ${
                !isSpinning && sortedPerks.length > 0
                  ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:drop-shadow-[0_0_24px_var(--color-accent-amber)]'
                  : ''
              } ${
                isMorphing && !reduceMotion ? 'scale-75 opacity-0 rotate-[180deg]' : 'scale-100 opacity-100 rotate-0'
              }`}
            >
              <canvas
                ref={wheelCanvasRef}
                width={800}
                height={800}
                className="h-full w-full"
              />
            </div>
          </div>

          <DbdButton
            role={role}
            size="md"
            onClick={handleStartSpin}
            disabled={isSpinning || sortedPerks.length === 0}
            className="mt-2 sm:mt-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
          >
            {spinButtonText}
          </DbdButton>

          {statusText && (
            <p aria-live="polite" className="sr-only">
              {statusText}
            </p>
          )}
        </div>

        <div className="order-3 grid grid-cols-2 gap-2 sm:gap-3 xl:order-3 xl:grid-cols-1 xl:gap-4 2xl:gap-6 wide:gap-8 wide-2k:gap-10 wide-4k:gap-14">
          {renderFlankSlot(2)}
          {renderFlankSlot(3)}
        </div>
      </div>
    </div>
  );
};
