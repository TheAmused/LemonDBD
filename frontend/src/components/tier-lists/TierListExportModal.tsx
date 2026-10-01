'use client';
// frontend/src/components/tier-lists/TierListExportModal.tsx

import React from 'react';
import { ExportModal } from '@/components/common/ExportModal';
import type { TierListDocument } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import {
  buildShareUrl,
  encodeSharePayload,
  exportFileName,
  serializeTierListDocument,
} from '@/utils/tierLists/codec';
import { TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import { LABEL, TOUCH_BTN, TOUCH_FIELD } from './styles';

interface TierListExportModalProps {
  doc: TierListDocument | null;
  onClose: () => void;
  locale: string;
  dict: Dictionary;
}

/** JSON download / copy, and a self-contained share link (the list rides in the URL fragment). */
export function TierListExportModal({ doc, onClose, locale, dict }: TierListExportModalProps) {
  const t = dict.tierLists;
  return (
    <ExportModal
      doc={doc}
      onClose={onClose}
      locale={locale}
      idPrefix="tier-list"
      serialize={serializeTierListDocument}
      fileName={exportFileName}
      encodePayload={encodeSharePayload}
      buildShareUrl={buildShareUrl}
      shareLinkWarnChars={TIER_LIST_LIMITS.shareLinkWarnChars}
      labelClassName={LABEL}
      fieldClassName={`${TOUCH_FIELD} text-xs`}
      jsonFieldClassName={`${TOUCH_FIELD} py-2 text-xs`}
      buttonClassName={TOUCH_BTN}
      actionsClassName="items-center justify-center"
      labels={{
        title: t.exportTitle,
        subtitle: t.exportSubtitle,
        shareLinkLabel: t.shareLinkLabel,
        preparingLink: t.preparingLink,
        copyLink: t.copyLink,
        linkTooLong: t.linkTooLong,
        jsonLabel: t.jsonLabel,
        downloadFile: t.downloadJson,
        copyJson: t.copyJson,
        copied: t.copied,
        copyFailed: t.copyFailed,
      }}
    />
  );
}
