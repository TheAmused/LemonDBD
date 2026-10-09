'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/streaks/AbandonConfirmModal.tsx

import React from 'react';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { useDictionary } from "@/context/DictionaryContext";

export interface AbandonConfirmModalProps {
  open: boolean;
  message: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AbandonConfirmModal: React.FC<AbandonConfirmModalProps> = ({ open, message, busy = false, onConfirm, onCancel }) => {
  const dict = useDictionary();
  return (
  <ConfirmModal
    open={open}
    title={dict.streaks.abandonRunTitle}
    message={message}
    confirmLabel={dict.streaks.abandonConfirm}
    cancelLabel={dict.streaks.cancel}
    busy={busy}
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);
};
