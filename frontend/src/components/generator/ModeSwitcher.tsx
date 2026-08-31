'use client';

import React from 'react';
import { CircleDot, Zap, Rows3, Layers, Gift } from 'lucide-react';
import { GeneratorMode } from '@/types/perks';
import { Dictionary } from '@/locales/types';
import { SegmentedControl } from './shared/SegmentedControl';

interface ModeSwitcherProps {
  mode: GeneratorMode;
  onChange: (mode: GeneratorMode) => void;
  dict?: Dictionary;
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ mode, onChange, dict }) => {
  return (
    <SegmentedControl<GeneratorMode>
      value={mode}
      onChange={onChange}
      ariaLabel={dict?.generator?.modeSwitcherAriaLabel || 'Select Draw Mode'}
      bare
      options={[
        {
          value: 'instant',
          label: dict?.generator?.modeInstant || 'Instant Roll',
          icon: <Zap className="h-3.5 w-3.5" />,
          tooltip: { description: dict?.generator?.modeInstantTooltip || 'Draw all four perks at once -- no ceremony, just the result.' },
        },
        {
          value: 'wheel',
          label: dict?.generator?.modeWheel || 'Wheel of Fortune',
          icon: <CircleDot className="h-3.5 w-3.5" />,
          tooltip: { description: dict?.generator?.modeWheelTooltip || 'Spin the page wheel, then the perk wheel, once per slot until your loadout is full.' },
        },
        {
          value: 'slot',
          label: dict?.generator?.modeSlot || 'Slot Machine',
          icon: <Rows3 className="h-3.5 w-3.5" />,
          tooltip: { description: dict?.generator?.modeSlotTooltip || 'Pull the lever and lock in reels over up to 3 cycles. A reel or two may jam broken -- reroll the whole machine to clear it.' },
        },
        {
          value: 'tarot',
          label: dict?.generator?.modeTarot || 'Tarot Deck',
          icon: <Layers className="h-3.5 w-3.5" />,
          tooltip: { description: dict?.generator?.modeTarotTooltip || 'Shuffle the deck and flip cards to reveal your loadout, one omen at a time.' },
        },
        {
          value: 'crate',
          label: dict?.generator?.modeCrate || 'Loot Crate',
          icon: <Gift className="h-3.5 w-3.5" />,
          tooltip: { description: dict?.generator?.modeCrateTooltip || 'Crack open a Trial Offering for a random loadout in one go.' },
        },
      ]}
    />
  );
};
