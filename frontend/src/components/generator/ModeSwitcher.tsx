// frontend/src/components/generator/ModeSwitcher.tsx
'use client';

import React from 'react';
import { CircleDot, Zap, Rows3, Layers, Gift, Check } from 'lucide-react';
import { GeneratorMode } from '@/types/perks';
import { Dictionary } from '@/locales/types';
import { SegmentedControl } from './shared/SegmentedControl';
import { CustomDropdown } from '@/components/common/CustomDropdown';

import { cn } from '@/utils/cn';

interface ModeSwitcherProps {
  mode: GeneratorMode;
  onChange: (mode: GeneratorMode) => void;
  dict?: Dictionary;
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ mode, onChange, dict }) => {
  const options = [
    {
      value: 'instant' as GeneratorMode,
      label: dict?.generator?.modeInstant || 'Instant Roll',
      shortLabel: 'Instant',
      icon: <Zap className="h-5 w-5 shrink-0" />,
      tooltip: { description: dict?.generator?.modeInstantTooltip || 'Draw all four perks at once, no ceremony, just the result.' },
    },
    {
      value: 'wheel' as GeneratorMode,
      label: dict?.generator?.modeWheel || 'Wheel of Fortune',
      shortLabel: 'Wheel',
      icon: <CircleDot className="h-5 w-5 shrink-0" />,
      tooltip: { description: dict?.generator?.modeWheelTooltip || 'Spin the page wheel, then the perk wheel, once per slot until your loadout is full.' },
    },
    {
      value: 'slot' as GeneratorMode,
      label: dict?.generator?.modeSlot || 'Slot Machine',
      shortLabel: 'Slot',
      icon: <Rows3 className="h-5 w-5 shrink-0" />,
      tooltip: { description: dict?.generator?.modeSlotTooltip || 'Pull the lever and lock in reels over up to 3 cycles. A reel or two may jam broken, reroll the whole machine to clear it.' },
    },
    {
      value: 'tarot' as GeneratorMode,
      label: dict?.generator?.modeTarot || 'Tarot Deck',
      shortLabel: 'Tarot',
      icon: <Layers className="h-5 w-5 shrink-0" />,
      tooltip: { description: dict?.generator?.modeTarotTooltip || 'Shuffle the deck and flip cards to reveal your loadout, one omen at a time.' },
    },
    {
      value: 'crate' as GeneratorMode,
      label: dict?.generator?.modeCrate || 'Loot Crate',
      shortLabel: 'Crate',
      icon: <Gift className="h-5 w-5 shrink-0" />,
      tooltip: { description: dict?.generator?.modeCrateTooltip || 'Crack open a Trial Offering for a random loadout in one go.' },
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
            icon: opt.icon,
          }))}
          ariaLabel={dict?.generator?.modeSwitcherAriaLabel || 'Select Draw Mode'}
          className="w-full sm:w-auto"
          buttonClassName="w-full sm:w-auto justify-between min-h-[44px] px-4 py-2 text-sm font-extrabold rounded-xl border border-border-color bg-bg-surface hover:bg-bg-elevated text-text-primary"
          menuClassName="w-full sm:w-auto min-w-[220px]"
        />
      </div>

      {/* Large Desktop (>= xl: 1280px+): Sleek Horizontal Segmented Control */}
      <div className="hidden xl:block">
        <SegmentedControl<GeneratorMode>
          value={mode}
          onChange={onChange}
          ariaLabel={dict?.generator?.modeSwitcherAriaLabel || 'Select Draw Mode'}
          bare
          options={options.map((opt) => ({
            ...opt,
            icon: React.cloneElement(opt.icon as React.ReactElement<{ className?: string }>, {
              className: 'h-4 w-4 2xl:h-5 2xl:w-5 shrink-0',
            }),
          }))}
        />
      </div>
    </>
  );
};
