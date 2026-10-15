'use client';
// frontend/src/components/admin/ContentReportDetail.tsx
import React, { useState } from 'react';
import { Ban, CheckCircle, ShieldAlert, UserX } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Checkbox } from '@/components/common/Checkbox';
import { Textarea } from '@/components/common/Field';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { SandboxedContentPreview } from '@/components/admin/SandboxedContentPreview';
import { contentReasonLabel, contentStatusLabel, contentStatusTone, contentTypeLabel } from '@/components/admin/contentReportLabels';
import { useDictionary } from '@/context/DictionaryContext';
import { formatDateTime } from '@/utils/format';
import type { AdminContentReportDetail, ContentReportAction } from '@/types/admin';

interface ContentReportDetailProps {
  detail: AdminContentReportDetail;
  resolving: boolean;
  onResolve: (action: ContentReportAction, banAuthor: boolean, notes: string) => Promise<boolean>;
}

/** One report in full: who flagged what and why, the reported content, and the ban/dismiss decision. */
export function ContentReportDetail({ detail, resolving, onResolve }: ContentReportDetailProps) {
  const dict = useDictionary();
  const [notes, setNotes] = useState<string>(detail.admin_notes ?? '');
  const [banAuthor, setBanAuthor] = useState<boolean>(false);
  const [confirmBan, setConfirmBan] = useState<boolean>(false);

  const isPending = detail.status === 'pending';
  const canBanAuthor = detail.attributed && detail.author_active !== false && !detail.author_is_admin;
  const reasons = Object.entries(detail.reason_breakdown).sort((a, b) => b[1] - a[1]);
  const reporterNotes = detail.reports.filter((r) => r.notes);

  const runBan = async () => {
    await onResolve('ban', banAuthor && canBanAuthor, notes);
    setConfirmBan(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="type-strong text-text-primary">#{detail.id}</h3>
        <Badge tone="neutral" size="sm">{contentTypeLabel(dict, detail.content_type)}</Badge>
        <Badge tone={contentStatusTone(detail.status)} size="sm">{contentStatusLabel(dict, detail.status)}</Badge>
        <span className="text-xs text-text-secondary">
          {dict.admin.contentReportCountLabel} {detail.report_count}
        </span>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
        <div>
          <dt className="type-label-sm text-text-secondary">{dict.admin.contentReportAuthor}</dt>
          <dd className="text-text-primary break-all">
            {detail.attributed ? detail.author_login : dict.admin.contentReportUnattributedShort}
          </dd>
        </div>
        <div>
          <dt className="type-label-sm text-text-secondary">{dict.admin.contentReportHash}</dt>
          <dd className="text-text-primary break-all">
            <code>{detail.content_hash}</code>
          </dd>
        </div>
        <div>
          <dt className="type-label-sm text-text-secondary">{dict.admin.contentReportCreated}</dt>
          <dd className="text-text-primary">{formatDateTime(detail.created_at)}</dd>
        </div>
        <div>
          <dt className="type-label-sm text-text-secondary">
            {isPending ? dict.admin.contentReportExpires : dict.admin.contentReportResolvedAt}
          </dt>
          <dd className="text-text-primary">
            {formatDateTime(isPending ? detail.expires_at : (detail.resolved_at ?? detail.expires_at))}
          </dd>
        </div>
      </dl>

      {!detail.attributed && (
        <p className="flex items-start gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/10 p-3 text-xs text-accent-amber">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{dict.admin.contentReportUnattributed}</span>
        </p>
      )}
      {detail.attributed && detail.author_active === false && (
        <p className="text-xs text-text-secondary">{dict.admin.contentReportAuthorInactive}</p>
      )}
      {detail.attributed && detail.author_is_admin && (
        <p className="text-xs text-text-secondary">{dict.admin.contentReportAuthorIsAdmin}</p>
      )}

      <div className="space-y-1.5">
        <p className="type-label-sm text-text-secondary">{dict.admin.contentReportReasons}</p>
        <div className="flex flex-wrap gap-1.5">
          {reasons.map(([reason, count]) => (
            <Badge key={reason} tone="red" size="sm" plain>
              {contentReasonLabel(dict, reason)} × {count}
            </Badge>
          ))}
        </div>
      </div>

      {reporterNotes.length > 0 && (
        <div className="space-y-1.5">
          <p className="type-label-sm text-text-secondary">{dict.admin.contentReportReporterNotes}</p>
          <ul className="max-h-40 overflow-y-auto space-y-1.5 rounded-xl border border-border-subtle bg-bg-primary p-3">
            {reporterNotes.map((r, index) => (
              <li key={index} className="text-xs text-text-primary break-words whitespace-pre-wrap">
                <span className="text-text-secondary">{contentReasonLabel(dict, r.reason)}: </span>
                {r.notes}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <p className="type-label-sm text-text-secondary">{dict.admin.contentReportEvidence}</p>
        {detail.evidence_payload ? (
          <SandboxedContentPreview key={detail.id} evidence={detail.evidence_payload} />
        ) : (
          <p className="text-xs text-text-muted">{dict.admin.contentReportEvidenceWiped}</p>
        )}
      </div>

      {isPending ? (
        <div className="space-y-3 border-t border-border-color pt-4">
          <Textarea
            fieldSize="sm"
            rows={3}
            maxLength={500}
            aria-label={dict.admin.contentReportNotesLabel}
            placeholder={dict.admin.contentReportNotesPlaceholder}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {canBanAuthor && (
            <Checkbox checked={banAuthor} onChange={setBanAuthor}>
              <span className="text-xs text-text-primary">{dict.admin.contentReportBanAuthor}</span>
            </Checkbox>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" size="sm" disabled={resolving} onClick={() => setConfirmBan(true)}>
              {banAuthor && canBanAuthor ? <UserX className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              {dict.admin.contentReportBanAction}
            </Button>
            <Button size="sm" disabled={resolving} onClick={() => onResolve('dismiss', false, notes)}>
              <CheckCircle className="h-4 w-4" />
              {dict.admin.contentReportDismissAction}
            </Button>
          </div>
        </div>
      ) : (
        detail.admin_notes && (
          <div className="space-y-1.5 border-t border-border-color pt-4">
            <p className="type-label-sm text-text-secondary">{dict.admin.contentReportNotesLabel}</p>
            <p className="text-xs text-text-primary break-words whitespace-pre-wrap">{detail.admin_notes}</p>
          </div>
        )
      )}

      <ConfirmModal
        open={confirmBan}
        title={dict.admin.contentReportBanTitle}
        message={
          banAuthor && canBanAuthor
            ? `${dict.admin.contentReportBanMessage} ${dict.admin.contentReportBanAuthorWarning}`
            : dict.admin.contentReportBanMessage
        }
        confirmLabel={dict.admin.contentReportBanAction}
        busy={resolving}
        onConfirm={runBan}
        onCancel={() => setConfirmBan(false)}
      />
    </div>
  );
}
