// frontend/src/components/common/SelectableCard.tsx
// A card you pick (one of several engines, a list row, a status filter). The picked card gets the
// accent border, tint and ring; the rest stay neutral, or keep a faint tint of their own colour when
// `tinted` (status filters whose colour is their identity). It is a toggle button (`aria-pressed`);
// a one-of-many choice with radio semantics is a SegmentedControl.
import React from 'react';
import { cn } from '@/utils/cn';

export type SelectableTone = 'red' | 'amber' | 'green' | 'neutral';

const SELECTED: Record<SelectableTone, string> = {
  red: 'border-accent-red bg-accent-red/10 ring-1 ring-accent-red/30',
  amber: 'border-accent-amber bg-accent-amber/10 ring-1 ring-accent-amber/30',
  green: 'border-accent-green bg-accent-green/10 ring-1 ring-accent-green/30',
  neutral: 'border-border-color bg-bg-elevated ring-1 ring-border-color',
};
// Selected AND tinted: a stronger fill, so the pick still stands out from its tinted neighbours.
const SELECTED_TINTED: Record<SelectableTone, string> = {
  red: 'border-accent-red bg-accent-red/20 text-accent-red ring-1 ring-accent-red/30',
  amber: 'border-accent-amber bg-accent-amber/20 text-accent-amber ring-1 ring-accent-amber/30',
  green: 'border-accent-green bg-accent-green/20 text-accent-green ring-1 ring-accent-green/30',
  neutral: 'border-border-color bg-bg-elevated text-text-primary ring-1 ring-border-color',
};
const TINTED_IDLE: Record<SelectableTone, string> = {
  red: 'border-accent-red/20 bg-accent-red/10 text-accent-red hover:border-accent-red/40',
  amber: 'border-accent-amber/20 bg-accent-amber/10 text-accent-amber hover:border-accent-amber/40',
  green: 'border-accent-green/20 bg-accent-green/10 text-accent-green hover:border-accent-green/40',
  neutral: 'border-border-color bg-bg-surface text-text-secondary hover:border-border-subtle',
};
const IDLE = 'border-border-color bg-bg-surface hover:border-border-subtle';

export interface SelectableCardProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  selected: boolean;
  /** The accent of the picked state (and of the idle tint when `tinted`). */
  tone?: SelectableTone;
  tinted?: boolean;
}

export const SelectableCard = React.forwardRef<HTMLButtonElement, SelectableCardProps>(function SelectableCard(
  { selected, tone = 'red', tinted = false, className, children, ...rest },
  ref
) {
  const state = selected ? (tinted ? SELECTED_TINTED[tone] : SELECTED[tone]) : tinted ? TINTED_IDLE[tone] : IDLE;
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      className={cn(
        'rounded-control border p-3.5 text-left transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red disabled:cursor-not-allowed disabled:opacity-60',
        state,
        selected && 'shadow-sm',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
