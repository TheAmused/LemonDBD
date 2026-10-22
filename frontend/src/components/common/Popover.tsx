'use client';
// frontend/src/components/common/Popover.tsx
//
// THE shared anchored floating panel (dropdown menus, pickers, hover cards).
// Portals to document.body so no ancestor `overflow: hidden` / transform can
// clip it, positions itself against an anchor element with flip + viewport
// clamp, and repositions on scroll / resize.
//
//   const triggerRef = useRef<HTMLButtonElement>(null);
//   <button ref={triggerRef} {...popoverTriggerProps(open, 'menu')} onClick={toggle} />
//   <Popover open={open} anchorRef={triggerRef} onClose={() => setOpen(false)}>…</Popover>
//
// Behaviour: outside pointerdown + Escape call `onClose` (both optional),
// a control marked data-autofocus takes focus on open, focus returns to the
// trigger when the panel closes while focus was inside it, and the layer sits above <Modal> (z 120) but below tooltips.
// `Popover` never owns the open state: the caller does.

import React, { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { useIsClient } from '@/hooks/useIsClient';
import { useOnValueChange } from '@/hooks/useOnValueChange';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { TOOLTIP_CONFIG } from './Tooltip';

const POPOVER_CONFIG = {
  /** Above Modal's 'system' layer (z-100), below tooltips. */
  zIndex: 120,
  gap: 6,
  /** Reuses the tooltip viewport margin so floating UI feels uniform. */
  viewportMargin: TOOLTIP_CONFIG.viewportMargin,
  minHeight: 120,
  exitMs: 120,
} as const;

/** The look of a menu panel (dropdown options, action menus): pass it as the Popover's className. */
export const MENU_PANEL_CLASS = 'rounded-card border border-border-color bg-bg-surface p-1.5 shadow-xl backdrop-blur-2xl';

export type PopoverPlacement = 'bottom' | 'top';
export type PopoverAlign = 'start' | 'center' | 'end';

interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
}

export interface PopoverPositionInput {
  anchor: RectLike;
  /** Natural (unconstrained) panel size. */
  panel: { width: number; height: number };
  viewport: { width: number; height: number };
  placement?: PopoverPlacement;
  align?: PopoverAlign;
  gap?: number;
  margin?: number;
  /** Panel width follows the anchor width. */
  matchWidth?: boolean;
  /** Flip to the other side when the preferred one is too tight. */
  flip?: boolean;
  /** Pixel cap on the panel height. */
  maxHeight?: number;
  minHeight?: number;
}

export interface PopoverPosition {
  top: number;
  left: number;
  side: PopoverPlacement;
  width: number;
  /** Height the panel should be capped at (it scrolls internally beyond it). */
  maxHeight: number;
}

/** Pure placement math: flip, height cap and viewport clamp. No DOM access. */
export const computePopoverPosition = (input: PopoverPositionInput): PopoverPosition => {
  const {
    anchor,
    panel,
    viewport,
    placement = 'bottom',
    align = 'start',
    gap = POPOVER_CONFIG.gap,
    margin = POPOVER_CONFIG.viewportMargin,
    matchWidth = false,
    flip = true,
    maxHeight,
    minHeight = POPOVER_CONFIG.minHeight,
  } = input;

  const width = Math.min(matchWidth ? anchor.width : panel.width, Math.max(0, viewport.width - margin * 2));
  const spaceBelow = viewport.height - anchor.bottom - gap - margin;
  const spaceAbove = anchor.top - gap - margin;

  let side: PopoverPlacement = placement;
  if (flip) {
    const own = side === 'bottom' ? spaceBelow : spaceAbove;
    const other = side === 'bottom' ? spaceAbove : spaceBelow;
    if (own < panel.height && other > own) side = side === 'bottom' ? 'top' : 'bottom';
  }

  const available = side === 'bottom' ? spaceBelow : spaceAbove;
  const cap = maxHeight ?? Infinity;
  const clampedMax = Math.max(minHeight, Math.min(panel.height, available, cap));
  const height = Math.min(panel.height, clampedMax);

  let top = side === 'bottom' ? anchor.bottom + gap : anchor.top - gap - height;
  top = Math.max(margin, Math.min(top, viewport.height - height - margin));

  let left = anchor.left;
  if (align === 'center') left = anchor.left + anchor.width / 2 - width / 2;
  else if (align === 'end') left = anchor.right - width;
  left = Math.max(margin, Math.min(left, viewport.width - width - margin));

  return { top, left, side, width, maxHeight: Number.isFinite(clampedMax) ? clampedMax : height };
};

/** ARIA wiring for the trigger element. `false` is a plain disclosure (a panel of ordinary buttons
 * or links, the current one marked aria-current): no aria-haspopup, just aria-expanded. */
export const popoverTriggerProps = (
  open: boolean,
  haspopup: 'listbox' | 'menu' | 'dialog' | 'true' | false = 'dialog',
  panelId?: string
) => ({
  'aria-haspopup': haspopup === false ? undefined : haspopup,
  'aria-expanded': open,
  'aria-controls': open ? panelId : undefined,
});

