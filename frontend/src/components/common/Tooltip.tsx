'use client';
// frontend/src/components/common/Tooltip.tsx
//
// THE single source of truth for every tooltip in the app. Three entry points,
// all rendering the same <TooltipBubble>:
//
//  1. <Tooltip title description>…</Tooltip>   – wrapper around a trigger element.
//  2. {...tip(title, description)}             – spread onto any native element; the
//                                                 app-wide <TooltipProvider/> (mounted
//                                                 once in the root layout) shows the bubble.
//  3. <TooltipBubble anchor={rect}>…</…>       – low-level, for rich/state-driven bodies
//                                                 (custom card bodies).
//
// All sizing / timing / attribute names live in TOOLTIP_CONFIG below.

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';

export const TOOLTIP_CONFIG = {
  viewportMargin: 10,
  gap: 9,
  arrowSize: 10,
  arrowEdgeInset: 16,
  zIndex: 99999,
  defaultMaxWidth: '17rem',
  attr: {
    title: 'data-tooltip',
    description: 'data-tooltip-desc',
    variant: 'data-tooltip-variant',
  },
  /** Visual presets. Add a key here to give a family of tooltips its own look. */
  variants: {
    default: {
      content: '',
      title: '',
      arrowBorder: 'var(--border-color)',
    },
    item: {
      content: 'border-accent-amber/50',
      title: ' text-xs sm:text-sm normal-case tracking-normal text-accent-amber',
      arrowBorder: 'color-mix(in srgb, var(--accent-amber) 50%, transparent)',
    },
    /** Buttons, toggles and other controls: a short verb-like label. */
    action: {
      content: '',
      title: 'normal-case tracking-normal text-xs',
      arrowBorder: 'var(--border-color)',
    },
    /** Character / killer names. */
    character: {
      content: 'border-accent-red/40',
      title: 'tracking-wide',
      arrowBorder: 'color-mix(in srgb, var(--accent-red) 40%, transparent)',
    },
    /** State badges: trophies, ownership, admin, completion. */
    status: {
      content: 'border-accent-green/40',
      title: 'normal-case tracking-normal text-accent-green',
      arrowBorder: 'color-mix(in srgb, var(--accent-green) 40%, transparent)',
    },
    /** Add-on / item rarity labels. */
    rarity: {
      content: 'border-accent-purple/50',
      title: 'tracking-widest text-accent-purple',
      arrowBorder: 'color-mix(in srgb, rgb(168 85 247) 50%, transparent)',
    },
  },
} as const;

export type TooltipVariant = keyof typeof TOOLTIP_CONFIG.variants;

const resolveVariant = (name?: string | null) =>
  TOOLTIP_CONFIG.variants[(name as TooltipVariant) in TOOLTIP_CONFIG.variants ? (name as TooltipVariant) : 'default'];

type MaybeText = string | false | null | undefined;

/** Spread onto any native element to give it the global tooltip. */
/** `variant` is required on purpose: every tooltip picks its look explicitly. */
export const tip = (title: MaybeText, description: MaybeText, variant: TooltipVariant) => ({
  [TOOLTIP_CONFIG.attr.title]: title || undefined,
  [TOOLTIP_CONFIG.attr.description]: description || undefined,
  [TOOLTIP_CONFIG.attr.variant]: variant,
});

export type TooltipPlacement = 'top' | 'bottom' | 'auto';
type Anchor = HTMLElement | DOMRect | null;

interface Coords {
  top: number;
  left: number;
  side: 'top' | 'bottom';
  arrowLeft: number;
}

export interface TooltipBubbleProps {
  /** Element (tracked live) or a rect snapshot the bubble points at. */
  anchor: Anchor;
  title?: string;
  description?: string;
  /** Custom body; replaces title/description. */
  children?: React.ReactNode;
  placement?: TooltipPlacement;
  variant?: TooltipVariant;
  /** Fixed width in px; otherwise sized to content up to defaultMaxWidth. */
  width?: number;
  /** Cap on the bubble height in px (body should scroll itself). */
  maxHeight?: number;
  className?: string;
  contentClassName?: string;
}

