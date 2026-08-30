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
      className="w-full justify-start"
      options={[
        { value: 'wheel', label: dict?.generator?.modeWheel || 'Wheel of Fortune', icon: <CircleDot className="h-3.5 w-3.5" /> },
        { value: 'instant', label: dict?.generator?.modeInstant || 'Instant Roll', icon: <Zap className="h-3.5 w-3.5" /> },
        { value: 'slot', label: dict?.generator?.modeSlot || 'Slot Machine', icon: <Rows3 className="h-3.5 w-3.5" /> },
        { value: 'tarot', label: dict?.generator?.modeTarot || 'Tarot Deck', icon: <Layers className="h-3.5 w-3.5" /> },
        { value: 'crate', label: dict?.generator?.modeCrate || 'Loot Crate', icon: <Gift className="h-3.5 w-3.5" /> },
      ]}
    />
  );
};
