'use client';
// frontend/src/components/tier-lists/TierListExportModal.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Link2, Share2, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import type { TierListDocument } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import {
  buildShareUrl,
  encodeSharePayload,
  exportFileName,
  serializeTierListDocument,
} from '@/utils/tierLists/codec';
import { TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD, LABEL } from './styles';

interface TierListExportModalProps {
  doc: TierListDocument | null;
  onClose: () => void;
  locale: string;
  dict: Dictionary;
}

type CopyState = 'idle' | 'copied' | 'failed';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** JSON download / copy, and a self-contained share link (the list rides in the URL fragment). */
export function TierListExportModal({ doc, onClose, locale, dict }: TierListExportModalProps) {
  const t = dict.tierLists;
  const json = useMemo(() => (doc ? serializeTierListDocument(doc) : ''), [doc]);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [jsonCopy, setJsonCopy] = useState<CopyState>('idle');
  const [linkCopy, setLinkCopy] = useState<CopyState>('idle');

  useEffect(() => {
    setJsonCopy('idle');
    setLinkCopy('idle');
    setShareUrl('');
    if (!doc) return;
    let cancelled = false;
    encodeSharePayload(doc)
      .then((payload) => {
        if (!cancelled) setShareUrl(buildShareUrl(window.location.origin, locale, payload));
      })
      .catch(() => {
        if (!cancelled) setShareUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [doc, locale]);

  if (!doc) return null;

  const download = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName(doc);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyLabel = (state: CopyState, idle: string) =>
    state === 'copied' ? t.copied : state === 'failed' ? t.copyFailed : idle;

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="2xl"
      title={t.exportTitle}
      subtitle={t.exportSubtitle}
      icon={<Share2 className="h-5 w-5" aria-hidden="true" />}
      bodyClassName="p-4 sm:p-6 font-sans"
    >
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <label htmlFor="tier-list-share-link" className={LABEL}>
            {t.shareLinkLabel}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="tier-list-share-link"
              readOnly
              value={shareUrl || t.preparingLink}
              onFocus={(e) => e.currentTarget.select()}
              className={`${FIELD} font-mono text-xs`}
            />
            <button
              type="button"
              disabled={!shareUrl}
              onClick={async () => setLinkCopy((await copyText(shareUrl)) ? 'copied' : 'failed')}
              className={`${BTN_PRIMARY} shrink-0`}
              aria-live="polite"
            >
              {linkCopy === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
              {copyLabel(linkCopy, t.copyLink)}
            </button>
          </div>
          {shareUrl.length > TIER_LIST_LIMITS.shareLinkWarnChars && (
            <p className="flex items-start gap-2 rounded-xl border border-accent-amber/40 bg-accent-amber/10 p-3 text-xs font-semibold text-accent-amber">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {t.linkTooLong.replace('{count}', shareUrl.length.toLocaleString(locale))}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <label htmlFor="tier-list-json" className={LABEL}>
            {t.jsonLabel}
          </label>
          <textarea
            id="tier-list-json"
            readOnly
            value={json}
            rows={10}
            onFocus={(e) => e.currentTarget.select()}
            className={`${FIELD} py-2 font-mono text-xs leading-relaxed`}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={download} className={BTN_SECONDARY}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {t.downloadJson}
            </button>
            <button
              type="button"
              onClick={async () => setJsonCopy((await copyText(json)) ? 'copied' : 'failed')}
              className={BTN_SECONDARY}
              aria-live="polite"
            >
              {jsonCopy === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copyLabel(jsonCopy, t.copyJson)}
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
