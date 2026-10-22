'use client';
// frontend/src/components/admin/AdminReasonModal.tsx

import React, { useId, useState } from 'react';
import { FieldLabel, Textarea } from '@/components/common/Field';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { useDictionary } from "@/context/DictionaryContext";
import { useOnValueChange } from '@/hooks/useOnValueChange';

export interface AdminReasonModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export const AdminReasonModal: React.FC<AdminReasonModalProps> = ({ isOpen, title, subtitle, confirmLabel, onCancel, onConfirm }) => {
  const dict = useDictionary();
  const fieldId = useId();
  const [reason, setReason] = useState('');

  useOnValueChange(isOpen, (open) => {
    if (open) setReason('');
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      variant="dialog"
      size="md"
      title={title}
      closeButtonAriaLabel={dict.admin.close}
      padded
      bodyClassName="space-y-3"
      footerClassName="justify-end flex-col-reverse sm:flex-row"
      footer={
        <>
          <Button size="sm" onClick={onCancel} className="w-full sm:w-auto">
            {dict.admin.cancel}
          </Button>
          <Button variant="primary" size="sm" onClick={() => onConfirm(reason.trim())} className="w-full sm:w-auto">
            {confirmLabel ?? dict.admin.disable}
          </Button>
        </>
      }
    >
      {subtitle && <p className="type-body text-text-secondary">{subtitle}</p>}
      <FieldLabel htmlFor={fieldId}>{dict.admin.reasonShownToPlayers}</FieldLabel>
      <Textarea
        id={fieldId}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={255}
        data-autofocus
        placeholder={dict.admin.reasonPlaceholder}
        className="resize-none"
      />
      <p className="text-right type-micro text-text-muted">{reason.length}/255</p>
    </Modal>
  );
};
