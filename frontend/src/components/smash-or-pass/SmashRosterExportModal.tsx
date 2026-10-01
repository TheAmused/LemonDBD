'use client';
// frontend/src/components/smash-or-pass/SmashRosterExportModal.tsx

import React from 'react';
import { ExportModal } from '@/components/common/ExportModal';
import type { SmashRosterDocument } from '@/types/smashOrPass';
import type { Dictionary } from '@/locales/types';
import { buildShareUrl, encodeSharePayload, exportFileName, serializeSmashRosterDocument } from '@/utils/smashOrPass/codec';
import { SMASH_ROSTER_LIMITS } from '@/utils/smashOrPass/constants';
import { LABEL } from './creator/styles';

interface SmashRosterExportModalProps {
  doc: SmashRosterDocument | null;
  onClose: () => void;
  locale: string;
  dict?: Dictionary | any;
}

/** JSON download / copy, and a self-contained share link (the roster rides in the URL fragment). */
export function SmashRosterExportModal({ doc, onClose, locale, dict }: SmashRosterExportModalProps) {
  const t = dict?.smashOrPass?.exportModal || {};
  return (
    <ExportModal
      doc={doc}
      onClose={onClose}
      locale={locale}
      idPrefix="smash-roster"
      serialize={serializeSmashRosterDocument}
      fileName={exportFileName}
      encodePayload={encodeSharePayload}
      buildShareUrl={buildShareUrl}
      shareLinkWarnChars={SMASH_ROSTER_LIMITS.shareLinkWarnChars}
      labelClassName={LABEL}
      fieldClassName="sm:text-xs min-h-[44px]"
      jsonFieldClassName="sm:text-xs"
      buttonClassName="min-h-[44px]"
      labels={{
        title: t.title || 'Export Roster',
        subtitle: t.subtitle || 'Copy a shareable link, or download the roster as a JSON file.',
        shareLinkLabel: t.shareLinkLabel || 'Shareable link',
        preparingLink: t.preparingLink || 'Preparing link...',
        copyLink: t.copyLink || 'Copy Link',
        linkTooLong: t.linkTooLong || 'This link is {count} characters long.',
        jsonLabel: t.jsonLabel || 'Roster JSON',
        downloadFile: t.downloadFile || 'Download File',
        copyJson: t.copyJson || 'Copy JSON',
        copied: t.copied || 'Copied!',
        copyFailed: t.copyFailed || "Couldn't copy",
      }}
    />
  );
}
