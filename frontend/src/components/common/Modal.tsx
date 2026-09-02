'use client';
// frontend/src/components/common/Modal.tsx

import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  centerTitle?: boolean;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  hideCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  lockScroll?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  closeButtonAriaLabel?: string;
}

const SIZE_MAP: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  full: 'max-w-[96vw]',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  icon,
  badge,
  headerLeft,
  headerRight,
  footer,
  size = '3xl',
  centerTitle = false,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  footerClassName = '',
  hideCloseButton = false,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  lockScroll = true,
  ariaLabel,
  ariaDescribedBy,
  closeButtonAriaLabel = 'Close modal',
}) => {
  // ESC key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);

    if (lockScroll) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown, lockScroll]);

  if (typeof window === 'undefined') return null;

  const maxWidthClass = SIZE_MAP[size] || 'max-w-3xl';
  const hasHeader = Boolean(title || icon || subtitle || badge || headerRight || !hideCloseButton);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === 'string' ? title : ariaLabel}
          aria-describedby={ariaDescribedBy}
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 select-none"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={closeOnBackdropClick ? onClose : undefined}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative flex flex-col w-full ${maxWidthClass} overflow-hidden rounded-[28px] sm:rounded-[36px] border-2 border-pink-500/30 bg-white dark:bg-[#09090d]/95 shadow-[0_0_60px_rgba(255,0,85,0.15)] dark:shadow-[0_0_80px_rgba(255,0,85,0.3)] text-zinc-900 dark:text-zinc-100 font-mono z-10 ${className}`}
          >
            {/* Header */}
            {hasHeader && (
              <div
                className={`relative flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-white to-rose-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-rose-950/40 shrink-0 ${headerClassName}`}
              >
                {/* Left side balancer if centerTitle */}
                {centerTitle ? (
                  <div className="flex items-center w-10 sm:w-11 shrink-0">
                    {headerLeft || null}
                  </div>
                ) : null}

                <div
                  className={`flex items-center gap-3 sm:gap-4 min-w-0 flex-1 ${
                    centerTitle ? 'justify-center text-center' : ''
                  }`}
                >
                  {icon && (
                    <span className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-600/20 text-amber-600 dark:text-[#ffd166] border border-amber-500/40 dark:border-[#ffd166]/40 shadow-[0_0_20px_rgba(255,209,102,0.3)] shrink-0">
                      {icon}
                    </span>
                  )}
                  <div className={`min-w-0 ${centerTitle ? 'text-center' : 'text-left'}`}>
                    <div className={`flex items-center gap-2 flex-wrap ${centerTitle ? 'justify-center' : ''}`}>
                      {title && (
                        <h2 className="text-base sm:text-xl md:text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
                          {title}
                        </h2>
                      )}
                      {badge}
                    </div>
                    {subtitle && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-0.5 line-clamp-1">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-10 sm:w-11 justify-end">
                  {headerRight}
                  {!hideCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label={closeButtonAriaLabel}
                      className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-700/80 text-slate-500 dark:text-zinc-400 hover:text-pink-700 dark:hover:text-white hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/50 hover:shadow-[0_0_15px_rgba(255,0,85,0.4)] transition-all cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Modal Body */}
            <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div
                className={`flex items-center justify-between border-t border-slate-200 dark:border-zinc-800 p-3.5 sm:px-6 bg-slate-50 dark:bg-zinc-950/95 text-xs text-slate-500 dark:text-zinc-400 shrink-0 font-mono ${footerClassName}`}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