const TooltipBubble: React.FC<TooltipBubbleProps> = ({
  anchor,
  title,
  description,
  children,
  placement = 'top',
  variant,
  width,
  maxHeight,
  className,
  contentClassName,
}) => {
  const look = resolveVariant(variant);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => setMounted(true), []);

  const reposition = useCallback(() => {
    const bubble = bubbleRef.current;
    if (!bubble || !anchor) return;

    const { viewportMargin: margin, gap } = TOOLTIP_CONFIG;
    const aRect = anchor instanceof Element ? anchor.getBoundingClientRect() : anchor;
    const bRect = bubble.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    const spaceAbove = aRect.top;
    const spaceBelow = vh - aRect.bottom;
    const needed = bRect.height + gap;

    let side: 'top' | 'bottom';
    if (placement === 'auto') {
      side = spaceAbove >= needed || spaceAbove >= spaceBelow ? 'top' : 'bottom';
    } else {
      side = placement;
      if (side === 'top' && spaceAbove < needed && spaceBelow > spaceAbove) side = 'bottom';
      if (side === 'bottom' && spaceBelow < needed && spaceAbove > spaceBelow) side = 'top';
    }

    let top = side === 'top' ? aRect.top - bRect.height - gap : aRect.bottom + gap;
    top = Math.min(Math.max(top, margin), vh - bRect.height - margin);

    let left = aRect.left + aRect.width / 2 - bRect.width / 2;
    left = Math.min(Math.max(left, margin), vw - bRect.width - margin);

    const inset = TOOLTIP_CONFIG.arrowEdgeInset;
    const arrowLeft = Math.min(Math.max(aRect.left + aRect.width / 2 - left, inset), bRect.width - inset);

    setCoords({ top, left, side, arrowLeft });
  }, [anchor, placement]);

  useLayoutEffect(() => {
    if (!anchor) return;
    reposition();
    const raf = requestAnimationFrame(reposition);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [anchor, reposition]);

  if (!anchor || !mounted || typeof document === 'undefined') return null;

  const arrow = TOOLTIP_CONFIG.arrowSize;
  const hasBody = children !== undefined && children !== null;

  return createPortal(
    <div
      ref={bubbleRef}
      role="tooltip"
      style={{
        zIndex: TOOLTIP_CONFIG.zIndex,
        // Position is computed, never animated: app-wide transitions on
        // top/left would otherwise make the bubble slide in from off-screen.
        transition: 'none',
        maxWidth: `min(${TOOLTIP_CONFIG.defaultMaxWidth}, calc(100vw - ${TOOLTIP_CONFIG.viewportMargin * 2}px))`,
        ...(width
          ? { width, maxWidth: `calc(100vw - ${TOOLTIP_CONFIG.viewportMargin * 2}px)` }
          : null),
        ...(maxHeight ? { maxHeight } : null),
        ...(coords
          ? { top: coords.top, left: coords.left }
          : { top: -9999, left: -9999, visibility: 'hidden' }),
      }}
      className={cn(
        'pointer-events-none fixed w-max text-left flex flex-col',
        coords && 'animate-in fade-in zoom-in-95 duration-150',
        className
      )}
    >
      <div
        className={cn(
          'relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-color bg-bg-surface px-3.5 py-2.5 shadow-lg backdrop-blur-sm',
          look.content,
          contentClassName
        )}
      >
        {hasBody ? (
          <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
        ) : (
          <>
            {title && (
              <span
                className={cn(
                  'relative block whitespace-normal text-xs font-bold leading-snug text-text-primary',
                  look.title
                )}
              >
                {title}
              </span>
            )}
            {description && (
              <span
                className={cn(
                  'relative block whitespace-normal type-caption font-medium leading-snug text-text-secondary',
                  title && 'mt-px'
                )}
              >
                {description}
              </span>
            )}
          </>
        )}
      </div>
      {coords && (
        <span
          aria-hidden="true"
          className="absolute rotate-45 bg-bg-surface"
          style={{
            width: arrow,
            height: arrow,
            left: coords.arrowLeft - arrow / 2,
            top: coords.side === 'top' ? '100%' : undefined,
            bottom: coords.side === 'bottom' ? '100%' : undefined,
            marginTop: coords.side === 'top' ? -arrow / 2 : undefined,
            marginBottom: coords.side === 'bottom' ? -arrow / 2 : undefined,
            borderRight: coords.side === 'top' ? `1px solid ${look.arrowBorder}` : undefined,
            borderBottom: coords.side === 'top' ? `1px solid ${look.arrowBorder}` : undefined,
            borderLeft: coords.side === 'bottom' ? `1px solid ${look.arrowBorder}` : undefined,
            borderTop: coords.side === 'bottom' ? `1px solid ${look.arrowBorder}` : undefined,
          }}
        />
      )}
    </div>,
    document.body
  );
};

