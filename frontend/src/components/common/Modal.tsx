'use client';
// frontend/src/components/common/Modal.tsx
//
// THE single modal / dialog / sheet / drawer for the app. Every overlay should be
// <Modal> with a `variant`; look & feel live in MODAL_CONFIG (like TOOLTIP_CONFIG),
// not in the call sites.
import { type ModalVariant, type ModalTone, type ModalSize, type ModalCloseButton, type ModalBackdrop, type ModalLayer, useIsCompact, MODAL_CONFIG, type VariantSpec, getFocusable, type ModalContextValue, type MotionKind, REDUCED, MOTION, ModalContext } from "./modalConfig";

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
  useCallback,
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
  type PanInfo
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
/* ------------------------------------------------------------------ *
 * Context - lets modal content close the modal / read ids without prop drilling.
 * ------------------------------------------------------------------ */
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
    // Only hand focus back to a keyboard user. After a mouse click the opener
    // is plain :focus (not :focus-visible); re-focusing it left a focus ring and
    // its tooltip stuck on screen after the modal closed.
    const openerWasKeyboard = Boolean(opener?.matches?.(':focus-visible'));
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
      if (restoreFocus && openerWasKeyboard && opener && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
    // Focus once per open.
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
        'hit-area flex items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red disabled:opacity-40 disabled:cursor-not-allowed',
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
            'fixed inset-0 flex',
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
              'relative z-10 flex min-h-0 flex-col overflow-hidden bg-bg-surface text-text-primary shadow-2xl outline-none',
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

export { useModal } from "./modalConfig";
export type { ModalVariant, ModalLayer, ModalBackdrop, ModalTone, ModalCloseButton } from "./modalConfig";
