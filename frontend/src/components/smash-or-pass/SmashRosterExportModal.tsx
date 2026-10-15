'use client';
// frontend/src/components/smash-or-pass/SmashRosterExportModal.tsx

import React from 'react';
import { ExportModal } from '@/components/common/ExportModal';
import type { SmashRosterDocument } from '@/types/smashOrPass';
import { buildShareUrl, encodeSharePayload, exportFileName, serializeSmashRosterDocument } from '@/utils/smashOrPass/codec';
import { SMASH_ROSTER_LIMITS } from '@/utils/smashOrPass/constants';
import { LABEL } from './creator/styles';
import { useDictionary } from "@/context/DictionaryContext";
import { trackEvent } from '@/utils/analytics';

interface SmashRosterExportModalProps {
  doc: SmashRosterDocument | null;
  onClose: () => void;
  locale: string;
}

/** JSON download / copy, and a self-contained share link (the roster rides in the URL fragment). */
export function SmashRosterExportModal({ doc, onClose, locale }: SmashRosterExportModalProps) {
  const dict = useDictionary();
  const t = dict.smashOrPass.exportModal || {};
  return (
    <ExportModal
      doc={doc}
      contentType="smash_roster"
      onClose={onClose}
      locale={locale}
      idPrefix="smash-roster"
      onExport={(method) => trackEvent('smash_roster_export', { method })}
      serialize={serializeSmashRosterDocument}
      fileName={exportFileName}
      encodePayload={encodeSharePayload}
      buildShareUrl={buildShareUrl}
      shareLinkWarnChars={SMASH_ROSTER_LIMITS.shareLinkWarnChars}
      labelClassName={LABEL}
      fieldClassName="sm:text-xs min-h-11"
      jsonFieldClassName="sm:text-xs"
      buttonClassName="min-h-11"
      labels={{
        title: t.title,
        shareLinkLabel: t.shareLinkLabel,
        preparingLink: t.preparingLink,
        copyLink: t.copyLink,
        linkTooLong: t.linkTooLong,
        jsonLabel: t.jsonLabel,
        downloadFile: t.downloadFile,
        copyJson: t.copyJson,
        copied: t.copied,
        copyFailed: t.copyFailed,
      }}
    />
  );
}
