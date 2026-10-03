'use client';
// frontend/src/components/DisabledReasonModal.tsx

import React from 'react';
import type { Dictionary } from '@/locales/types';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { formatMessage } from '@/utils/i18nFormat';

interface DisabledReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  reason?: string | null;
  dict?: Dictionary;
  t?: Record<string, string>;
}

export const DisabledReasonModal: React.FC<DisabledReasonModalProps> = ({
  isOpen,
  onClose,
  label,
  reason,
  dict,
  t: propT,
}) => {
  const t: Record<string, string> | undefined = propT || dict?.modal;
  const wasDisabledText = t?.wasDisabledTemporarily
    ? formatMessage(t.wasDisabledTemporarily, { item: label })
    : label;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="confirm"
      tone="warning"
      icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
      title={t?.temporarilyDisabled}
      ariaLabel={label}
      closeButtonAriaLabel={t?.close}
      padded
    >
      <p className="type-body-lg text-text-secondary">
        {wasDisabledText}
        {reason && (
          <>
            {' '}{t?.reasonLabel}: <span className="font-semibold text-text-primary">{reason}</span>
          </>
        )}
      </p>
    </Modal>
  );
};
