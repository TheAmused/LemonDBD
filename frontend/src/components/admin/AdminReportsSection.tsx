'use client';
// frontend/src/components/admin/AdminReportsSection.tsx
//
// Everything people send the team, in one place: bug reports (about the site) and content reports
// (about something a user made). Both are triage queues with the same layout; a dot marks a queue
// with pending reports.
import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { AdminQueue } from '@/components/admin/AdminQueue';
import { BugReportDetail } from '@/components/admin/BugReportDetail';
import { ContentReportDetail } from '@/components/admin/ContentReportDetail';
import { AdminTabContentSkeleton } from '@/components/admin/AdminTabContentSkeleton';
import {
  BUG_STATUSES,
  CONTENT_STATUSES,
  bugStatusLabel,
  bugStatusTone,
  contentReasonLabel,
  contentStatusLabel,
  contentStatusTone,
  contentTypeLabel,
} from '@/components/admin/reportLabels';
import { useAdminBugReports } from '@/components/admin/useAdminBugReports';
import { useAdminContentReports } from '@/components/admin/useAdminContentReports';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { formatDate } from '@/utils/format';
import { formatMessage } from '@/utils/i18nFormat';
import type { ActionMessage } from '@/types/admin';
import type { ReportQueue } from '@/components/admin/adminTabs';

interface AdminReportsSectionProps {
  /** Which queue the Reports menu in the navigation has open. */
  queue: ReportQueue;
  refreshKey: number;
  notify: (message: ActionMessage) => void;
  onChanged: () => void;
  onShowUser: (query: string) => void;
}

export function AdminReportsSection({ queue, refreshKey, notify, onChanged, onShowUser }: AdminReportsSectionProps) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.admin;
  const bugs = useAdminBugReports({ enabled: queue === 'bugs', refreshKey, notify, onChanged });
  const content = useAdminContentReports({ enabled: queue === 'content', refreshKey, notify, onChanged });
  const selectedBug = bugs.selected;
  const caseDetail = content.detail;

  return (
    <div className="space-y-4">
      {queue === 'bugs' ? (
        <AdminQueue
          ariaLabel={t.filterByStatus}
          title={t.bugReportsLabel}
          drawerKey="bugs"
          statuses={BUG_STATUSES}
          status={bugs.status}
          onStatusChange={bugs.setStatus}
          statusLabel={(s) => bugStatusLabel(dict, s)}
          stats={bugs.stats}
          search={{ value: bugs.search, onChange: bugs.setSearch, placeholder: t.searchTicketsPlaceholder }}
          items={bugs.reports}
          total={bugs.total}
          page={bugs.page}
          onPageChange={bugs.setPage}
          loading={bugs.loading}
          selectedId={bugs.selectedId}
          onSelect={bugs.setSelectedId}
          emptyText={t.noBugReports}
          renderItem={(report) => (
            <>
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 truncate type-strong text-text-primary">{report.title}</span>
                <Badge tone={bugStatusTone(report.status)} size="xs">{bugStatusLabel(dict, report.status)}</Badge>
              </div>
              <p className="line-clamp-2 type-caption text-text-secondary">{report.message}</p>
              <div className="flex items-center justify-between gap-2 type-micro text-text-muted">
                <span className="truncate">
                  #{report.id} {report.reporter_name}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {report.images.length > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <ImageIcon className="h-3 w-3" aria-hidden="true" />
                      {report.images.length}
                    </span>
                  )}
                  {formatDate(report.created_at, locale)}
                </span>
              </div>
            </>
          )}
          detail={
            selectedBug ? (
              <BugReportDetail
                key={selectedBug.id}
                report={selectedBug}
                onStatusChange={(s) => bugs.changeStatus(selectedBug.id, s)}
                onReply={(notes) => bugs.reply(selectedBug.id, notes)}
                onDelete={() => bugs.remove(selectedBug.id)}
                onShowUser={onShowUser}
              />
            ) : null
          }
        />
      ) : (
        <AdminQueue
          ariaLabel={t.filterByStatus}
          title={t.contentReportsLabel}
          drawerKey="content"
          statuses={CONTENT_STATUSES}
          status={content.status}
          onStatusChange={content.setStatus}
          statusLabel={(s) => contentStatusLabel(dict, s)}
          stats={content.stats}
          items={content.items}
          total={content.total}
          page={content.page}
          onPageChange={content.setPage}
          loading={content.loading}
          selectedId={content.selectedId}
          onSelect={content.setSelectedId}
          emptyText={t.contentReportsEmpty}
          renderItem={(report) => (
            <>
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 truncate type-strong text-text-primary">{contentTypeLabel(dict, report.content_type)}</span>
                <Badge tone={contentStatusTone(report.status)} size="xs">{contentStatusLabel(dict, report.status)}</Badge>
              </div>
              <p className="type-caption text-text-secondary">
                {contentReasonLabel(dict, report.primary_reason)}
                {report.report_count > 1 && ` ${formatMessage(t.contentReportTimes, { count: report.report_count }, locale)}`}
              </p>
              <div className="flex items-center justify-between gap-2 type-micro text-text-muted">
                <span>#{report.id}</span>
                <span>{formatDate(report.created_at, locale)}</span>
              </div>
            </>
          )}
          detail={
            caseDetail ? (
              <ContentReportDetail
                key={caseDetail.id}
                detail={caseDetail}
                resolving={content.resolving}
                onResolve={(action, author, notes) => content.resolve(caseDetail.id, action, author, notes)}
                onShowUser={onShowUser}
              />
            ) : content.selectedId === null ? null : content.loadingDetail ? (
              <AdminTabContentSkeleton />
            ) : (
              <EmptyState variant="compact" title={t.contentReportsLoadFailed} />
            )
          }
        />
      )}
    </div>
  );
}
