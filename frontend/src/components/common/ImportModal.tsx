'use client';
// frontend/src/components/common/ImportModal.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, FileJson, Info, Upload } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Textarea } from '@/components/common/Field';

type ParseResultLike = { ok: boolean };

export interface ImportDraftOptions<R extends ParseResultLike> {
  isOpen: boolean;
  /** A `#import=` share payload to decode as soon as the modal opens. */
  sharePayload?: string | null;
  decodeShare: (payload: string) => Promise<R>;
  parse: (text: string) => R;
  /** The pretty JSON text for a successfully decoded share link, else null. */
  toText: (result: R) => string | null;
  /** Result reported when an uploaded file exceeds `maxPayloadChars`. */
  tooLarge: R;
  maxPayloadChars: number;
}

/**
 * The state behind an import dialog: the pasted/uploaded/share-link text, its
 * parse result, and file-read errors. Resets whenever the dialog (re)opens.
 */
export function useImportDraft<R extends ParseResultLike>({
  isOpen,
  sharePayload,
  decodeShare,
  parse,
  toText,
  tooLarge,
  maxPayloadChars,
}: ImportDraftOptions<R>) {
  const [text, setText] = useState<string>('');
  const [linkResult, setLinkResult] = useState<R | null>(null);
  const [fileError, setFileError] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setText('');
    setFileError(false);
    setLinkResult(null);
    if (!sharePayload) return;
    let cancelled = false;
    decodeShare(sharePayload).then((result) => {
      if (cancelled) return;
      setLinkResult(result);
      const decoded = result.ok ? toText(result) : null;
      if (decoded !== null) setText(decoded);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, sharePayload, decodeShare, toText]);

  const result = useMemo<R | null>(() => {
    if (!text.trim()) return linkResult && !linkResult.ok ? linkResult : null;
    return parse(text);
  }, [text, linkResult, parse]);

  /** Typing/pasting replaces any decoded link result. */
  const changeText = useCallback((value: string) => {
    setLinkResult(null);
    setText(value);
  }, []);

  const readFile = useCallback(
    async (file: File | undefined) => {
      setFileError(false);
      if (!file) return;
      if (file.size > maxPayloadChars) {
        setText('');
        setLinkResult(tooLarge);
        return;
      }
      try {
        setLinkResult(null);
        setText(await file.text());
      } catch {
        setFileError(true);
      }
    },
    [maxPayloadChars, tooLarge]
  );

  return { text, result, fileError, changeText, readFile };
}

export type NoticeTone = 'info' | 'warning' | 'error';

export function Notice({ tone, text }: { tone: NoticeTone; text: string }) {
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

/** The bold summary line shown above warnings once a payload parsed. */
export function ImportPreview({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-border-color bg-bg-elevated/60 p-3 type-card-title text-text-primary">
      {text}
    </p>
  );
}

export interface ImportModalLabels {
  title: string;
  subtitle: string;
  sharedLinkDetected: string;
  pasteLabel: string;
  uploadFile: string;
  pastePlaceholder: string;
  cancel: string;
  importAction: string;
}

export interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  labels: ImportModalLabels;
  /** Prefix for the textarea id (`<prefix>-import-json`). */
  idPrefix: string;
  text: string;
  onTextChange: (value: string) => void;
  onFile: (file: File | undefined) => void;
  /** Shows the "shared link detected" banner. */
  sharedLink?: boolean;
  canImport: boolean;
  onImport: () => void;
  labelClassName: string;
  /** Extra classes on the textarea. */
  fieldClassName?: string;
  /** Extra classes on the upload button (and, by default, the footer buttons). */
  buttonClassName?: string;
  cancelClassName?: string;
  importClassName?: string;
  footerClassName?: string;
  /** Status area (errors, preview, warnings) rendered under the textarea. */
  children?: React.ReactNode;
}

/** Shared import shell: paste or upload JSON, with a status slot for format-specific notices. */
export function ImportModal({
  isOpen,
  onClose,
  labels,
  idPrefix,
  text,
  onTextChange,
  onFile,
  sharedLink,
  canImport,
  onImport,
  labelClassName,
  fieldClassName,
  buttonClassName,
  cancelClassName,
  importClassName,
  footerClassName,
  children,
}: ImportModalProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={labels.title}
      subtitle={labels.subtitle}
      icon={<FileJson className="h-5 w-5" aria-hidden="true" />}
      bodyClassName="p-4 sm:p-6"
      footer={
        <div className={footerClassName ?? 'flex w-full flex-wrap items-center justify-end gap-2'}>
          <Button variant="secondary" onClick={onClose} className={cancelClassName ?? buttonClassName}>
            {labels.cancel}
          </Button>
          <Button variant="primary" disabled={!canImport} onClick={onImport} className={importClassName ?? buttonClassName}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            {labels.importAction}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {sharedLink && (
          <p className="flex items-start gap-2 rounded-xl border border-accent-amber/40 bg-accent-amber/10 p-3 type-card-title text-accent-amber">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {labels.sharedLinkDetected}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-2">
            <label htmlFor={`${idPrefix}-import-json`} className={labelClassName}>
              {labels.pasteLabel}
            </label>
            <Button variant="secondary" onClick={() => fileInput.current?.click()} className={buttonClassName}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              {labels.uploadFile}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                onFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
          <Textarea
            id={`${idPrefix}-import-json`}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={10}
            spellCheck={false}
            placeholder={labels.pastePlaceholder}
            className={fieldClassName}
          />
        </div>

        <div aria-live="polite" className="flex flex-col gap-2">
          {children}
        </div>
      </div>
    </Modal>
  );
}
