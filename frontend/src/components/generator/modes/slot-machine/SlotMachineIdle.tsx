'use client';
// frontend/src/components/generator/modes/slot-machine/SlotMachineIdle.tsx
import React from 'react';
import type { RoleCategory } from '@/types/perks';
import { useDictionary } from '@/context/DictionaryContext';
import { DbdButton } from '../../shared/DbdButton';

interface SlotMachineIdleProps {
  role: RoleCategory;
  disabled: boolean;
  onPull: () => void;
}

/** The resting screen: flavour text, the lever and the spin button. */
export function SlotMachineIdle({ role, disabled, onPull }: SlotMachineIdleProps) {
  const dict = useDictionary();

  return (
    <div className="flex flex-col items-center justify-center gap-3 sm:gap-6 xl:gap-8 2xl:gap-10 py-2 sm:py-6 wide:py-8">
      <p className="max-w-lg xl:max-w-2xl 2xl:max-w-3xl wide:max-w-4xl text-center text-xs sm:text-base xl:text-lg wide:text-xl font-semibold text-text-secondary leading-relaxed">
        {dict.generator.slotMachinePrompt}
        {' '}
        {dict.generator.slotCursedFlavor}
      </p>
      <button
        type="button"
        onClick={onPull}
        disabled={disabled}
        className="group cursor-pointer disabled:cursor-default transition-transform hover:scale-105 active:scale-95"
      >
        <img
          src="/images/randomizer/lever.webp"
          alt=""
          className="h-28 w-28 sm:h-36 sm:w-36 xl:h-48 xl:w-48 2xl:h-60 2xl:w-60 wide:h-72 wide:w-72 object-contain drop-shadow-2xl select-none pointer-events-none group-hover:drop-shadow-[0_0_24px_var(--color-accent-amber)] transition-all duration-300"
          draggable={false}
        />
      </button>
      <DbdButton
        role={role}
        size="lg"
        onClick={onPull}
        disabled={disabled}
      >
        {dict.generator.slotMachineSpinButton}
      </DbdButton>
    </div>
  );
}
