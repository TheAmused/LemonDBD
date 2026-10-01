'use client';
// frontend/src/components/common/ExportModal.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Link2, Share2, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input, Textarea } from '@/components/common/Field';
import { copyTextWithFallback } from '@/utils/clipboard';
import { cn } from '@/utils/cn';

export type CopyState = 'idle' | 'copied' | 'failed';

export interface ExportModalLabels {
  title: string;
  subtitle: string;
  shareLinkLabel: string;
  preparingLink: string;
  copyLink: string;
  /** May contain `{count}`, replaced with the link length. */
  linkTooLong: string;
  jsonLabel: string;
  downloadFile: string;
  copyJson: string;
  copied: string;
  copyFailed: string;
}

export interface ExportModalProps<D> {
  /** The document to export; the modal renders nothing while it is null. */
  doc: D | null;
  onClose: () => void;
  locale: string;
  labels: ExportModalLabels;
  /** Prefix for the field ids (`<prefix>-share-link`, `<prefix>-json`). */
  idPrefix: string;
  serialize: (doc: D) => string;
  fileName: (doc: D) => string;
  /** Compact payload for the share link's `#import=` fragment. */
  encodePayload: (doc: D) => Promise<string>;
  buildShareUrl: (origin: string, locale: string, payload: string) => string;
  /** Past this many characters the share link gets a "may be truncated" warning. */
  shareLinkWarnChars: number;
  labelClassName: string;
  /** Extra classes on the share-link input and the JSON textarea. */
  fieldClassName?: string;
  jsonFieldClassName?: string;
  /** Extra classes on every button. */
  buttonClassName?: string;
  /** Layout of the JSON action row. */
  actionsClassName?: string;
}

/** Triggers a browser download of `text` as `fileName`. */
export function downloadTextFile(text: string, fileName: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Shared export shell: a self-contained share link (the document rides in the
 * URL fragment), plus the pretty JSON with download / copy buttons.
 */
export function ExportModal<D>({
  doc,
  onClose,
  locale,
  labels,
  idPrefix,
  serialize,
  fileName,
  encodePayload,
  buildShareUrl,
  shareLinkWarnChars,
  labelClassName,
  fieldClassName,
  jsonFieldClassName,
  buttonClassName,
  actionsClassName,
}: ExportModalProps<D>) {
  const json = useMemo(() => (doc ? serialize(doc) : ''), [doc, serialize]);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [jsonCopy, setJsonCopy] = useState<CopyState>('idle');
  const [linkCopy, setLinkCopy] = useState<CopyState>('idle');

  useEffect(() => {
    setJsonCopy('idle');
    setLinkCopy('idle');
    setShareUrl('');
    if (!doc) return;
    let cancelled = false;
    encodePayload(doc)
      .then((payload) => {
        if (!cancelled) setShareUrl(buildShareUrl(window.location.origin, locale, payload));
      })
      .catch(() => {
        if (!cancelled) setShareUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [doc, locale, encodePayload, buildShareUrl]);

  if (!doc) return null;

  const copyLabel = (state: CopyState, idle: string) =>
    state === 'copied' ? labels.copied : state === 'failed' ? labels.copyFailed : idle;

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="2xl"
      title={labels.title}
      subtitle={labels.subtitle}
      icon={<Share2 className="h-5 w-5" aria-hidden="true" />}
      bodyClassName="p-4 sm:p-6 font-sans"
    >
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <label htmlFor={`${idPrefix}-share-link`} className={labelClassName}>
            {labels.shareLinkLabel}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={`${idPrefix}-share-link`}
              readOnly
              value={shareUrl || labels.preparingLink}
              onFocus={(e) => e.currentTarget.select()}
              className={cn(fieldClassName, 'font-mono')}
            />
            <Button
              variant="primary"
              disabled={!shareUrl}
              onClick={async () => setLinkCopy((await copyTextWithFallback(shareUrl)) ? 'copied' : 'failed')}
              className={buttonClassName}
              aria-live="polite"
            >
              {linkCopy === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
              {copyLabel(linkCopy, labels.copyLink)}
            </Button>
          </div>
          {shareUrl.length > shareLinkWarnChars && (
            <p className="flex items-start gap-2 rounded-xl border border-accent-amber/40 bg-accent-amber/10 p-3 text-xs font-semibold text-accent-amber">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {labels.linkTooLong.replace('{count}', shareUrl.length.toLocaleString(locale))}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <label htmlFor={`${idPrefix}-json`} className={labelClassName}>
            {labels.jsonLabel}
          </label>
          <Textarea
            id={`${idPrefix}-json`}
            readOnly
            value={json}
            rows={10}
            onFocus={(e) => e.currentTarget.select()}
            className={cn(jsonFieldClassName ?? fieldClassName, 'font-mono leading-relaxed')}
          />
          <div className={cn('flex flex-wrap gap-2', actionsClassName)}>
            <Button variant="secondary" onClick={() => downloadTextFile(json, fileName(doc))} className={buttonClassName}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {labels.downloadFile}
            </Button>
            <Button
              variant="secondary"
              onClick={async () => setJsonCopy((await copyTextWithFallback(json)) ? 'copied' : 'failed')}
              className={buttonClassName}
              aria-live="polite"
            >
              {jsonCopy === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copyLabel(jsonCopy, labels.copyJson)}
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
