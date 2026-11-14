'use client';
// frontend/src/components/common/ConfirmModal.tsx

import React from 'react';
import { Modal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { useDictionary } from '@/context/DictionaryContext';
import type { ModalSize } from '@/components/common/modalConfig';

export interface ConfirmModalProps {
  open: boolean;
  title?: React.ReactNode;
  message?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  confirmIcon?: React.ReactNode;
  /**
   * A second button for a real alternative to confirming ("Keep editing", "Discard"). Never a plain Cancel:
   * the dialog always has the X in its header, and Escape or a click outside does the same (`onCancel`).
   */
  alternativeLabel?: React.ReactNode;
  /** Text shown on the confirm button while `busy`; without it the button shows a spinner. */
  busyLabel?: React.ReactNode;
  busy?: boolean;
  /** Keeps the confirm button off until the dialog's own fields are filled in. */
  confirmDisabled?: boolean;
  /** Dialog width; the default is narrow, fine for a short title and one line of text. */
  size?: ModalSize;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel,
  confirmIcon,
  alternativeLabel,
  busyLabel,
  busy = false,
  confirmDisabled = false,
  size = 'xs',
  onConfirm,
  onCancel,
}) => {
  const dict = useDictionary();
  return (
  <Modal
    isOpen={open}
    onClose={onCancel}
    variant="confirm"
    size={size}
    layer="top"
    title={title}
    ariaLabel="Confirm"
    closeButton="header"
    closeButtonAriaLabel={dict.modal.close}
    busy={busy}
    padded
    bodyClassName="text-center"
    footerClassName="flex-row items-stretch justify-stretch gap-2 p-4 sm:px-6"
    footer={
      <>
        {alternativeLabel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-w-0 flex-1 inline-flex items-center justify-center rounded-control px-3 border border-border-color bg-bg-surface py-3 type-card-title text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {alternativeLabel}
          </button>
        )}
        <button
          type="button"
          data-autofocus
          aria-busy={busy || undefined}
          onClick={onConfirm}
          disabled={busy || confirmDisabled}
          className="min-w-0 flex-1 px-3 inline-flex items-center justify-center gap-2 rounded-control border border-transparent bg-accent-red py-3 type-card-title text-text-inverted shadow-md shadow-accent-red/20 transition-all hover:bg-accent-red-hover disabled:opacity-50 cursor-pointer"
        >
          {!busy && confirmIcon}
          {busy && !busyLabel ? (
            <>
              <Spinner size="sm" tone="inverted" />
              <span className="sr-only">{confirmLabel}</span>
            </>
          ) : (
            <span>{busy ? busyLabel : confirmLabel}</span>
          )}
        </button>
      </>
    }
  >
    {message && <div className="type-body-lg text-text-secondary">{message}</div>}
  </Modal>
  );
};
