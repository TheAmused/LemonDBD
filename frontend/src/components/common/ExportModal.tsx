'use client';
// frontend/src/components/common/ExportModal.tsx

import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, Link2, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input, Textarea } from '@/components/common/Field';
import { copyTextWithFallback } from '@/utils/clipboard';
import { cn } from '@/utils/cn';
import { formatMessage } from '@/utils/i18nFormat';
import { useAuth } from '@/context/AuthContext';
import { useDictionary } from '@/context/DictionaryContext';
import { isRecord } from '@/utils/shareCodec';
import { embedManifest, signExportPayload, stripManifest } from '@/utils/contentSigning';
import { signingPayload } from '@/utils/contentPayload';

export type CopyState = 'idle' | 'copied' | 'failed';

export interface ExportModalLabels {
  title: string;
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
  /** Called after a successful copy of the link or the JSON, or after the file download starts. */
  onExport?: (method: 'link' | 'json_copy' | 'file') => void;
  /** Content type classification for cryptographic signing (e.g. 'tier_list', 'smash_roster'). */
  contentType?: string;
}

import { downloadFile } from '@/utils/download';

/** Triggers a browser download of `text` as `fileName`. */
export function downloadTextFile(text: string, fileName: string, mime = 'application/json'): void {
  downloadFile(text, fileName, mime);
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
  onExport,
  contentType,
}: ExportModalProps<D>) {
  const { user, isLoading: authLoading } = useAuth();
  const dict = useDictionary();
  const resolvedContentType =
    contentType ||
    (idPrefix === 'tier-list' ? 'tier_list' : idPrefix === 'smash-roster' ? 'smash_roster' : idPrefix.replace(/-/g, '_'));

  // Custom content only leaves the app signed with the author's account: nothing is shown until the
  // server has signed it, and if signing fails there is no unsigned fallback.
  const [exportedDoc, setExportedDoc] = useState<D | null>(null);
  const [exportedJson, setExportedJson] = useState<string>('');
  const [signFailed, setSignFailed] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [jsonCopy, setJsonCopy] = useState<CopyState>('idle');
  const [linkCopy, setLinkCopy] = useState<CopyState>('idle');
  const [isSigning, setIsSigning] = useState<boolean>(true);

  useEffect(() => {
    setJsonCopy('idle');
    setLinkCopy('idle');
    setShareUrl('');

    const currentUnsignedDoc = isRecord(doc) ? (stripManifest(doc) as unknown as D) : doc;
    setExportedDoc(null);
    setExportedJson('');
    setSignFailed(false);

    if (!doc) {
      return;
    }

    if (authLoading) {
      setIsSigning(true);
      return;
    }

    let cancelled = false;

    async function prepareExport() {
      let finalDoc: D | null = null;
      if (user && isRecord(doc)) {
        setIsSigning(true);
        try {
          const manifest = await signExportPayload(
            resolvedContentType,
            signingPayload(resolvedContentType, currentUnsignedDoc)
          );
          if (manifest) {
            finalDoc = embedManifest(currentUnsignedDoc as Record<string, unknown>, manifest) as unknown as D;
          }
        } catch {
          finalDoc = null;
        }
      }
      if (cancelled) return;
      setIsSigning(false);
      if (!finalDoc) {
        setSignFailed(true);
        return;
      }
      setExportedDoc(finalDoc);
      setExportedJson(serialize(finalDoc));

      try {
        const payload = await encodePayload(finalDoc);
        if (!cancelled) {
          setShareUrl(buildShareUrl(window.location.origin, locale, payload));
        }
      } catch {
        if (!cancelled) {
          setShareUrl('');
        }
      }
    }

    void prepareExport();

    return () => {
      cancelled = true;
    };
  }, [doc, locale, user, authLoading, resolvedContentType, serialize, encodePayload, buildShareUrl]);


  if (!doc) return null;

  const copyLabel = (state: CopyState, idle: string) =>
    state === 'copied' ? labels.copied : state === 'failed' ? labels.copyFailed : idle;

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="2xl"
      title={labels.title}
      bodyClassName="p-4 sm:p-6"
    >
      <div className="flex flex-col gap-6">
        {signFailed && (
          <p role="alert" className="flex items-start gap-2 rounded-card border border-accent-red/40 bg-accent-red/10 p-3 type-strong text-accent-red">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {dict.tierLists.signFailed}
          </p>
        )}
        <section className="flex flex-col gap-2">
          <label htmlFor={`${idPrefix}-share-link`} className={labelClassName}>
            {labels.shareLinkLabel}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={`${idPrefix}-share-link`}
              readOnly
              value={shareUrl || (signFailed ? '' : labels.preparingLink)}
              onFocus={(e) => e.currentTarget.select()}
              className={cn(fieldClassName, '')}
            />
            <Button
              variant="primary"
              disabled={!shareUrl}
              onClick={async () => {
                const ok = await copyTextWithFallback(shareUrl);
                setLinkCopy(ok ? 'copied' : 'failed');
                if (ok) onExport?.('link');
              }}
              className={buttonClassName}
              aria-live="polite"
            >
              {linkCopy === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
              {copyLabel(linkCopy, labels.copyLink)}
            </Button>
          </div>
          {shareUrl.length > shareLinkWarnChars && (
            <p className="flex items-start gap-2 rounded-card border border-accent-amber/40 bg-accent-amber/10 p-3 type-strong text-accent-amber">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {formatMessage(labels.linkTooLong, { count: shareUrl.length.toLocaleString(locale) })}
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
            value={exportedJson}
            rows={10}
            onFocus={(e) => e.currentTarget.select()}
            className={cn(jsonFieldClassName ?? fieldClassName, ' leading-relaxed')}
          />
          <div className={cn('flex flex-wrap gap-2', actionsClassName)}>
            <Button
              variant="secondary"
              disabled={isSigning || authLoading || !exportedJson}
              onClick={() => {
                downloadTextFile(exportedJson, fileName(exportedDoc || doc));
                onExport?.('file');
              }}
              className={buttonClassName}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {labels.downloadFile}
            </Button>
            <Button
              variant="secondary"
              disabled={isSigning || authLoading || !exportedJson}
              onClick={async () => {
                const ok = await copyTextWithFallback(exportedJson);
                setJsonCopy(ok ? 'copied' : 'failed');
                if (ok) onExport?.('json_copy');
              }}
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
