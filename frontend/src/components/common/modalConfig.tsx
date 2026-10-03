'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { motion, type TargetAndTransition, type Transition } from 'framer-motion';

/* ------------------------------------------------------------------ *
 * Config - the single place modal looks and numbers live.
 * ------------------------------------------------------------------ */

/** Panel widths. */
const MODAL_SIZES = {
  xs: 'w-full max-w-xs',
  sm: 'w-full max-w-sm',
  md: 'w-full max-w-md',
  lg: 'w-full max-w-lg',
  xl: 'w-full max-w-xl',
  '2xl': 'w-full max-w-2xl',
  '3xl': 'w-full max-w-3xl',
  '4xl': 'w-full max-w-4xl',
  '5xl': 'w-full max-w-5xl',
  '6xl': 'w-full max-w-6xl',
  full: 'w-full max-w-[96vw]',
  /** Shrink to content. */
  auto: 'w-fit min-w-[min(18rem,100%)] max-w-full',
} as const;

export type ModalSize = keyof typeof MODAL_SIZES;

export type MotionKind = 'scale' | 'sheet' | 'right' | 'left';

export interface VariantSpec {
  /** Classes for the fixed container (placement + padding). */
  container: string;
  /** Classes for the panel (shape + max size). */
  panel: string;
  motion: MotionKind;
  /** Default `size` when none is passed. */
  defaultSize: ModalSize;
  /** Panel fills the container height (drawers, fullscreen). */
  tall?: boolean;
  /** Header / body chrome is drawn. */
  chrome?: boolean;
  /** Dismiss by dragging (axis) - only while the layout is compact for `sheet`. */
  swipe?: 'y' | 'x-right' | 'x-left';
  /** Title centred by default. */
  centerTitle?: boolean;
}

export const MODAL_CONFIG = {
  /** Named z-index scale. A modal opened from another modal uses a higher layer. */
  zLayers: {
    base: 'z-50',
    nested: 'z-[60]',
    top: 'z-[70]',
    system: 'z-[100]',
  },
  backdrops: {
    blur: 'bg-bg-primary/70 backdrop-blur-md',
    dim: 'bg-scrim/70',
    none: 'bg-transparent',
  },
  sizes: MODAL_SIZES,
  tones: {
    default: 'bg-accent-red/15 text-accent-red border-accent-red/30',
    danger: 'bg-accent-red/15 text-accent-red border-accent-red/30',
    success: 'bg-accent-green/15 text-accent-green border-accent-green/30',
    warning: 'bg-accent-amber/15 text-accent-amber border-accent-amber/30',
    info: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30',
  },
  /** Drag distance (px) / velocity that counts as "swipe to close". */
  swipeDistance: 110,
  swipeVelocity: 520,
  /** Below this width (px) the `sheet` variant behaves as a bottom sheet. */
  compactBreakpoint: 640,
  variants: {
    dialog: {
      container: 'items-center justify-center p-2.5 sm:p-4 md:p-6',
      panel: 'rounded-[28px] sm:rounded-[36px] max-h-[92dvh] sm:max-h-[90dvh]',
      motion: 'scale',
      defaultSize: '3xl',
      chrome: true,
    },
    sheet: {
      container: 'items-end justify-center p-0 sm:items-center sm:p-4 md:p-6',
      panel:
        'rounded-t-[28px] rounded-b-none sm:rounded-[36px] max-h-[92dvh] sm:max-h-[90dvh] pb-[env(safe-area-inset-bottom)] sm:pb-0',
      motion: 'sheet',
      defaultSize: '3xl',
      chrome: true,
      swipe: 'y',
    },
    'drawer-right': {
      container: 'items-stretch justify-end p-0',
      panel: 'h-full max-h-none rounded-none border-l pb-[env(safe-area-inset-bottom)]',
      motion: 'right',
      defaultSize: 'lg',
      tall: true,
      chrome: true,
      swipe: 'x-right',
    },
    'drawer-left': {
      container: 'items-stretch justify-start p-0',
      panel: 'h-full max-h-none rounded-none border-r pb-[env(safe-area-inset-bottom)]',
      motion: 'left',
      defaultSize: 'lg',
      tall: true,
      chrome: true,
      swipe: 'x-left',
    },
    confirm: {
      container: 'items-center justify-center p-2.5 sm:p-4',
      panel: 'rounded-[28px] max-h-[92dvh]',
      motion: 'scale',
      defaultSize: 'sm',
      chrome: true,
      centerTitle: true,
    },
    fullscreen: {
      container: 'items-stretch justify-stretch p-0',
      panel: 'h-full w-full max-w-none max-h-none rounded-none',
      motion: 'scale',
      defaultSize: 'full',
      tall: true,
      chrome: true,
    },
    lightbox: {
      container: 'items-center justify-center p-2.5 sm:p-6',
      panel: 'rounded-2xl max-h-[94dvh] bg-transparent shadow-none border-0',
      motion: 'scale',
      defaultSize: '4xl',
      chrome: false,
    },
  } satisfies Record<string, VariantSpec>,
} as const;

export type ModalVariant = keyof typeof MODAL_CONFIG.variants;

export type ModalLayer = keyof typeof MODAL_CONFIG.zLayers;

export type ModalBackdrop = keyof typeof MODAL_CONFIG.backdrops;

export type ModalTone = keyof typeof MODAL_CONFIG.tones;

export type ModalCloseButton = 'header' | 'floating' | 'none';

const SPRING: Transition = { type: 'spring', damping: 26, stiffness: 320 };

interface MotionSpec {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
  transition: Transition;
}

export const MOTION: Record<MotionKind, MotionSpec> = {
  scale: {
    initial: { opacity: 0, scale: 0.94, y: 14 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 10 },
    transition: SPRING,
  },
  sheet: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
    transition: { type: 'spring', damping: 32, stiffness: 340 },
  },
  right: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
    transition: { type: 'spring', damping: 34, stiffness: 340 },
  },
  left: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
    transition: { type: 'spring', damping: 34, stiffness: 340 },
  },
};

export const REDUCED: MotionSpec = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.01 },
};

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

export const getFocusable = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('data-modal-skip-focus') && el.getClientRects().length > 0
  );

/* ------------------------------------------------------------------ *
 * Context - lets modal content close the modal / read ids without prop drilling.
 * ------------------------------------------------------------------ */

export interface ModalContextValue {
  close: () => void;
  busy: boolean;
  titleId: string;
  descriptionId: string;
}

export const ModalContext = createContext<ModalContextValue | null>(null);

/** Use inside modal content: `const { close, descriptionId } = useModal()`. */
export const useModal = (): ModalContextValue => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used inside <Modal>');
  return ctx;
};

/** True while the viewport is narrower than `maxWidth` px. */
export function useIsCompact(maxWidth: number): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(`(max-width: ${maxWidth - 1}px)`);
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [maxWidth]);
  return compact;
}
