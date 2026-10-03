'use client';
// frontend/src/components/admin/AdminReasonModal.tsx

import React, { useEffect, useState } from 'react';
import { Textarea } from '@/components/common/Field';
import { Button } from '@/components/common/Button';
import type { Dictionary } from '@/locales/types';
import { Ban } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useDictionary } from "@/context/DictionaryContext";

export interface AdminReasonModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export const AdminReasonModal: React.FC<AdminReasonModalProps> = ({ isOpen, title, subtitle, confirmLabel = 'Disable', onCancel, onConfirm }) => {
  const dict = useDictionary();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      variant="dialog"
      size="md"
      tone="danger"
      icon={<Ban className="h-5 w-5" aria-hidden="true" />}
      title={title}
      subtitle={subtitle}
      closeButtonAriaLabel={dict.admin.closeSymbol}
      padded
      bodyClassName="space-y-3"
      footerClassName="justify-end flex-col-reverse sm:flex-row"
      footer={
        <>
          <Button size="sm" onClick={onCancel} className="w-full sm:w-auto">
            {dict.admin.cancel}
          </Button>
          <Button variant="primary" size="sm" onClick={() => onConfirm(reason.trim())} className="w-full sm:w-auto">
            {confirmLabel}
          </Button>
        </>
      }
    >
      <label className="block type-label-xs text-text-secondary">
        {dict.admin.reasonShownToPlayers}
      </label>
      <Textarea
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
