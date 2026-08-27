'use client';
// frontend/src/components/streaks/ResetConfirmModal.tsx

import React from 'react';
import { RotateCcw } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';

export interface ResetConfirmModalProps {
  open: boolean;
  message: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  dict?: any;
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
    confirmIcon={<RotateCcw className="h-4 w-4" />}
    busy={busy}
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);
