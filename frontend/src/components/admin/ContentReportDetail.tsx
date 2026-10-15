'use client';
// frontend/src/components/admin/ContentReportDetail.tsx
import React, { useState } from 'react';
import { Ban, CheckCircle, ShieldAlert, UserX } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Select, Textarea } from '@/components/common/Field';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { SandboxedContentPreview } from '@/components/admin/SandboxedContentPreview';
import { SanctionForm } from '@/components/admin/SanctionForm';
import { contentReasonLabel, contentStatusLabel, contentStatusTone, contentTypeLabel } from '@/components/admin/contentReportLabels';
import { useDictionary } from '@/context/DictionaryContext';
import { formatDateTime } from '@/utils/format';
import { formatMessage } from '@/utils/i18nFormat';
import {
  EMPTY_SANCTION_DRAFT,
  authorDecisionFromDraft,
  isSanctionDraftValid,
  type AuthorDecision,
  type SanctionDraft,
  type SanctionKind,
} from '@/types/moderation';
import type { AdminContentReportDetail, ContentReportAction } from '@/types/admin';

interface ContentReportDetailProps {
  detail: AdminContentReportDetail;
  resolving: boolean;
  onResolve: (action: ContentReportAction, author: AuthorDecision | null, notes: string) => Promise<boolean>;
}

/** One report in full: who flagged what and why, the reported content, and the ban/dismiss decision. */
export function ContentReportDetail({ detail, resolving, onResolve }: ContentReportDetailProps) {
  const dict = useDictionary();
  const [notes, setNotes] = useState<string>(detail.admin_notes ?? '');
  // What happens to the author's account: nothing, or one of the three decisions (with its form).
  const [authorKind, setAuthorKind] = useState<SanctionKind | 'none'>('none');
  const [authorDraft, setAuthorDraft] = useState<SanctionDraft>(EMPTY_SANCTION_DRAFT);
  const [confirmBan, setConfirmBan] = useState<boolean>(false);

  const moderation = dict.moderation.admin;
  const authorConsequence =
    authorKind === 'warning'
      ? formatMessage(moderation.confirmWarning, { username: detail.author_login })
      : authorKind === 'suspension'
        ? formatMessage(moderation.confirmSuspension, { username: detail.author_login, days: authorDraft.duration_days })
        : authorKind === 'ban'
          ? formatMessage(moderation.confirmBan, { username: detail.author_login })
          : '';

  const isPending = detail.status === 'pending';
  const canActOnAuthor = detail.attributed && detail.author_active !== false && !detail.author_is_admin;
  const authorDecision: AuthorDecision | null =
    canActOnAuthor && authorKind !== 'none' ? authorDecisionFromDraft({ ...authorDraft, kind: authorKind }) : null;
  const authorValid = authorKind === 'none' || !canActOnAuthor || isSanctionDraftValid({ ...authorDraft, kind: authorKind });
  const reasons = Object.entries(detail.reason_breakdown).sort((a, b) => b[1] - a[1]);
  const reporterNotes = detail.reports.filter((r) => r.notes);

  const runBan = async () => {
    await onResolve('ban', authorDecision, notes);
    setConfirmBan(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="type-strong text-text-primary">#{detail.id}</h3>
        <Badge tone="neutral" size="sm">{contentTypeLabel(dict, detail.content_type)}</Badge>
        <Badge tone={contentStatusTone(detail.status)} size="sm">{contentStatusLabel(dict, detail.status)}</Badge>
        <span className="type-body text-text-secondary">
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
        <p className="flex items-start gap-2 rounded-card border border-accent-amber/30 bg-accent-amber/10 p-3 type-body text-accent-amber">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{dict.admin.contentReportUnattributed}</span>
        </p>
      )}
      {detail.attributed && detail.author_active === false && (
        <p className="type-body text-text-secondary">{dict.admin.contentReportAuthorInactive}</p>
      )}
      {detail.attributed && detail.author_is_admin && (
        <p className="type-body text-text-secondary">{dict.admin.contentReportAuthorIsAdmin}</p>
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
          <ul className="max-h-40 overflow-y-auto space-y-1.5 rounded-card border border-border-subtle bg-bg-primary p-3">
            {reporterNotes.map((r, index) => (
              <li key={index} className="type-body text-text-primary break-words whitespace-pre-wrap">
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
          <p className="type-body text-text-muted">{dict.admin.contentReportEvidenceWiped}</p>
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
          {canActOnAuthor && (
            <div className="space-y-3 rounded-card border border-border-color bg-bg-primary p-3">
              <div>
                <label htmlFor={`author-action-${detail.id}`} className="block type-label-xs text-text-secondary mb-1">
                  {moderation.authorActionLabel}
                </label>
                <Select
                  id={`author-action-${detail.id}`}
                  fieldSize="sm"
                  value={authorKind}
                  onChange={(e) => setAuthorKind(e.target.value as SanctionKind | 'none')}
                >
                  <option value="none">{moderation.authorActionNone}</option>
                  <option value="warning">{moderation.authorActionWarning}</option>
                  <option value="suspension">{moderation.authorActionSuspension}</option>
                  <option value="ban">{moderation.authorActionBan}</option>
                </Select>
                <p className="mt-1 type-micro text-text-muted">{moderation.authorActionHint}</p>
              </div>
              {authorKind !== 'none' && (
                <SanctionForm
                  draft={{ ...authorDraft, kind: authorKind }}
                  kinds={[authorKind]}
                  showReason={false}
                  showInternal={false}
                  onChange={(patch) => setAuthorDraft((d) => ({ ...d, ...patch }))}
                />
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" size="sm" disabled={resolving || !authorValid} onClick={() => setConfirmBan(true)}>
              {authorDecision ? <UserX className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              {dict.admin.contentReportBanAction}
            </Button>
            <Button size="sm" disabled={resolving} onClick={() => onResolve('dismiss', null, notes)}>
              <CheckCircle className="h-4 w-4" />
              {dict.admin.contentReportDismissAction}
            </Button>
          </div>
        </div>
      ) : (
        detail.admin_notes && (
          <div className="space-y-1.5 border-t border-border-color pt-4">
            <p className="type-label-sm text-text-secondary">{dict.admin.contentReportNotesLabel}</p>
            <p className="type-body text-text-primary break-words whitespace-pre-wrap">{detail.admin_notes}</p>
          </div>
        )
      )}

      <ConfirmModal
        open={confirmBan}
        title={dict.admin.contentReportBanTitle}
        message={authorDecision ? `${dict.admin.contentReportBanMessage} ${authorConsequence}` : dict.admin.contentReportBanMessage}
        confirmLabel={dict.admin.contentReportBanAction}
        busy={resolving}
        onConfirm={runBan}
        onCancel={() => setConfirmBan(false)}
      />
    </div>
  );
}
