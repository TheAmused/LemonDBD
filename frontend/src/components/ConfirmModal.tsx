'use client';
// frontend/src/components/ConfirmModal.tsx

import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmModalProps {
  open: boolean;
  title?: React.ReactNode;
  message?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  confirmIcon?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  busyLabel?: React.ReactNode;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel,
  confirmIcon,
  cancelLabel,
  busyLabel,
  busy = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md cursor-pointer"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border border-border-color bg-bg-surface p-8 text-center shadow-2xl text-text-primary cursor-default transition-colors"
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-red/30 bg-accent-red/15 text-accent-red shadow-xs">
          <AlertTriangle className="h-8 w-8" />
        </div>

        {title && <h2 className="text-xl font-black tracking-tight text-text-primary">{title}</h2>}
        {message && <div className="mt-2 text-sm text-text-secondary leading-relaxed">{message}</div>}

        <div className="mt-6 flex items-center gap-3">
          {cancelLabel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="flex-1 rounded-xl border border-border-color bg-bg-surface py-3 text-sm font-bold text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-red py-3 text-sm font-extrabold text-text-inverted shadow-md shadow-accent-red/20 transition-all hover:bg-red-600 disabled:opacity-50 cursor-pointer"
          >
            {!busy && confirmIcon}
            <span>{busy ? busyLabel : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

