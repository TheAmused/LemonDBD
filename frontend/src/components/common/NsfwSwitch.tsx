'use client';
// frontend/src/components/common/NsfwSwitch.tsx
import { LabeledSwitch } from '@/components/common/Switch';
import { Tooltip } from '@/components/common/Tooltip';

interface NsfwSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
}

/** The "Contains NSFW content" switch the tier list and minigame creators share with the roster creator. */
export function NsfwSwitch({ checked, onChange, label, hint }: NsfwSwitchProps) {
  return (
    <Tooltip variant="action" title={label} description={hint}>
      <LabeledSwitch checked={checked} onChange={onChange} label={label} />
    </Tooltip>
  );
}
