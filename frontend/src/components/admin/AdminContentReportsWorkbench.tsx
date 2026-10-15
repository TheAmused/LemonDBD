'use client';
// frontend/src/components/admin/AdminContentReportsWorkbench.tsx
import React from 'react';
import { ChevronLeft, ChevronRight, Filter, Flag, Trash2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/Field';
import { Badge } from '@/components/common/Badge';
import { ContentReportDetail } from '@/components/admin/ContentReportDetail';
import { contentReasonLabel, contentStatusLabel, contentStatusTone, contentTypeLabel } from '@/components/admin/contentReportLabels';
import { useDictionary } from '@/context/DictionaryContext';
import type { AuthorDecision } from '@/types/moderation';
import { formatDate } from '@/utils/format';
import type {
  AdminContentReportDetail,
  AdminContentReportList,
  ContentReportAction,
} from '@/types/admin';

interface AdminContentReportsWorkbenchProps {
  list: AdminContentReportList | null;
  statusFilter: string;
  page: number;
  perPage: number;
  loading: boolean;
  selectedId: number | null;
  detail: AdminContentReportDetail | null;
  loadingDetail: boolean;
  resolving: boolean;
  onStatusFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSelect: (id: number) => void;
  onResolve: (id: number, action: ContentReportAction, author: AuthorDecision | null, notes: string) => Promise<boolean>;
  onPurgeExpired: () => void;
}

/** Reported tier lists, Smash or Pass rosters and minigames: the queue on the left, the case on the right. */
export function AdminContentReportsWorkbench({
  list,
  statusFilter,
  page,
  perPage,
  loading,
  selectedId,
  detail,
  loadingDetail,
  resolving,
  onStatusFilterChange,
  onPageChange,
  onSelect,
  onResolve,
  onPurgeExpired,
}: AdminContentReportsWorkbenchProps) {
  const dict = useDictionary();
  const current = detail && detail.id === selectedId ? detail : null;
  const items = list?.items ?? [];
  const total = list?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      <div className="lg:col-span-5 flex flex-col rounded-3xl border border-border-color bg-bg-surface p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border-color">
          <label htmlFor="content-report-status-filter" className="flex items-center gap-1 type-strong-xs text-text-secondary">
            <Filter className="h-3 w-3" />
            <span>{dict.admin.filterLabel}</span>
          </label>
          <Select
            id="content-report-status-filter"
            fieldSize="sm"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="w-auto"
          >
            <option value="pending">{dict.admin.contentStatusPending}</option>
            <option value="resolved_banned">{dict.admin.contentStatusBanned}</option>
            <option value="dismissed">{dict.admin.contentStatusDismissed}</option>
            <option value="expired">{dict.admin.contentStatusExpired}</option>
            <option value="all">{dict.admin.statusAll}</option>
          </Select>
          <Button size="xs" onClick={onPurgeExpired}>
            <Trash2 className="h-3.5 w-3.5" />
            {dict.admin.contentReportsPurgeExpired}
          </Button>
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {loading && !list ? (
            <div className="py-12 text-center text-xs text-text-muted">{dict.admin.contentReportsLoading}</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-xs text-text-muted">{dict.admin.contentReportsEmpty}</div>
          ) : (
            items.map((report) => {
              const isSelected = selectedId === report.id;
              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => onSelect(report.id)}
                  aria-pressed={isSelected}
                  className={`w-full p-3.5 rounded-2xl border transition-all cursor-pointer text-left space-y-2 focus:outline-none focus:ring-2 focus:ring-accent-red ${
                    isSelected
                      ? 'border-accent-red bg-accent-red/10 shadow-sm ring-1 ring-accent-red/30'
                      : 'border-border-subtle bg-bg-primary hover:border-border-color'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 type-strong text-text-primary">
                      <Flag className="h-3.5 w-3.5 text-accent-red" />#{report.id}
                    </span>
                    <Badge tone={contentStatusTone(report.status)} size="xs">
                      {contentStatusLabel(dict, report.status)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
                    <span>{contentTypeLabel(dict, report.content_type)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{contentReasonLabel(dict, report.primary_reason)}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {dict.admin.contentReportCountLabel} {report.report_count}
                    </span>
                  </div>
                  <p className="type-caption text-text-muted">{formatDate(report.created_at)}</p>
                </button>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-3 border-t border-border-color">
            <Button icon size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label={dict.admin.prevPage}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-text-secondary font-medium">
              {dict.admin.pageLabel} {page} {dict.admin.ofLabel} {totalPages}
            </span>
            <Button icon size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label={dict.admin.nextPage}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="lg:col-span-7 rounded-3xl border border-border-color bg-bg-surface p-4 sm:p-6 shadow-sm">
        {selectedId === null ? (
          <p className="py-12 text-center text-xs text-text-muted">{dict.admin.contentReportsSelectPrompt}</p>
        ) : loadingDetail && !current ? (
          <p className="py-12 text-center text-xs text-text-muted">{dict.admin.contentReportsLoading}</p>
        ) : current ? (
          <ContentReportDetail
            key={current.id}
            detail={current}
            resolving={resolving}
            onResolve={(action, author, notes) => onResolve(current.id, action, author, notes)}
          />
        ) : (
          <p className="py-12 text-center text-xs text-text-muted">{dict.admin.contentReportsLoadFailed}</p>
        )}
      </div>
    </div>
  );
}
