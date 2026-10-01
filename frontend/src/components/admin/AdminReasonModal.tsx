'use client';
// frontend/src/components/admin/AdminReasonModal.tsx

import React, { useEffect, useState } from 'react';
import type { Dictionary } from '@/locales/types';
import { Ban } from 'lucide-react';
import { Modal } from '@/components/common/Modal';

export interface AdminReasonModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  confirmLabel?: string;
  dict?: Dictionary;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export const AdminReasonModal: React.FC<AdminReasonModalProps> = ({
  isOpen,
  title,
  subtitle,
  confirmLabel = 'Disable',
  dict,
  onCancel,
  onConfirm,
}) => {
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
      closeButtonAriaLabel={dict?.admin?.closeSymbol || 'Close'}
      padded
      bodyClassName="space-y-3"
      footerClassName="justify-end flex-col-reverse sm:flex-row"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary border border-border-color bg-bg-surface hover:bg-bg-elevated transition-colors cursor-pointer shadow-xs"
          >
            {dict?.admin?.cancel || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-accent-red hover:bg-red-600 text-text-inverted transition-all cursor-pointer shadow-md shadow-accent-red/20"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
        {dict?.admin?.reasonShownToPlayers || 'Reason'}
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={255}
        data-autofocus
        placeholder={dict?.admin?.reasonPlaceholder || ''}
        className="w-full rounded-xl bg-bg-primary border border-border-color text-sm text-text-primary placeholder:text-text-muted p-3 focus:outline-none focus:ring-2 focus:ring-accent-red resize-none"
      />
      <p className="text-right text-[10px] text-text-muted font-mono">{reason.length}/255</p>
    </Modal>
  );
};
