// frontend/src/components/generator/ModeSwitcher.tsx
'use client';

import React from 'react';
import type { GeneratorMode } from '@/types/perks';

import { SegmentedControl } from '@/components/common/SegmentedControl';
import { CustomDropdown } from '@/components/common/CustomDropdown';


import { useDictionary } from "@/context/DictionaryContext";

interface ModeSwitcherProps {
  mode: GeneratorMode;
  onChange: (mode: GeneratorMode) => void;
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ mode, onChange }) => {
  const dict = useDictionary();
  const options = [
    {
      value: 'instant' as GeneratorMode,
      label: dict.generator.modeInstant,
      shortLabel: 'Instant',
      tooltip: { description: dict.generator.modeInstantTooltip },
    },
    {
      value: 'wheel' as GeneratorMode,
      label: dict.generator.modeWheel,
      shortLabel: 'Wheel',
      tooltip: { description: dict.generator.modeWheelTooltip },
    },
    {
      value: 'slot' as GeneratorMode,
      label: dict.generator.modeSlot,
      shortLabel: 'Slot',
      tooltip: { description: dict.generator.modeSlotTooltip },
    },
    {
      value: 'tarot' as GeneratorMode,
      label: dict.generator.modeTarot,
      shortLabel: 'Tarot',
      tooltip: { description: dict.generator.modeTarotTooltip },
    },
    {
      value: 'crate' as GeneratorMode,
      label: dict.generator.modeCrate,
      shortLabel: 'Crate',
      tooltip: { description: dict.generator.modeCrateTooltip },
    },
  ];

  return (
    <>
      {/* Smaller screens (< 2xl: the sidebar leaves too little width for five modes next to the toolbar): Clean Dropdown */}
      <div className="w-full 2xl:hidden flex justify-center">
        <CustomDropdown<GeneratorMode>
          value={mode}
          onChange={onChange}
          options={options.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          ariaLabel={dict.generator.modeSwitcherAriaLabel}
          accent="primary"
          className="w-full sm:w-auto"
          buttonClassName="w-full sm:w-auto justify-between min-h-11 px-4 py-2 type-card-title border border-border-color bg-bg-surface hover:bg-bg-elevated text-text-primary"
          menuClassName="w-full sm:w-auto min-w-55"
        />
      </div>

      {/* Large Desktop (>= 2xl: 1536px+): Sleek Horizontal Segmented Control */}
      <div className="hidden 2xl:block">
        <SegmentedControl<GeneratorMode>
          value={mode}
          onChange={onChange}
          ariaLabel={dict.generator.modeSwitcherAriaLabel}
          bare
          options={options}
        />
      </div>
    </>
  );
};
