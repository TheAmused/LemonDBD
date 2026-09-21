// frontend/src/components/character-detail/components/CategoryPicker.tsx
'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
const GAP_PX = 6;

interface MenuGeometry {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

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
  const [mounted, setMounted] = useState(false);
  const [geometry, setGeometry] = useState<MenuGeometry | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const accentClasses = ACCENT_CLASSES[accent];

  useEffect(() => setMounted(true), []);

  const recomputeGeometry = useCallback(() => {
    if (!rootRef.current) return;
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
    const available = upward ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(MIN_MENU_HEIGHT_PX, Math.min(idealHeight, available));
    setGeometry({
      left: rect.left,
      width: rect.width,
      maxHeight,
      ...(upward
        ? { bottom: window.innerHeight - rect.top + GAP_PX }
        : { top: rect.bottom + GAP_PX }),
    });
  }, [categories.length]);

  useLayoutEffect(() => {
    if (!open) return;
    recomputeGeometry();
  }, [open, recomputeGeometry]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleReposition = () => recomputeGeometry();
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [open, recomputeGeometry]);

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

      {mounted && open && geometry &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: 'fixed',
              left: geometry.left,
              width: geometry.width,
              top: geometry.top,
              bottom: geometry.bottom,
              maxHeight: geometry.maxHeight,
            }}
            className="z-50 overflow-y-auto rounded-2xl border border-border-color bg-bg-surface shadow-xl"
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
          </div>,
          document.body
        )}
    </div>
  );
};
