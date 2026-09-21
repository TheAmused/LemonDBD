// frontend/src/components/character-detail/components/CategoryPicker.tsx
'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

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

const OPTION_HEIGHT_PX = 42;
const MENU_PADDING_PX = 16;
const VIEWPORT_MARGIN_PX = 12;
const MIN_MENU_HEIGHT_PX = 120;

/**
 * Mobile-only replacement for a wrapping/scrolling category tab strip.
 * Renders as a single-line button that opens a dropdown listbox, so the
 * number of categories never affects the height of the row it sits in.
 * Opens upward instead of downward when there isn't enough room below in
 * the viewport (these pickers tend to sit low on long character pages).
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
  const [openUpward, setOpenUpward] = useState(false);
  const [menuMaxHeight, setMenuMaxHeight] = useState(288);
  const rootRef = useRef<HTMLDivElement>(null);
  const accentClasses = ACCENT_CLASSES[accent];

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const idealHeight = Math.min(categories.length * OPTION_HEIGHT_PX + MENU_PADDING_PX, 288);
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN_PX;
    const spaceAbove = rect.top - VIEWPORT_MARGIN_PX;
    // Open upward only if there's more room there AND that's still not
    // enough below — otherwise stick to downward even if tight, since that's
    // the more expected direction. Either way, cap the menu's height to
    // whatever room actually exists in the chosen direction so it can never
    // render outside the viewport — it scrolls internally instead.
    const upward = spaceBelow < idealHeight && spaceAbove > spaceBelow;
    setOpenUpward(upward);
    const available = upward ? spaceAbove : spaceBelow;
    setMenuMaxHeight(Math.max(MIN_MENU_HEIGHT_PX, Math.min(idealHeight, available)));
  }, [open, categories.length]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selected = categories.find((c) => c.key === selectedKey) || categories[0];
  if (!selected) return null;
  const SelectedIcon = selected.icon;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
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

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          style={{ maxHeight: menuMaxHeight }}
          className={`absolute z-20 w-full overflow-y-auto rounded-2xl border border-border-color bg-bg-surface shadow-xl ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
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
        </div>
      )}
    </div>
  );
};
