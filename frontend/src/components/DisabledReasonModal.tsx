'use client';
// frontend/src/components/DisabledReasonModal.tsx

import React from 'react';
import { Modal } from '@/components/common/Modal';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";

interface DisabledReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  reason?: string | null;
}

export const DisabledReasonModal: React.FC<DisabledReasonModalProps> = ({ isOpen, onClose, label, reason }) => {
  const t = useDictionary().modal;
  const wasDisabledText = formatMessage(t.wasDisabledTemporarily, { item: label });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="confirm"
      title={t.temporarilyDisabled}
      ariaLabel={label}
      closeButtonAriaLabel={t.close}
      padded
    >
      <p className="type-body-lg text-text-secondary">
        {wasDisabledText}
        {reason && (
          <>
            {' '}{t.reasonLabel}: <span className="font-semibold text-text-primary">{reason}</span>
          </>
        )}
      </p>
    </Modal>
  );
};