export interface TooltipProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom';
  variant?: TooltipVariant;
  align?: 'start' | 'center' | 'end';
  className?: string;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  title,
  description,
  children,
  placement = 'top',
  variant,
  className,
  disabled = false,
}) => {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  if (disabled) return <>{children}</>;

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onTouchStart={() => setOpen(true)}
      onTouchEnd={() => setOpen(false)}
    >
      {children}
      {open && (
        <TooltipBubble
          anchor={triggerRef.current}
          title={title}
          description={description}
          placement={placement}
          variant={variant}
          className={className}
        />
      )}
    </span>
  );
};

interface ActiveTip {
  el: HTMLElement;
  title: string;
  description?: string;
  variant?: string;
}

/** Mount once (root layout). Shows the bubble for any element carrying tip() attributes. */
export const TooltipProvider: React.FC = () => {
  const [active, setActive] = useState<ActiveTip | null>(null);

  useEffect(() => {
    const { title: titleAttr, description: descAttr, variant: variantAttr } = TOOLTIP_CONFIG.attr;
    const selector = `[${titleAttr}]`;

    const find = (target: EventTarget | null) =>
      target instanceof Element ? target.closest<HTMLElement>(selector) : null;

    const read = (el: HTMLElement): ActiveTip | null => {
      const title = el.getAttribute(titleAttr);
      if (!title) return null;
      return {
        el,
        title,
        description: el.getAttribute(descAttr) || undefined,
        variant: el.getAttribute(variantAttr) || undefined,
      };
    };

    // A tap fires an emulated `mouseover`; on touch screens that would pop a hover bubble on every tap and leave it stuck.
    let lastTouch = 0;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') lastTouch = Date.now();
    };
    const hoverIsReal = () => window.matchMedia?.('(hover: hover)').matches !== false && Date.now() - lastTouch > 800;

    const show = (e: Event) => {
      const el = find(e.target);
      if (!el) return;
      if (e.type === 'mouseover' && !hoverIsReal()) return;
      // Focus shows the bubble only for keyboard focus; pointer hover has its own event.
      if (e.type === 'focusin' && !(e.target as HTMLElement).matches?.(':focus-visible')) return;
      const next = read(el);
      if (next) setActive((prev) => (prev?.el === el && prev.title === next.title ? prev : next));
    };

    const hide = (e: Event) => {
      const el = find(e.target);
      if (!el) return;
      const related = (e as MouseEvent).relatedTarget;
      if (related instanceof Node && el.contains(related)) return;
      setActive((prev) => (prev?.el === el ? null : prev));
    };

    const dismiss = () => setActive(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('mouseover', show);
    document.addEventListener('focusin', show);
    document.addEventListener('mouseout', hide);
    document.addEventListener('focusout', hide);
    document.addEventListener('mousedown', dismiss);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('mouseover', show);
      document.removeEventListener('focusin', show);
      document.removeEventListener('mouseout', hide);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('mousedown', dismiss);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Drop the bubble if its trigger unmounts, or keep text in sync if it changes.
  useEffect(() => {
    if (!active) return;
    const { title: titleAttr, description: descAttr, variant: variantAttr } = TOOLTIP_CONFIG.attr;
    const observer = new MutationObserver(() => {
      const { el } = active;
      if (!el.isConnected) return setActive(null);
      const title = el.getAttribute(titleAttr);
      if (!title) return setActive(null);
      const description = el.getAttribute(descAttr) || undefined;
      if (title !== active.title || description !== active.description) {
        setActive({ el, title, description, variant: el.getAttribute(variantAttr) || undefined });
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [titleAttr, descAttr, variantAttr],
    });
    return () => observer.disconnect();
  }, [active]);

  if (!active) return null;
  return (
    <TooltipBubble
      anchor={active.el}
      title={active.title}
      description={active.description}
      variant={active.variant as TooltipVariant | undefined}
    />
  );
};
