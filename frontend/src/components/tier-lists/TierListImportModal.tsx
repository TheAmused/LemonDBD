'use client';
// frontend/src/components/tier-lists/TierListImportModal.tsx

import React from 'react';
import { ImportModal, ImportPreview, Notice, useImportDraft } from '@/components/common/ImportModal';
import type { TierListDocument } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import {
  type TierListErrorCode,
  type TierListParseResult,
  decodeSharePayload,
  parseTierListJson,
  serializeTierListDocument,
} from '@/utils/tierLists/codec';
import { TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import { LABEL, TOUCH_BTN, TOUCH_FIELD } from './styles';
import { formatMessage } from '@/utils/i18nFormat';

/**
 * Where the import is going, which decides what a payload is allowed to be:
 *  - `hub`: anything -- a ranking of a known official list, or a new custom list;
 *  - `template`: only a ranking of this one official list;
 *  - `custom`: only a custom list, replacing the one that is open.
 */
export type ImportTarget =
  | { kind: 'hub'; templates: Record<string, string> }
  | { kind: 'template'; slug: string; title: string }
  | { kind: 'custom' };

interface TierListImportModalProps {
  open: boolean;
  target: ImportTarget;
  /** A `#import=` share payload to decode as soon as the modal opens. */
  sharePayload?: string | null;
  onClose: () => void;
  onImport: (doc: TierListDocument) => void;
  dict: Dictionary;
}

type ContextNote = { tone: 'info' | 'error'; text: string };

function contextFor(doc: TierListDocument, target: ImportTarget, t: Dictionary['tierLists']): ContextNote {
  if (doc.template) {
    if (target.kind === 'custom') return { tone: 'error', text: t.expectedCustom };
    if (target.kind === 'template') {
      return doc.template === target.slug
        ? { tone: 'info', text: formatMessage(t.importAsRanking, { title: target.title }) }
        : { tone: 'error', text: t.wrongTemplate };
    }
    const title = target.templates[doc.template];
    return title
      ? { tone: 'info', text: formatMessage(t.importAsRanking, { title }) }
      : { tone: 'error', text: formatMessage(t.templateMissing, { slug: doc.template }) };
  }
  if (target.kind === 'template') return { tone: 'error', text: t.wrongTemplate };
  if (target.kind === 'custom') return { tone: 'info', text: t.importReplacesCustom };
  return { tone: 'info', text: t.importAsCustom };
}

const TOO_LARGE: TierListParseResult = { ok: false, error: 'tooLarge' };
const toText = (r: TierListParseResult) => (r.ok ? serializeTierListDocument(r.doc) : null);

export function TierListImportModal({ open, target, sharePayload, onClose, onImport, dict }: TierListImportModalProps) {
  const t = dict.tierLists;
  const { text, result, fileError, changeText, readFile } = useImportDraft<TierListParseResult>({
    isOpen: open,
    sharePayload,
    decodeShare: decodeSharePayload,
    parse: parseTierListJson,
    toText,
    tooLarge: TOO_LARGE,
    maxPayloadChars: TIER_LIST_LIMITS.maxPayloadChars,
  });

  const note = result?.ok ? contextFor(result.doc, target, t) : null;
  const canImport = Boolean(result?.ok && note?.tone !== 'error');

  const errorText = (code: TierListErrorCode) => t.errors[code];

  const preview = result?.ok
    ? formatMessage(t.importPreview, { title: result.doc.title || t.untitled, tiers: result.doc.tiers.length, items: result.doc.items?.length ?? Object.values(result.doc.placements).flat().length, placed: Object.values(result.doc.placements).flat().length })
    : '';

  return (
    <ImportModal
      isOpen={open}
      onClose={onClose}
      idPrefix="tier-list"
      labels={{
        title: t.importTitle,
        subtitle: t.importSubtitle,
        sharedLinkDetected: t.sharedLinkDetected,
        pasteLabel: t.pasteLabel,
        uploadFile: t.uploadFile,
        pastePlaceholder: t.pastePlaceholder,
        cancel: t.cancel,
        importAction: t.importAction,
      }}
      text={text}
      onTextChange={changeText}
      onFile={(file) => void readFile(file)}
      sharedLink={Boolean(sharePayload)}
      canImport={canImport}
      onImport={() => {
        if (result?.ok && canImport) onImport(result.doc);
      }}
      labelClassName={LABEL}
      fieldClassName={`${TOUCH_FIELD} py-2 text-xs leading-relaxed`}
      buttonClassName={TOUCH_BTN}
      cancelClassName={`${TOUCH_BTN} min-h-[42px] px-5`}
      importClassName={`${TOUCH_BTN} min-h-[42px] px-6`}
      footerClassName="flex w-full flex-wrap items-center justify-center gap-3"
    >
      {fileError && <Notice tone="error" text={t.errors.readFile} />}
      {result && !result.ok && <Notice tone="error" text={errorText(result.error)} />}
      {result?.ok && (
        <>
          <ImportPreview text={preview} />
          {note && <Notice tone={note.tone} text={note.text} />}
          {result.warnings.map((w) => (
            <Notice key={w.code} tone="warning" text={formatMessage(t.warnings[w.code], { count: w.count })} />
          ))}
        </>
      )}
    </ImportModal>
  );
}
