'use client';
// frontend/src/components/common/NsfwSwitch.tsx
import { LabeledSwitch } from '@/components/common/Switch';

interface NsfwSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}

/** The "Contains NSFW content" switch the tier list and minigame creators share with the roster creator. */
export function NsfwSwitch({ checked, onChange, label }: NsfwSwitchProps) {
  return (
    <LabeledSwitch checked={checked} onChange={onChange} label={label} />
  );
}
