// frontend/src/components/character-detail/components/CategoryPicker.tsx
'use client';

import React, { useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Popover, popoverTriggerProps } from '@/components/common/Popover';

export interface CategoryPickerOption {
  key: string;
  label: string;
  icon: React.ElementType;
  desc?: string;
}

interface CategoryPickerProps {
  categories: CategoryPickerOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  ariaLabel: string;
  accent: 'green' | 'red';
  className?: string;
  /** Shown next to the selected label in the trigger, e.g. "(16)". */
  countLabel?: string;
}

const ACCENT_CLASSES: Record<'green' | 'red', { text: string; bg: string; border: string }> = {
  green: { text: 'text-accent-green', bg: 'bg-accent-green/15', border: 'border-accent-green/50' },
  red: { text: 'text-accent-red', bg: 'bg-accent-red/15', border: 'border-accent-red/50' },
};

/** Cap on the menu height; taller lists scroll inside it. */
const MAX_MENU_HEIGHT_PX = 288;
const GAP_PX = 6;
const VIEWPORT_MARGIN_PX = 12;

/**
 * Mobile-only replacement for a wrapping/scrolling category tab strip.
 * Renders as a single-line button that opens a dropdown listbox, so the
 * number of categories never affects the height of the row it sits in.
 * Opens upward instead of downward when there isn't enough room below in
 * the viewport (these pickers tend to sit low on long character pages).
 *
 * The dropdown itself is rendered through a portal into document.body and
 * positioned with `position: fixed`, not nested inside this component's own
 * DOM position. It has to be immune to `overflow: hidden` on ANY ancestor —
 * this has already broken twice from two different unrelated ancestors
 * (a collapse-animation wrapper, then a rounded-card wrapper) adding
 * overflow-hidden for their own reasons with no idea a dropdown lived
 * inside them. A portal makes that whole class of bug structurally
 * impossible instead of something to keep patching per-ancestor.
 */
export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  categories,
  selectedKey,
  onSelect,
  ariaLabel,
  accent,
  className = '',
  countLabel,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const accentClasses = ACCENT_CLASSES[accent];

  const selected = categories.find((c) => c.key === selectedKey) || categories[0];
  if (!selected) return null;
  const SelectedIcon = selected.icon;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        {...popoverTriggerProps(open, 'listbox')}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl border bg-bg-elevated text-xs font-bold transition-colors cursor-pointer ${
          open ? `${accentClasses.border} ${accentClasses.text}` : 'border-border-color text-text-primary'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <SelectedIcon className={`h-4 w-4 shrink-0 ${accentClasses.text}`} aria-hidden="true" />
          <span className="truncate">{selected.label}</span>
          {countLabel && <span className="text-text-muted font-mono shrink-0">{countLabel}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <Popover
        open={open}
        anchorRef={rootRef}
        onClose={() => setOpen(false)}
        matchWidth
        gap={GAP_PX}
        viewportMargin={VIEWPORT_MARGIN_PX}
        maxHeight={MAX_MENU_HEIGHT_PX}
        role="listbox"
        ariaLabel={ariaLabel}
        animate={false}
        className="rounded-2xl border border-border-color bg-bg-surface shadow-xl"
      >
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = cat.key === selectedKey;
            return (
              <button
                key={cat.key}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelect(cat.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-bold transition-colors cursor-pointer ${
                  isSelected
                    ? `${accentClasses.bg} ${accentClasses.text}`
                    : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1 min-w-0 truncate">{cat.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
      </Popover>
    </div>
  );
};
