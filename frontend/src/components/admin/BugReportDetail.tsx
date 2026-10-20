'use client';
// frontend/src/components/admin/BugReportDetail.tsx
//
// One bug report in full: who sent it and when, what they wrote and attached, its status, and the
// reply the reporter reads on their profile.
import React, { useState } from 'react';
import { Send, Trash2, UserSearch } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { FieldLabel, Textarea } from '@/components/common/Field';
import { ImageLinkTile } from '@/components/common/ImageLinkTile';
import { CustomDropdown } from '@/components/common/CustomDropdown';
import { tip } from '@/components/common/Tooltip';
import { BUG_STATUSES, bugStatusLabel } from '@/components/admin/reportLabels';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { bugAttachmentUrl } from '@/utils/api';
import { formatDateTime } from '@/utils/format';
import { formatMessage } from '@/utils/i18nFormat';
import type { AdminBugReport, BugReportStatus } from '@/types/admin';

interface BugReportDetailProps {
  report: AdminBugReport;
  onStatusChange: (status: BugReportStatus) => Promise<boolean>;
  onReply: (notes: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  /** Opens the reporter's account in the user directory. */
  onShowUser: (query: string) => void;
}

export function BugReportDetail({ report, onStatusChange, onReply, onDelete, onShowUser }: BugReportDetailProps) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.admin;
  const [notes, setNotes] = useState(report.admin_notes ?? '');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const unchanged = notes.trim() === (report.admin_notes ?? '').trim();

  const run = async (action: () => Promise<boolean>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const facts: [string, React.ReactNode][] = [
    [
      t.reportedBy,
      <span key="reporter" className="inline-flex min-w-0 items-center gap-1.5">
        <span className="truncate">{report.reporter_name}</span>
        {report.user_id ? (
          <Button
            variant="ghost"
            size="xs"
            icon
            onClick={() => onShowUser(`id:${report.user_id}`)}
            aria-label={t.showInUsers}
            {...tip(t.showInUsers, undefined, 'action')}
          >
            <UserSearch className="icon-sm" aria-hidden="true" />
          </Button>
        ) : (
          <Badge tone="neutral" size="xs">{t.guestReporter}</Badge>
        )}
      </span>,
    ],
    [t.thEmail, report.reporter_email || t.noEmailProvided],
    [t.submittedAt, formatDateTime(report.created_at, locale)],
    ...(report.updated_at ? [[t.updatedAt, formatDateTime(report.updated_at, locale)] as [string, React.ReactNode]] : []),
  ];

  return (
    <article className="divide-y divide-border-color">
      <header className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="type-caption text-text-muted">#{report.id}</p>
          <h3 className="mt-0.5 break-words type-card-title text-text-primary">{report.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <CustomDropdown<BugReportStatus>
            ariaLabel={t.updateStatus}
            accent="primary"
            buttonClassName="py-2"
            align="right"
            value={report.status}
            onChange={(status) => {
              if (!busy) run(() => onStatusChange(status));
            }}
            options={BUG_STATUSES.map((s) => ({ value: s, label: bugStatusLabel(dict, s) }))}
          />
          <Button
            variant="danger"
            size="sm"
            icon
            onClick={() => setConfirmDelete(true)}
            aria-label={t.deleteBugReportTitle}
            {...tip(t.deleteBugReportTitle, undefined, 'action')}
          >
            <Trash2 className="icon-md" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-4 sm:grid-cols-2 sm:p-5">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="type-label-xs text-text-secondary">{label}</dt>
            <dd className="mt-0.5 break-words type-body text-text-primary">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-2 p-4 sm:p-5">
        <h4 className="type-label-xs text-text-secondary">{t.description}</h4>
        <p className="whitespace-pre-wrap break-words type-body text-text-primary">{report.message}</p>
      </section>

      {report.images.length > 0 && (
        <section className="space-y-2 p-4 sm:p-5">
          <h4 className="type-label-xs text-text-secondary">{formatMessage(t.attachmentsCount, { count: report.images.length })}</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {report.images.map((src, i) => {
              const url = bugAttachmentUrl(src);
              const label = formatMessage(t.attachmentLabel, { index: i + 1 });
              // Not one of our uploads (an old report with a typed-in URL): shown as text, never fetched.
              if (!url) return <code key={src} className="break-all type-caption text-text-muted" aria-label={label}>{src}</code>;
              return (
                <ImageLinkTile key={src} href={url} src={url} label={label} />
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-2 p-4 sm:p-5">
        <FieldLabel htmlFor={`bug-reply-${report.id}`}>{t.devFeedbackLabel}</FieldLabel>
        <Textarea
          id={`bug-reply-${report.id}`}
          rows={4}
          fieldSize="sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t.devFeedbackPlaceholder}
        />
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            loading={busy}
            disabled={unchanged}
            leftIcon={<Send className="icon-sm" aria-hidden="true" />}
            onClick={() => run(() => onReply(notes.trim()))}
          >
            {t.devFeedbackSubmit}
          </Button>
        </div>
      </section>

      <ConfirmModal
        open={confirmDelete}
        title={t.deleteBugReportTitle}
        message={formatMessage(t.confirmDeleteBugReport, { id: report.id })}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
        busy={busy}
        onConfirm={() =>
          run(async () => {
            const ok = await onDelete();
            setConfirmDelete(false);
            return ok;
          })
        }
        onCancel={() => setConfirmDelete(false)}
      />
    </article>
  );
}
