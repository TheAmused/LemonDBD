'use client';
// frontend/src/components/common/ReportContentModal.tsx

import React, { useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useDictionary } from '@/context/DictionaryContext';
import { apiUrl, authFetch } from '@/utils/api';
import { stripManifest, type ContentManifest } from '@/utils/contentSigning';
import { isRecord } from '@/utils/shareCodec';
import { checkAndPurgeRevokedContent } from '@/hooks/useContentRevocationSync';
import { cn } from '@/utils/cn';

export const REPORT_REASONS = [
  'hate_speech',
  'harassment',
  'explicit',
  'illegal',
  'other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportStatus = 'idle' | 'submitting' | 'success' | 'already_banned' | 'error';

export interface SubmitReportParams {
  contentType: string;
  /** The creator's signature, when the copy being reported has one. Unsigned content is reportable too. */
  manifest?: ContentManifest | null;
  payload: Record<string, unknown> | object;
  reason: ReportReason;
  notes?: string;
}

export interface SubmitReportResult {
  ok: boolean;
  status: 'pending' | 'queued' | 'already_banned' | 'error';
  message?: string;
}

export async function submitContentReport(params: SubmitReportParams): Promise<SubmitReportResult> {
  const { contentType, manifest, payload, reason, notes } = params;
  const cleanPayload = isRecord(payload) ? stripManifest(payload) : payload;
  try {
    const res = await authFetch(apiUrl('/api/v1/content/reports'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content_type: contentType,
        ...(manifest
          ? {
              content_hash: manifest.content_hash,
              author_id: manifest.author_id,
              author_login: manifest.author_login,
              signature: manifest.signature,
            }
          : {}),
        payload: cleanPayload,
        reason,
        ...(notes && notes.trim().length > 0 ? { notes: notes.trim() } : {}),
      }),
    });

    if (!res.ok) {
      return { ok: false, status: 'error' };
    }

    const data = (await res.json()) as { status?: string; message?: string };
    if (data.status === 'already_banned') {
      return { ok: true, status: 'already_banned', message: data.message };
    }
    return {
      ok: true,
      status: data.status === 'queued' ? 'queued' : 'pending',
      message: data.message,
    };
  } catch {
    return { ok: false, status: 'error' };
  }
}

export interface ReportContentModalBodyProps {
  manifest: ContentManifest | null;
  contentType: string;
  payload: Record<string, unknown> | object;
  contentTitle?: string;
  onClose: () => void;
  status?: ReportStatus;
}

export function ReportContentModalBody({
  manifest,
  contentType,
  payload,
  contentTitle: _contentTitle,
  onClose,
  status: initialStatus,
}: ReportContentModalBodyProps) {
  const dict = useDictionary();
  const t = dict.tierLists;

  const [reason, setReason] = useState<ReportReason>('hate_speech');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ReportStatus>(initialStatus ?? 'idle');

  const reasonLabels: Record<ReportReason, string> = {
    hate_speech: t.reportReasonHate,
    harassment: t.reportReasonHarassment,
    explicit: t.reportReasonExplicit,
    illegal: t.reportReasonIllegal,
    other: t.reportReasonOther,
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (status === 'submitting') return;
      setStatus('submitting');

      const result = await submitContentReport({
        contentType,
        manifest,
        payload,
        reason,
        notes,
      });

      if (!result.ok) {
        setStatus('error');
      } else if (result.status === 'already_banned') {
        setStatus('already_banned');
        void checkAndPurgeRevokedContent();
      } else {
        setStatus('success');
      }
    },
    [manifest, contentType, payload, reason, notes, status]
  );

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-emerald/15 text-accent-emerald">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1 max-w-sm">
          <p className="type-body-lg text-text-secondary">{t.reportSuccess}</p>
        </div>
        <Button variant="primary" onClick={onClose} className="mt-2 min-w-[6rem]">
          {t.dismiss}
        </Button>
      </div>
    );
  }

  if (status === 'already_banned') {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-amber/15 text-accent-amber">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1 max-w-sm">
          <p className="type-body-lg text-text-secondary">{t.reportAlreadyBanned}</p>
        </div>
        <Button variant="primary" onClick={onClose} className="mt-2 min-w-[6rem]">
          {t.dismiss}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-1">
      {!manifest && (
        <div className="flex items-start gap-3 rounded-xl border border-border-color bg-bg-elevated/40 p-3 text-xs text-text-secondary">
          <ShieldAlert className="h-4 w-4 shrink-0 text-accent-amber mt-0.5" aria-hidden="true" />
          <span>{t.reportNoManifest}</span>
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-accent-red/30 bg-accent-red/10 p-3 text-xs text-accent-red"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{t.reportError}</span>
        </div>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="type-label-sm text-text-muted mb-1">
          {t.reportReasonLabel}
        </legend>
        <div className="flex flex-col gap-1.5" role="radiogroup" aria-label={t.reportReasonLabel}>
          {REPORT_REASONS.map((r) => {
            const isSelected = reason === r;
            return (
              <label
                key={r}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-sm cursor-pointer transition-colors',
                  isSelected
                    ? 'border-accent-red bg-accent-red/10 text-text-primary font-medium'
                    : 'border-border-color bg-bg-surface hover:bg-bg-elevated text-text-secondary'
                )}
              >
                <input
                  type="radio"
                  name="report_reason"
                  value={r}
                  checked={isSelected}
                  onChange={() => setReason(r)}
                  className="accent-accent-red h-4 w-4 shrink-0 cursor-pointer"
                />
                <span className="flex-1">{reasonLabels[r]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-notes" className="type-label-sm text-text-muted">
          {t.reportNotesLabel}
        </label>
        <textarea
          id="report-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t.reportNotesPlaceholder}
          rows={3}
          maxLength={500}
          className="w-full resize-none rounded-xl border border-border-color bg-bg-surface p-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-red focus:outline-none transition-colors"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-color">
        <Button variant="secondary" onClick={onClose} disabled={status === 'submitting'}>
          {t.cancel}
        </Button>
        <Button
          variant="danger"
          type="submit"
          disabled={status === 'submitting'}
          aria-label={t.reportSubmit}
        >
          {status === 'submitting' ? t.reportSubmitting : t.reportSubmit}
        </Button>
      </div>
    </form>
  );
}

export interface ReportContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: string; // 'tier_list' | 'smash_roster' | 'minigame'
  manifest: ContentManifest | null;
  payload: Record<string, unknown> | object;
  contentTitle?: string;
}

export function ReportContentModal({
  isOpen,
  onClose,
  contentType,
  manifest,
  payload,
  contentTitle,
}: ReportContentModalProps) {
  const dict = useDictionary();
  const t = dict.tierLists;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="md"
      title={t.reportTitle}
      padded
      ariaLabel={t.reportTitle}
    >
      {contentTitle && <p className="mb-3 truncate text-center type-strong text-text-secondary">{contentTitle}</p>}
      <ReportContentModalBody
        manifest={manifest}
        contentType={contentType}
        payload={payload}
        contentTitle={contentTitle}
        onClose={onClose}
      />
    </Modal>
  );
}
