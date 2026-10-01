'use client';
// frontend/src/components/smash-or-pass/SmashRosterImportModal.tsx

import React, { useEffect, useState } from 'react';
import { ImportModal, ImportPreview, Notice, useImportDraft } from '@/components/common/ImportModal';
import type { Dictionary } from '@/locales/types';
import {
  type SmashRosterErrorCode,
  type SmashRosterParseResult,
  decodeSharePayload,
  parseSmashRosterJson,
  serializeSmashRosterDocument,
} from '@/utils/smashOrPass/codec';
import { SMASH_ROSTER_LIMITS } from '@/utils/smashOrPass/constants';
import { localRosterSlug } from '@/utils/smashOrPass/localRoster';
import { createCustomRosterId, saveCustomRoster } from '@/utils/smashOrPass/storage';
import { LABEL } from './creator/styles';

interface SmashRosterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** A `#import=` share payload to decode as soon as the modal opens. */
  sharePayload?: string | null;
  /** Called with the new roster's `local:<id>` slug once it has been saved. */
  onImported: (slug: string) => void;
  dict?: Dictionary | any;
}

const TOO_LARGE: SmashRosterParseResult = { ok: false, error: 'tooLarge' };
const toText = (r: SmashRosterParseResult) => (r.ok ? serializeSmashRosterDocument(r.doc) : null);

export function SmashRosterImportModal({ isOpen, onClose, sharePayload, onImported, dict }: SmashRosterImportModalProps) {
  const t = dict?.smashOrPass?.importModal || {};
  const [saveError, setSaveError] = useState<'quota' | 'unavailable' | null>(null);
  const { text, result, fileError, changeText, readFile } = useImportDraft<SmashRosterParseResult>({
    isOpen,
    sharePayload,
    decodeShare: decodeSharePayload,
    parse: parseSmashRosterJson,
    toText,
    tooLarge: TOO_LARGE,
    maxPayloadChars: SMASH_ROSTER_LIMITS.maxPayloadChars,
  });

  useEffect(() => {
    if (isOpen) setSaveError(null);
  }, [isOpen, sharePayload]);

  const canImport = Boolean(result?.ok);
  const errorText = (code: SmashRosterErrorCode) => t.errors?.[code] || code;

  const preview = result?.ok
    ? (t.preview || 'Importing "{name}" with {count} entities')
        .replace('{name}', result.doc.name)
        .replace('{count}', String(result.doc.entities.length))
    : '';

  const doImport = () => {
    if (!result?.ok) return;
    const id = createCustomRosterId();
    const saveResult = saveCustomRoster({ id, ...result.doc, createdAt: Date.now() });
    if (!saveResult.ok) {
      setSaveError(saveResult.reason);
      return;
    }
    onImported(localRosterSlug(id));
  };

  return (
    <ImportModal
      isOpen={isOpen}
      onClose={onClose}
      idPrefix="smash-roster"
      labels={{
        title: t.title || 'Import a Roster',
        subtitle: t.subtitle || 'Paste JSON, upload a file, or open a shared link.',
        sharedLinkDetected: t.sharedLinkDetected || 'A shared roster link was detected and loaded below.',
        pasteLabel: t.pasteLabel || 'Paste roster JSON',
        uploadFile: t.uploadFile || 'Upload file',
        pastePlaceholder: t.pastePlaceholder || 'Paste a roster JSON document here...',
        cancel: t.cancel || 'Cancel',
        importAction: t.importAction || 'Import',
      }}
      text={text}
      onTextChange={changeText}
      onFile={(file) => void readFile(file)}
      sharedLink={Boolean(sharePayload)}
      canImport={canImport}
      onImport={doImport}
      labelClassName={LABEL}
      fieldClassName="font-mono sm:text-xs leading-relaxed"
      buttonClassName="min-h-[44px]"
    >
      {fileError && <Notice tone="error" text={t.readFileError || 'Could not read that file.'} />}
      {result && !result.ok && <Notice tone="error" text={errorText(result.error)} />}
      {saveError && (
        <Notice
          tone="error"
          text={saveError === 'quota' ? (t.saveFailedQuota || 'Not saved: storage is full.') : (t.saveFailedUnavailable || 'Not saved: storage is unavailable.')}
        />
      )}
      {result?.ok && (
        <>
          <ImportPreview text={preview} />
          {result.warnings.map((w) => (
            <Notice key={w.code} tone="warning" text={(t.warnings?.[w.code] || w.code).replace('{count}', String(w.count))} />
          ))}
        </>
      )}
    </ImportModal>
  );
}
