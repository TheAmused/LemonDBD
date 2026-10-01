'use client';
// frontend/src/components/smash-or-pass/SmashRosterImportModal.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, FileJson, Info, Upload } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
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
import { Button } from '@/components/common/Button';
import { Textarea } from '@/components/common/Field';

interface SmashRosterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** A `#import=` share payload to decode as soon as the modal opens. */
  sharePayload?: string | null;
  /** Called with the new roster's `local:<id>` slug once it has been saved. */
  onImported: (slug: string) => void;
  dict?: Dictionary | any;
}

export function SmashRosterImportModal({ isOpen, onClose, sharePayload, onImported, dict }: SmashRosterImportModalProps) {
  const t = dict?.smashOrPass?.importModal || {};
  const [text, setText] = useState<string>('');
  const [linkResult, setLinkResult] = useState<SmashRosterParseResult | null>(null);
  const [fileError, setFileError] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<'quota' | 'unavailable' | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setText('');
    setFileError(false);
    setSaveError(null);
    setLinkResult(null);
    if (!sharePayload) return;
    let cancelled = false;
    decodeSharePayload(sharePayload).then((result) => {
      if (cancelled) return;
      setLinkResult(result);
      if (result.ok) setText(serializeSmashRosterDocument(result.doc));
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, sharePayload]);

  const result = useMemo<SmashRosterParseResult | null>(() => {
    if (!text.trim()) return linkResult && !linkResult.ok ? linkResult : null;
    return parseSmashRosterJson(text);
  }, [text, linkResult]);

  const canImport = Boolean(result?.ok);
  const errorText = (code: SmashRosterErrorCode) => t.errors?.[code] || code;

  const readFile = async (file: File | undefined) => {
    setFileError(false);
    if (!file) return;
    if (file.size > SMASH_ROSTER_LIMITS.maxPayloadChars) {
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={t.title || 'Import a Roster'}
      subtitle={t.subtitle || 'Paste JSON, upload a file, or open a shared link.'}
      icon={<FileJson className="h-5 w-5" aria-hidden="true" />}
      bodyClassName="p-4 sm:p-6 font-sans"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" size="md" onClick={onClose} className="min-h-[44px]">
            {t.cancel || 'Cancel'}
          </Button>
          <Button variant="primary" size="md" disabled={!canImport} onClick={doImport} className="min-h-[44px]">
            <Upload className="h-4 w-4" aria-hidden="true" />
            {t.importAction || 'Import'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {sharePayload && (
          <p className="flex items-start gap-2 rounded-xl border border-accent-amber/40 bg-accent-amber/10 p-3 text-sm font-semibold text-accent-amber">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t.sharedLinkDetected || 'A shared roster link was detected and loaded below.'}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-2">
            <label htmlFor="smash-roster-import-json" className={LABEL}>
              {t.pasteLabel || 'Paste roster JSON'}
            </label>
            <Button variant="secondary" size="md" onClick={() => fileInput.current?.click()} className="min-h-[44px]">
              <Upload className="h-4 w-4" aria-hidden="true" />
              {t.uploadFile || 'Upload file'}
            </Button>
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
          <Textarea
            fieldSize="md"
            id="smash-roster-import-json"
            value={text}
            onChange={(e) => {
              setLinkResult(null);
              setText(e.target.value);
            }}
            rows={10}
            spellCheck={false}
            placeholder={t.pastePlaceholder || 'Paste a roster JSON document here...'}
            className="font-mono sm:text-xs leading-relaxed"
          />
        </div>

        <div aria-live="polite" className="flex flex-col gap-2">
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
              <p className="rounded-xl border border-border-color bg-bg-elevated/60 p-3 text-sm font-bold text-text-primary">
                {preview}
              </p>
              {result.warnings.map((w) => (
                <Notice key={w.code} tone="warning" text={(t.warnings?.[w.code] || w.code).replace('{count}', String(w.count))} />
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
