'use client';
// frontend/src/components/common/NsfwSwitch.tsx
import { Switch } from '@/components/common/Switch';
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
      <div
        onClick={() => onChange(!checked)}
        className="flex cursor-pointer select-none items-center gap-2.5 group"
      >
        <Switch checked={checked} onChange={onChange} ariaLabel={label} />
        <span className="type-strong-fluid text-text-primary transition-colors group-hover:text-accent-red">
          {label}
        </span>
      </div>
    </Tooltip>
  );
}
