'use client';
// frontend/src/components/generator/modes/slot-machine/SlotMachineIdle.tsx
import React from 'react';
import type { RoleCategory } from '@/types/perks';
import { useDictionary } from '@/context/DictionaryContext';
import { DbdButton } from '@/components/common/Button';
import { TileButton } from '@/components/common/TileButton';
import { StageIdleColumn, StagePrompt, StageProp } from '../../shared/StageIdle';
import { publicImageThumb } from '@/utils/publicThumb';

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
      <div className="flex flex-col items-center gap-1.5">
        <StagePrompt>{dict.generator.slotMachinePrompt}</StagePrompt>
        <StagePrompt className="font-normal text-text-muted sm:text-sm xl:text-base wide:text-lg">{dict.generator.slotCursedFlavor}</StagePrompt>
      </div>
      <TileButton
        onClick={onPull}
        disabled={disabled}
        className="group"
      >
        <StageProp src={publicImageThumb('/images/randomizer/lever.webp')} />
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