export interface PopoverProps {
  open: boolean;
  /** Element the panel is positioned against (and treated as "inside" for outside clicks). */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Called on outside pointerdown / Escape. */
  onClose?: () => void;
  children: React.ReactNode;
  placement?: PopoverPlacement;
  align?: PopoverAlign;
  gap?: number;
  viewportMargin?: number;
  matchWidth?: boolean;
  flip?: boolean;
  /** Pixel cap on the panel height. */
  maxHeight?: number;
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
  /** Return focus to the trigger when it closes while focus was inside the panel. Default true. */
  returnFocus?: boolean;
  /** Fade/scale in and out, consistent with Tooltip. Default true. */
  animate?: boolean;
  /** Hover-card style: panel ignores the pointer. */
  passive?: boolean;
  zIndex?: number | string;
  id?: string;
  role?: string;
  /** `fieldset` for a panel that groups related controls (its implicit role is group). */
  as?: 'div' | 'fieldset';
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Popover: React.FC<PopoverProps> = ({
  open,
  anchorRef,
  onClose,
  children,
  placement = 'bottom',
  align = 'start',
  gap = POPOVER_CONFIG.gap,
  viewportMargin = POPOVER_CONFIG.viewportMargin,
  matchWidth = false,
  flip = true,
  maxHeight,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  returnFocus = true,
  animate = true,
  passive = false,
  zIndex = POPOVER_CONFIG.zIndex,
  id,
  role,
  as = 'div',
  ariaLabel,
  className,
  style,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  // Typed as a div: the panel only ever uses what every element has (contains, focus, bounds).
  const Panel = as as 'div';
  const mounted = useIsClient();
  const [present, setPresent] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const [pos, setPos] = useState<PopoverPosition | null>(null);
  const requestClose = useEffectEvent(() => onClose?.());
  const wasOpen = useRef(false);

  /* mount / unmount (with a short exit animation); a panel that unmounts forgets its position */
  useOnValueChange(open, (isOpen) => {
    if (isOpen) {
      setPresent(true);
      setLeaving(false);
    } else if (present && animate) {
      setLeaving(true);
    } else {
      setPresent(false);
      setPos(null);
    }
  });

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => {
      setPresent(false);
      setLeaving(false);
      setPos(null);
    }, POPOVER_CONFIG.exitMs);
    return () => window.clearTimeout(t);
  }, [leaving]);

  const reposition = useCallback(() => {
    const panel = panelRef.current;
    const anchor = anchorRef.current;
    if (!panel || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    // Exposed so callers can size the panel relative to the trigger (e.g.
    // `w-[var(--popover-anchor-width)]`) now that it is portaled; set before measuring.
    panel.style.setProperty('--popover-anchor-width', `${rect.width}px`);
    if (matchWidth) panel.style.width = `${rect.width}px`;
    const border = panel.offsetHeight - panel.clientHeight;
    const next = computePopoverPosition({
      anchor: rect,
      panel: { width: panel.offsetWidth, height: panel.scrollHeight + border },
      viewport: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
      placement,
      align,
      gap,
      margin: viewportMargin,
      matchWidth,
      flip,
      maxHeight,
    });
    setPos((prev) =>
      prev &&
      prev.top === next.top &&
      prev.left === next.left &&
      prev.side === next.side &&
      prev.width === next.width &&
      prev.maxHeight === next.maxHeight
        ? prev
        : next
    );
  }, [anchorRef, placement, align, gap, viewportMargin, matchWidth, flip, maxHeight]);

  useLayoutEffect(() => {
    if (!present || !mounted || leaving) return;
    reposition();
    const raf = requestAnimationFrame(reposition);
    const onScroll = (e: Event) => {
      if (e.target instanceof Node && panelRef.current?.contains(e.target)) return;
      reposition();
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', reposition);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', reposition);
    };
  }, [present, mounted, leaving, reposition, children]);

  /* outside click + Escape */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!closeOnOutsideClick) return;
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      requestClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!closeOnEscape || e.key !== 'Escape' || e.defaultPrevented) return;
      // preventDefault so a surrounding <Modal> does not also close on this Escape.
      e.preventDefault();
      requestClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, closeOnOutsideClick, closeOnEscape, anchorRef]);

  /* focus in: a control marked data-autofocus (the URL box of a "link" panel) takes focus on open */
  useEffect(() => {
    if (!open || !present) return;
    const raf = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, present]);

  /* focus return */
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    if (!returnFocus) return;
    const active = document.activeElement;
    const lost = !active || active === document.body || panelRef.current?.contains(active);
    if (!lost) return;
    const anchor = anchorRef.current;
    if (!anchor) return;
    const target = anchor.matches('button,[tabindex],a,input') ? anchor : anchor.querySelector<HTMLElement>('button,[tabindex],a,input');
    target?.focus({ preventScroll: true });
  }, [open, returnFocus, anchorRef]);

  if (!mounted || !present || typeof document === 'undefined') return null;

  return createPortal(
    <Panel
      ref={panelRef}
      id={id}
      role={role}
      aria-label={ariaLabel}
      data-popover-side={pos?.side}
      style={{
        position: 'fixed',
        zIndex,
        // Position is computed, never animated.
        transition: leaving ? `opacity ${POPOVER_CONFIG.exitMs}ms ease-out, transform ${POPOVER_CONFIG.exitMs}ms ease-out` : 'none',
        // --popover-anchor-width (and the width of a matchWidth panel before it is placed) is set by reposition().
        ...(matchWidth && pos ? { width: pos.width } : null),
        ...(pos
          ? { top: pos.top, left: pos.left, maxHeight: pos.maxHeight }
          : { top: -9999, left: -9999, visibility: 'hidden', ...(maxHeight ? { maxHeight } : null) }),
        ...(leaving ? { opacity: 0, transform: 'scale(0.96)' } : null),
        ...style,
      }}
      className={cn(
        'w-max overflow-y-auto',
        as === 'fieldset' && 'min-w-0',
        passive && 'pointer-events-none',
        animate && pos && !leaving && 'animate-in fade-in zoom-in-95 duration-150',
        className
      )}
    >
      {children}
    </Panel>,
    document.body
  );
};
