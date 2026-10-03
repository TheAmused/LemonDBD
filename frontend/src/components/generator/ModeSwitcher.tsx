// frontend/src/components/generator/ModeSwitcher.tsx
'use client';

import React from 'react';
import { GeneratorMode } from '@/types/perks';
import { Dictionary } from '@/locales/types';
import { SegmentedControl } from './shared/SegmentedControl';
import { CustomDropdown } from '@/components/common/CustomDropdown';

import { cn } from '@/utils/cn';
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
      {/* Smaller screens (< xl: mobile, tablet, 1024px laptop): Clean Dropdown */}
      <div className="w-full xl:hidden flex justify-center">
        <CustomDropdown<GeneratorMode>
          value={mode}
          onChange={onChange}
          options={options.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          ariaLabel={dict.generator.modeSwitcherAriaLabel}
          className="w-full sm:w-auto"
          buttonClassName="w-full sm:w-auto justify-between min-h-[44px] px-4 py-2 type-card-title rounded-xl border border-border-color bg-bg-surface hover:bg-bg-elevated text-text-primary"
          menuClassName="w-full sm:w-auto min-w-[220px]"
        />
      </div>

      {/* Large Desktop (>= xl: 1280px+): Sleek Horizontal Segmented Control */}
      <div className="hidden xl:block">
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
