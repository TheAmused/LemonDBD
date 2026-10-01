'use client';
// frontend/src/components/common/Modal.tsx
//
// THE single modal / dialog / sheet / drawer for the app. Every overlay should be
// <Modal> with a `variant`; look & feel live in MODAL_CONFIG (like TOOLTIP_CONFIG),
// not in the call sites.
//
//   variant   dialog (default) centred panel
//             sheet            bottom sheet on phones, centred dialog from `sm` up
//             drawer-right / drawer-left   full-height side panel (full width on phones)
//             confirm          small centred dialog (icon + title + actions)
//             fullscreen       edge to edge
//             lightbox         chrome-less, for images / 3D / video
//
// Built in: portal, stacking (Escape and Tab only affect the top-most modal),
// ref-counted scroll lock with scrollbar compensation, focus trap + focus
// restore, aria-labelledby, swipe-to-dismiss (sheet / drawers), reduced-motion,
// dvh sizing + safe-area insets, `busy` guard, z-index scale, content context.
//
// Backwards compatible: every prop of the previous Modal still works.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
  type TargetAndTransition,
  type Transition,
} from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  acquireScrollLock,
  isTopModal,
  pushModal,
  releaseScrollLock,
  removeModal,
} from '@/components/common/modalManager';

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

type ModalSize = keyof typeof MODAL_SIZES;

type MotionKind = 'scale' | 'sheet' | 'right' | 'left';

interface VariantSpec {
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
    dim: 'bg-black/70',
    none: 'bg-transparent',
  },
  sizes: MODAL_SIZES,
  tones: {
    default: 'bg-accent-red/15 text-accent-red border-accent-red/30',
    danger: 'bg-accent-red/15 text-accent-red border-accent-red/30',
    success: 'bg-accent-green/15 text-accent-green border-accent-green/30',
    warning: 'bg-accent-amber/15 text-accent-amber border-accent-amber/30',
    info: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30 dark:text-cyan-400',
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
export type { ModalSize };
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

const MOTION: Record<MotionKind, MotionSpec> = {
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

const REDUCED: MotionSpec = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.01 },
};

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

const getFocusable = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('data-modal-skip-focus') && el.getClientRects().length > 0
  );

/* ------------------------------------------------------------------ *
 * Context - lets modal content close the modal / read ids without prop drilling.
 * ------------------------------------------------------------------ */

interface ModalContextValue {
  close: () => void;
  busy: boolean;
  titleId: string;
  descriptionId: string;
}

const ModalContext = createContext<ModalContextValue | null>(null);

/** Use inside modal content: `const { close, descriptionId } = useModal()`. */
export const useModal = (): ModalContextValue => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used inside <Modal>');
  return ctx;
};

