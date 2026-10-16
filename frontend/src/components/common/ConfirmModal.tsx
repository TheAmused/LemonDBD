'use client';
// frontend/src/components/common/ConfirmModal.tsx

import React from 'react';
import { Modal } from '@/components/common/Modal';
import type { ModalCloseButton, ModalSize } from '@/components/common/modalConfig';

export interface ConfirmModalProps {
  open: boolean;
  title?: React.ReactNode;
  message?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  confirmIcon?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  busyLabel?: React.ReactNode;
  busy?: boolean;
  /** Dialog width; the default is narrow, fine for a short title and one line of text. */
  size?: ModalSize;
  /** Show an X in the header (use it instead of a cancel button). */
  closeButton?: ModalCloseButton;
  closeButtonAriaLabel?: string;
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
  size = 'xs',
  closeButton = 'none',
  closeButtonAriaLabel,
  onConfirm,
  onCancel,
}) => (
  <Modal
    isOpen={open}
    onClose={onCancel}
    variant="confirm"
    size={size}
    layer="top"
    title={title}
    ariaLabel="Confirm"
    closeButton={closeButton}
    closeButtonAriaLabel={closeButtonAriaLabel}
    busy={busy}
    padded
    bodyClassName="text-center"
    footerClassName="flex-row justify-stretch gap-2 p-4 sm:px-6"
    footer={
      <>
        {cancelLabel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-w-0 flex-1 rounded-control px-3 border border-border-color bg-bg-surface py-3 type-card-title text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="button"
          data-autofocus
          onClick={onConfirm}
          disabled={busy}
          className="min-w-0 flex-1 px-3 inline-flex items-center justify-center gap-2 rounded-control bg-accent-red py-3 type-card-title text-text-inverted shadow-md shadow-accent-red/20 transition-all hover:bg-accent-red-hover disabled:opacity-50 cursor-pointer"
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
