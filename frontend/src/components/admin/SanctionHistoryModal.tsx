'use client';
// frontend/src/components/admin/SanctionHistoryModal.tsx
//
// One user's moderation history in a dialog over the moderation drawer; opened from the profile card.

import React from 'react';
import { Modal } from '@/components/common/Modal';
import { SanctionHistory } from '@/components/admin/SanctionHistory';
import { useDictionary } from '@/context/DictionaryContext';
import type { AdminSanction } from '@/types/moderation';

interface SanctionHistoryModalProps {
  open: boolean;
  onClose: () => void;
  sanctions: AdminSanction[];
  busy: boolean;
  onRevoke: (sanction: AdminSanction) => void;
}

export function SanctionHistoryModal({ open, onClose, sanctions, busy, onRevoke }: SanctionHistoryModalProps) {
  const dict = useDictionary();
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      variant="dialog"
      size="xl"
      layer="top"
      title={dict.moderation.admin.historyTitle}
      closeButtonAriaLabel={dict.admin.close}
      padded
    >
      <SanctionHistory sanctions={sanctions} busy={busy} onRevoke={onRevoke} />
    </Modal>
  );
}