/** True while the viewport is narrower than `maxWidth` px. */
function useIsCompact(maxWidth: number): boolean {
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

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Look & behaviour preset. Default 'dialog'. */
  variant?: ModalVariant;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  /** Colours the header icon (useful with `confirm`). */
  tone?: ModalTone;
  badge?: React.ReactNode;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  /** Replaces the whole default header. Pair with `closeButton="floating"`. */
  header?: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  centerTitle?: boolean;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  containerClassName?: string;
  /** Where the close button lives. Default 'header'. */
  closeButton?: ModalCloseButton;
  /** @deprecated use closeButton="none" */
  hideCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  lockScroll?: boolean;
  /** Allow swipe-to-dismiss on sheet / drawers. Default true. */
  swipeToClose?: boolean;
  /** Blocks every way of closing and shows a progress bar (saving, deleting...). */
  busy?: boolean;
  backdrop?: ModalBackdrop;
  /** Named z-index layer. Default 'nested' (z-[60]). */
  layer?: ModalLayer;
  /** Raw z-index class; wins over `layer`. */
  zIndexClassName?: string;
  /** Full-screen on phones whatever the variant. */
  fullscreenOnMobile?: boolean;
  /** Wrap children in standard body padding. */
  padded?: boolean;
  /** Element to focus on open. Fallback: [data-autofocus], first control, the panel. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Do not move focus back to the opener on close. */
  restoreFocus?: boolean;
  /** Stable id of the element that describes the dialog (see useModal().descriptionId). */
  ariaDescribedBy?: string;
  ariaLabel?: string;
  closeButtonAriaLabel?: string;
  /** Strips outer border, header bottom border and close button border. */
  borderless?: boolean;
  testId?: string;
  onOpen?: () => void;
  /** After the exit animation finished. */
  onAfterClose?: () => void;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  variant = 'dialog',
  title,
  subtitle,
  icon,
  tone = 'default',
  badge,
  headerLeft,
  headerRight,
  header,
  footer,
  size,
  centerTitle,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  footerClassName = '',
  containerClassName = '',
  closeButton,
  hideCloseButton = false,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  lockScroll = true,
  swipeToClose = true,
  busy = false,
  backdrop = 'blur',
  layer = 'nested',
  zIndexClassName,
  fullscreenOnMobile = false,
  padded = false,
  initialFocusRef,
  restoreFocus = true,
  ariaDescribedBy,
  ariaLabel,
  closeButtonAriaLabel,
  borderless = false,
  testId,
  onOpen,
  onAfterClose,
}) => {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-desc`;
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const compact = useIsCompact(MODAL_CONFIG.compactBreakpoint);

  const spec: VariantSpec = MODAL_CONFIG.variants[variant] ?? MODAL_CONFIG.variants.dialog;
  const closeMode: ModalCloseButton = closeButton ?? (hideCloseButton ? 'none' : 'header');
  const showChrome = spec.chrome !== false;
  const isCentered = centerTitle ?? spec.centerTitle ?? false;

  const requestClose = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  useEffect(() => setMounted(true), []);

  /* stack + scroll lock */
  useEffect(() => {
    if (!isOpen) return;
    pushModal(id);
    if (lockScroll) {
      const scrollbar = window.innerWidth - document.documentElement.clientWidth;
      acquireScrollLock(document.body, scrollbar);
    }
    onOpen?.();
    return () => {
      removeModal(id);
      if (lockScroll) releaseScrollLock(document.body);
    };
    // onOpen intentionally excluded: it must fire once per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lockScroll, id]);

  /* Escape + Tab trap (top-most modal only) */
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTopModal(id)) return;
      if (e.key === 'Escape') {
        if (closeOnEscape && !e.defaultPrevented) {
          e.preventDefault();
          requestClose();
        }
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = getFocusable(panel);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (!panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, id, closeOnEscape, requestClose]);

  /* focus: move in on open, restore on close */
  useEffect(() => {
    if (!isOpen || !mounted) return;
    const opener = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target =
        initialFocusRef?.current ??
        panel.querySelector<HTMLElement>('[data-autofocus]') ??
        getFocusable(panel).find((el) => !el.hasAttribute('data-modal-close')) ??
        panel;
      target.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(raf);
      if (restoreFocus && opener && opener.isConnected) opener.focus({ preventScroll: true });
    };
    // Focus once per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mounted]);

  const ctx = useMemo<ModalContextValue>(
    () => ({ close: requestClose, busy, titleId, descriptionId }),
    [requestClose, busy, titleId, descriptionId]
  );

  if (!mounted || typeof document === 'undefined') return null;

  /* the sheet is a real sheet only on phones */
  const effectiveMotion: MotionKind = spec.motion === 'sheet' && !compact ? 'scale' : spec.motion;
  const motionSpec = reduceMotion ? REDUCED : MOTION[effectiveMotion];
  const swipe = !showChrome || !swipeToClose || busy ? undefined : spec.swipe;
  const dragAxis: 'x' | 'y' | undefined =
    swipe === 'y' ? (compact ? 'y' : undefined) : swipe ? 'x' : undefined;
  const sizeClass = MODAL_CONFIG.sizes[size ?? spec.defaultSize] ?? MODAL_CONFIG.sizes['3xl'];
  const zClass = zIndexClassName ?? MODAL_CONFIG.zLayers[layer];
  const hasTitleText = Boolean(title);
  const hasHeader =
    showChrome &&
    !header &&
    Boolean(title || icon || subtitle || badge || headerRight || headerLeft || closeMode === 'header');

  const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    const { swipeDistance, swipeVelocity } = MODAL_CONFIG;
    const dist = swipe === 'y' ? info.offset.y : swipe === 'x-left' ? -info.offset.x : info.offset.x;
    const vel = swipe === 'y' ? info.velocity.y : swipe === 'x-left' ? -info.velocity.x : info.velocity.x;
    if (dist > swipeDistance || vel > swipeVelocity) requestClose();
  };

  const startDrag = (e: React.PointerEvent) => {
    if (dragAxis) dragControls.start(e);
  };

  const closeBtn = (floating: boolean) => (
    <button
      type="button"
      data-modal-close
      onClick={requestClose}
      disabled={busy}
      aria-label={closeButtonAriaLabel}
      className={cn(
        'flex items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red disabled:opacity-40 disabled:cursor-not-allowed',
        floating ? 'absolute right-3 top-3 z-20 h-9 w-9 bg-bg-surface/60 backdrop-blur-sm' : 'h-9 w-9 sm:h-10 sm:w-10'
      )}
    >
      <X className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
    </button>
  );

  const content = (
    <AnimatePresence onExitComplete={onAfterClose}>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={hasTitleText ? titleId : undefined}
          aria-label={hasTitleText ? undefined : ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-busy={busy || undefined}
          data-testid={testId}
          data-modal-variant={variant}
          className={cn(
            'fixed inset-0 flex select-none',
            zClass,
            fullscreenOnMobile ? 'max-sm:items-stretch max-sm:p-0' : null,
            spec.container,
            containerClassName
          )}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
            onClick={closeOnBackdropClick ? requestClose : undefined}
            className={cn('fixed inset-0', MODAL_CONFIG.backdrops[backdrop])}
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={motionSpec.initial}
            animate={motionSpec.animate}
            exit={motionSpec.exit}
            transition={motionSpec.transition}
            drag={dragAxis}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
            dragElastic={
              swipe === 'y'
                ? { top: 0, bottom: 0.5 }
                : swipe === 'x-right'
                  ? { left: 0, right: 0.5 }
                  : swipe === 'x-left'
                    ? { left: 0.5, right: 0 }
                    : 0
            }
            onDragEnd={dragAxis ? handleDragEnd : undefined}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'relative z-10 flex min-h-0 flex-col overflow-hidden bg-bg-surface text-text-primary font-mono shadow-2xl outline-none',
              !borderless && 'border border-border-color',
              sizeClass,
              spec.panel,
              fullscreenOnMobile && 'max-sm:h-full max-sm:max-h-none max-sm:max-w-none max-sm:rounded-none',
              className
            )}
          >
            {busy && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 z-30 h-0.5 animate-pulse bg-accent-red"
              />
            )}

            {closeMode === 'floating' && showChrome && closeBtn(true)}

            {/* grab handle: phones only, only where a swipe closes the panel */}
            {dragAxis === 'y' && (
              <div
                onPointerDown={startDrag}
                className="flex shrink-0 touch-none justify-center pt-2 sm:hidden"
                aria-hidden="true"
              >
                <span className="h-1 w-10 rounded-full bg-border-color" />
              </div>
            )}

            {header}

            {hasHeader && (
              <div
                onPointerDown={startDrag}
                className={cn(
                  'relative flex shrink-0 items-center justify-between gap-2 bg-bg-elevated/40 p-4 sm:p-5',
                  !borderless && 'border-b border-border-color',
                  dragAxis && 'touch-none',
                  headerClassName
                )}
              >
                {isCentered && (
                  <div className="flex w-10 shrink-0 items-center sm:w-11">{headerLeft || null}</div>
                )}

                <div
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-3 sm:gap-4',
                    isCentered && 'justify-center text-center'
                  )}
                >
                  {!isCentered && headerLeft}
                  {icon && (
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-xs sm:h-11 sm:w-11',
                        MODAL_CONFIG.tones[tone]
                      )}
                    >
                      {icon}
                    </span>
                  )}
                  <div className={cn('min-w-0', isCentered ? 'text-center' : 'text-left')}>
                    <div className={cn('flex flex-wrap items-center gap-2', isCentered && 'justify-center')}>
                      {title && (
                        <h2
                          id={titleId}
                          className="text-base font-black tracking-tight text-text-primary text-balance sm:text-xl md:text-2xl"
                        >
                          {title}
                        </h2>
                      )}
                      {badge}
                    </div>
                    {subtitle && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{subtitle}</p>
                    )}
                  </div>
                </div>

                <div
                  className={cn(
                    'flex shrink-0 items-center justify-end gap-2',
                    isCentered && 'w-10 sm:w-11'
                  )}
                >
                  {headerRight}
                  {closeMode === 'header' && closeBtn(false)}
                </div>
              </div>
            )}

            <ModalContext.Provider value={ctx}>
              <div
                className={cn(
                  'min-h-0 flex-1 overflow-y-auto overscroll-contain',
                  padded && 'p-4 sm:p-6',
                  bodyClassName
                )}
              >
                {children}
              </div>
            </ModalContext.Provider>

            {footer && showChrome && (
              <div
                className={cn(
                  'flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border-color bg-bg-elevated/30 p-3.5 text-xs text-text-secondary sm:px-6',
                  footerClassName
                )}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
};
