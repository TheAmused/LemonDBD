'use client';
// frontend/src/components/generator/modes/slot-machine/SlotMachineIdle.tsx
import React from 'react';
import type { RoleCategory } from '@/types/perks';
import { useDictionary } from '@/context/DictionaryContext';
import { DbdButton } from '@/components/common/Button';
import { TileButton } from '@/components/common/TileButton';
import { StageIdleColumn, StagePrompt, StageProp } from '../../shared/StageIdle';

interface SlotMachineIdleProps {
  role: RoleCategory;
  disabled: boolean;
  onPull: () => void;
}

/** The resting screen: flavour text, the lever and the spin button. */
export function SlotMachineIdle({ role, disabled, onPull }: SlotMachineIdleProps) {
  const dict = useDictionary();

  return (
    <StageIdleColumn>
      <StagePrompt className="leading-relaxed">
        {dict.generator.slotMachinePrompt}
        {' '}
        {dict.generator.slotCursedFlavor}
      </StagePrompt>
      <TileButton
        onClick={onPull}
        disabled={disabled}
        className="group"
      >
        <StageProp src="/images/randomizer/lever.webp" />
      </TileButton>
      <DbdButton
        role={role}
        size="lg"
        onClick={onPull}
        disabled={disabled}
      >
        {dict.generator.slotMachineSpinButton}
      </DbdButton>
    </StageIdleColumn>
  );
}
