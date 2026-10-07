'use client';
// frontend/src/components/common/ConfirmModal.tsx

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { MODAL_CONFIG } from '@/components/common/modalConfig';
import { cn } from '@/utils/cn';

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
}) => (
  <Modal
    isOpen={open}
    onClose={onCancel}
    variant="confirm"
    layer="top"
    tone="danger"
    header={
      <div className="flex flex-col items-center gap-3 px-6 pt-6 text-center">
        <span
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-2xl border shadow-xs',
            MODAL_CONFIG.tones.danger
          )}
        >
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        {title && <h2 className="text-lg font-black tracking-tight text-text-primary text-balance sm:text-xl">{title}</h2>}
      </div>
    }
    ariaLabel={typeof title === 'string' ? title : 'Confirm'}
    closeButton="none"
    busy={busy}
    padded
    bodyClassName="text-center"
    footerClassName="flex-col-reverse sm:flex-row sm:justify-stretch p-4 sm:px-6"
    footer={
      <>
        {cancelLabel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-full sm:flex-1 rounded-xl border border-border-color bg-bg-surface py-3 type-card-title text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="button"
          data-autofocus
          onClick={onConfirm}
          disabled={busy}
          className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-red py-3 type-card-title text-text-inverted shadow-md shadow-accent-red/20 transition-all hover:bg-accent-red-hover disabled:opacity-50 cursor-pointer"
        >
          {!busy && confirmIcon}
          <span>{busy ? busyLabel : confirmLabel}</span>
        </button>
      </>
    }
  >
    {message && <div className="type-body-lg text-text-secondary">{message}</div>}
  </Modal>
);
