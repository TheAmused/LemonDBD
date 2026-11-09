'use client';
// frontend/src/components/streaks/AbandonConfirmModal.tsx

import React from 'react';
import { usePathname } from 'next/navigation';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { useDictionary } from "@/context/DictionaryContext";
import { reportChallengeUi } from './challengeTracking';

export interface AbandonConfirmModalProps {
  open: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AbandonConfirmModal: React.FC<AbandonConfirmModalProps> = ({ open, busy = false, onConfirm, onCancel }) => {
  const dict = useDictionary();
  const pathname = usePathname();
  return (
  <ConfirmModal
    open={open}
    title={dict.streaks.abandonRunTitle}
    message={dict.streaks.abandonConfirmPrompt}
    confirmLabel={dict.streaks.abandonConfirm}
    size="sm"
    closeButton="header"
    closeButtonAriaLabel={dict.modal.close}
    busy={busy}
    onConfirm={onConfirm}
    onCancel={() => {
      reportChallengeUi(pathname, 'abandon_cancel');
      onCancel();
    }}
  />
);
};
