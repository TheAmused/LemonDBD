'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/streaks/ResetConfirmModal.tsx

import React from 'react';
import { ConfirmModal } from '@/components/ConfirmModal';

export interface ResetConfirmModalProps {
  open: boolean;
  message: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  dict?: Dictionary;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  open,
  message,
  busy = false,
  onConfirm,
  onCancel,
  dict,
}) => (
  <ConfirmModal
    open={open}
    title={dict?.streaks?.resetRunTitle || 'Reset this run?'}
    message={message}
    confirmLabel={dict?.generator?.resetAllLabel || 'Yes, wipe it'}
    cancelLabel={dict?.streaks?.cancel || 'Cancel'}
    busy={busy}
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);
