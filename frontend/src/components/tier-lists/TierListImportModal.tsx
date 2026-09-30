'use client';
// frontend/src/components/tier-lists/TierListImportModal.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, FileJson, Info, Upload } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
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
import { cn } from '@/utils/cn';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD, LABEL } from './styles';

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
        ? { tone: 'info', text: t.importAsRanking.replace('{title}', target.title) }
        : { tone: 'error', text: t.wrongTemplate };
    }
    const title = target.templates[doc.template];
    return title
      ? { tone: 'info', text: t.importAsRanking.replace('{title}', title) }
      : { tone: 'error', text: t.templateMissing.replace('{slug}', doc.template) };
  }
  if (target.kind === 'template') return { tone: 'error', text: t.wrongTemplate };
  if (target.kind === 'custom') return { tone: 'info', text: t.importReplacesCustom };
  return { tone: 'info', text: t.importAsCustom };
}

export function TierListImportModal({ open, target, sharePayload, onClose, onImport, dict }: TierListImportModalProps) {
  const t = dict.tierLists;
  const [text, setText] = useState<string>('');
  const [linkResult, setLinkResult] = useState<TierListParseResult | null>(null);
  const [fileError, setFileError] = useState<boolean>(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setText('');
    setFileError(false);
    setLinkResult(null);
    if (!sharePayload) return;
    let cancelled = false;
    decodeSharePayload(sharePayload).then((result) => {
      if (cancelled) return;
      setLinkResult(result);
      if (result.ok) setText(serializeTierListDocument(result.doc));
    });
    return () => {
      cancelled = true;
    };
  }, [open, sharePayload]);

  const result = useMemo<TierListParseResult | null>(() => {
    if (!text.trim()) return linkResult && !linkResult.ok ? linkResult : null;
    return parseTierListJson(text);
  }, [text, linkResult]);

  const note = result?.ok ? contextFor(result.doc, target, t) : null;
  const canImport = Boolean(result?.ok && note?.tone !== 'error');

  const errorText = (code: TierListErrorCode) => t.errors[code];

  const readFile = async (file: File | undefined) => {
    setFileError(false);
    if (!file) return;
    if (file.size > TIER_LIST_LIMITS.maxPayloadChars) {
      setText('');
      setLinkResult({ ok: false, error: 'tooLarge' });
      return;
    }
    try {
      setLinkResult(null);
      setText(await file.text());
    } catch {
      setFileError(true);
    }
  };

  const preview = result?.ok
    ? t.importPreview
        .replace('{title}', result.doc.title || t.untitled)
        .replace('{tiers}', String(result.doc.tiers.length))
        .replace('{items}', String(result.doc.items?.length ?? Object.values(result.doc.placements).flat().length))
        .replace('{placed}', String(Object.values(result.doc.placements).flat().length))
    : '';

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="2xl"
      title={t.importTitle}
      subtitle={t.importSubtitle}
      icon={<FileJson className="h-5 w-5" aria-hidden="true" />}
      bodyClassName="p-4 sm:p-6 font-sans"
      footer={
        <div className="flex w-full flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={onClose} className={cn(BTN_SECONDARY, 'min-h-[42px] px-5')}>
            {t.cancel}
          </button>
          <button
            type="button"
            disabled={!canImport}
            onClick={() => {
              if (result?.ok && canImport) onImport(result.doc);
            }}
            className={cn(BTN_PRIMARY, 'min-h-[42px] px-6')}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            {t.importAction}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {sharePayload && (
          <p className="flex items-start gap-2 rounded-xl border border-accent-amber/40 bg-accent-amber/10 p-3 text-sm font-semibold text-accent-amber">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t.sharedLinkDetected}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-2">
            <label htmlFor="tier-list-import-json" className={LABEL}>
              {t.pasteLabel}
            </label>
            <button type="button" onClick={() => fileInput.current?.click()} className={BTN_SECONDARY}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              {t.uploadFile}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                void readFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
          <textarea
            id="tier-list-import-json"
            value={text}
            onChange={(e) => {
              setLinkResult(null);
              setText(e.target.value);
            }}
            rows={10}
            spellCheck={false}
            placeholder={t.pastePlaceholder}
            className={`${FIELD} py-2 font-mono text-xs leading-relaxed`}
          />
        </div>

        <div aria-live="polite" className="flex flex-col gap-2">
          {fileError && <Notice tone="error" text={t.errors.readFile} />}
          {result && !result.ok && <Notice tone="error" text={errorText(result.error)} />}
          {result?.ok && (
            <>
              <p className="rounded-xl border border-border-color bg-bg-elevated/60 p-3 text-sm font-bold text-text-primary">
                {preview}
              </p>
              {note && <Notice tone={note.tone} text={note.text} />}
              {result.warnings.map((w) => (
                <Notice key={w.code} tone="warning" text={t.warnings[w.code].replace('{count}', String(w.count))} />
              ))}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Notice({ tone, text }: { tone: 'info' | 'warning' | 'error'; text: string }) {
  const classes =
    tone === 'error'
      ? 'border-accent-red/40 bg-accent-red/10 text-accent-red'
      : tone === 'warning'
        ? 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber'
        : 'border-border-color bg-bg-elevated/60 text-text-secondary';
  const Icon = tone === 'info' ? Info : CircleAlert;
  return (
    <p role={tone === 'error' ? 'alert' : undefined} className={`flex items-start gap-2 rounded-xl border p-3 text-xs font-semibold ${classes}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {text}
    </p>
  );
}
