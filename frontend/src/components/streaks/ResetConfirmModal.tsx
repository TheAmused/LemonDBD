'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/streaks/ResetConfirmModal.tsx

import React from 'react';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { useDictionary } from "@/context/DictionaryContext";

export interface ResetConfirmModalProps {
  open: boolean;
  message: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({ open, message, busy = false, onConfirm, onCancel }) => {
  const dict = useDictionary();
  return (
  <ConfirmModal
    open={open}
    title={dict.streaks.resetRunTitle}
    message={message}
    confirmLabel={dict.streaks.abandonConfirm}
    cancelLabel={dict.streaks.cancel}
    busy={busy}
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);
};
