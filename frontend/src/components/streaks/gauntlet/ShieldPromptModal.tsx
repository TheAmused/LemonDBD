'use client';
// frontend/src/components/streaks/gauntlet/ShieldPromptModal.tsx

import React from 'react';
import { Shield } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';

interface ShieldPromptModalProps {
  open: boolean;
  title: string;
  /** The cost line under the question. */
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  /** Also what Escape and a click outside the card mean: no shield. */
  onCancel: () => void;
}

/** Asked after a loss is reported when a shield could keep the run. Red, since it is about a loss; gold is kept for rewards like the token roll. */
export const ShieldPromptModal: React.FC<ShieldPromptModalProps> = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  busy = false,
  onConfirm,
  onCancel,
}) => (
  <Modal isOpen={open} onClose={onCancel} variant="lightbox" size="sm" closeButton="none" ariaLabel={title}>
    <div className="ck-card-in relative flex w-full cursor-default flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border border-accent-red/60 bg-bg-surface px-8 py-10 text-center">
      <Shield className="h-12 w-12 text-accent-red" aria-hidden="true" />
      <h2 className="type-card-title text-balance text-text-primary">{title}</h2>
      <p className="type-label-sm tracking-spaced-md text-accent-red">{message}</p>
      <div className="mt-2 flex w-full gap-3">
        <Button variant="secondary" size="md" className="flex-1" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button variant="primary" size="md" className="flex-1" onClick={onConfirm} disabled={busy} data-autofocus>
          {confirmLabel}
        </Button>
      </div>
    </div>
  </Modal>
);
