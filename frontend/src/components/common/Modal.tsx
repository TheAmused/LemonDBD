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
  closeButtonAriaLabel,
}) => {
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={closeOnBackdropClick ? onClose : undefined}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative flex flex-col w-full ${maxWidthClass} overflow-hidden rounded-[28px] sm:rounded-[36px] border border-border-color bg-bg-surface shadow-2xl text-text-primary font-mono z-10 ${className}`}
          >
            {hasHeader && (
              <div
                className={`relative flex items-center justify-between border-b border-border-color p-4 sm:p-5 bg-bg-elevated/40 shrink-0 ${headerClassName}`}
              >
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
                    <span className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-accent-amber/15 text-accent-amber border border-accent-amber/30 shadow-xs shrink-0">
                      {icon}
                    </span>
                  )}
                  <div className={`min-w-0 ${centerTitle ? 'text-center' : 'text-left'}`}>
                    <div className={`flex items-center gap-2 flex-wrap ${centerTitle ? 'justify-center' : ''}`}>
                      {title && (
                        <h2 className="text-base sm:text-xl md:text-2xl font-black font-mono text-text-primary tracking-tight">
                          {title}
                        </h2>
                      )}
                      {badge}
                    </div>
                    {subtitle && (
                      <p className="text-xs text-text-secondary font-mono mt-0.5 line-clamp-1">
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
                      className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-bg-surface border border-border-color text-text-secondary hover:text-text-primary hover:border-accent-amber hover:bg-bg-elevated transition-all cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>
              {children}
            </div>

            {footer && (
              <div
                className={`flex items-center justify-between border-t border-border-color p-3.5 sm:px-6 bg-bg-elevated/30 text-xs text-text-secondary shrink-0 font-mono ${footerClassName}`}
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

