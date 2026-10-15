'use client';
// frontend/src/components/admin/ModerationReasonModal.tsx
//
// Asks the admin why a decision is being taken back (revoke / restore). The reason is required and
// goes to the audit log; it is never shown to the user.

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/common/Button';
import { Textarea } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';
import { useDictionary } from '@/context/DictionaryContext';

interface ModerationReasonModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export function ModerationReasonModal({ open, title, message, confirmLabel, busy, onCancel, onConfirm }: ModerationReasonModalProps) {
  const dict = useDictionary();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      variant="dialog"
      size="md"
      layer="top"
      title={title}
      closeButtonAriaLabel={dict.admin.closeSymbol}
      busy={busy}
      padded
      bodyClassName="space-y-3"
      footerClassName="justify-end flex-col-reverse sm:flex-row"
      footer={
        <>
          <Button size="sm" onClick={onCancel} disabled={busy} className="w-full sm:w-auto">
            {dict.admin.cancel}
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={busy || reason.trim().length === 0}
            onClick={() => onConfirm(reason.trim())}
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="type-body text-text-secondary">{message}</p>
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={500}
        data-autofocus
        aria-label={dict.moderation.admin.reasonPlaceholder}
        placeholder={dict.moderation.admin.reasonPlaceholder}
        className="resize-none"
      />
    </Modal>
  );
}
