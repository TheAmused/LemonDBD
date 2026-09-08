'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/user/UserBugReportsList.tsx

import React from 'react';
import {
  Bug,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  Crown,
  Image as ImageIcon,
} from 'lucide-react';
import { UserBugReport } from '@/types/userProfile';
import { UserBugReportsSkeleton } from './UserBugReportsSkeleton';
import { Pagination } from '@/components/Pagination';

interface UserBugReportsListProps {
  reports: UserBugReport[];
  loading: boolean;
  onOpenReportModal: () => void;
  dict?: Dictionary;
  t?: Record<string, string>;
  total?: number;
  page?: number;
  perPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  hideHeading?: boolean;
}

export const UserBugReportsList: React.FC<UserBugReportsListProps> = ({
  reports,
  loading,
  onOpenReportModal,
  dict,
  t: propT,
  total,
  page = 1,
  perPage = 10,
  totalPages = 1,
  onPageChange,
  hideHeading = false,
}) => {
  const t: Record<string, string> = propT || dict?.user || {};
  const totalCount = total ?? reports.length;

  const getStatusBadge = (status: UserBugReport['status']) => {
    switch (status) {
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-accent-amber font-mono">
            <Clock className="h-3 w-3 animate-spin" />
            <span>{t.statusInProgress || 'In Progress'}</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
            <CheckCircle className="h-3 w-3" />
            <span>{t.statusResolved || 'Resolved'}</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border-color bg-bg-elevated px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-text-muted font-mono">
            <XCircle className="h-3 w-3" />
            <span>{t.statusClosed || 'Closed'}</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-accent-red/30 bg-accent-red/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-accent-red font-mono">
            <HelpCircle className="h-3 w-3" />
            <span>{t.statusPending || 'Pending'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-3.5 w-full">
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-border-color">
        {!hideHeading ? (
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-wider text-text-primary font-mono flex items-center gap-2">
              <Bug className="h-4 w-4 text-accent-red" />
              <span>{t.bugReportsTitle || 'Your Submitted Bug Reports'}</span>
            </h2>
          </div>
        ) : (
          <div className="text-xs font-mono font-bold text-text-secondary">
            {dict?.user?.myBugReportsCount
              ? dict.user.myBugReportsCount.replace('{count}', String(totalCount))
              : `${totalCount}`}
          </div>
        )}

        <button
          type="button"
          onClick={onOpenReportModal}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-red to-red-700 hover:opacity-90 px-3.5 py-1.5 text-xs font-bold text-text-inverted shadow-sm shadow-accent-red/20 transition-all cursor-pointer font-mono"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t.reportNewBug || 'Report New Bug'}</span>
        </button>
      </div>

      {loading ? (
        <UserBugReportsSkeleton dict={dict} count={3} />
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border-color bg-bg-surface p-6 sm:p-8 text-center space-y-2.5 shadow-sm">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-accent-red/10 text-accent-red">
            <Bug className="h-5 w-5" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-text-primary font-mono">
            {t.noReportsTitle || 'No Bug Reports Submitted'}
          </h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            {t.noReportsSubtitle ||
              'You have not reported any glitches yet. If you spot incorrect perk numbers or map callout issues, report them!'}
          </p>
          <button
            type="button"
            onClick={onOpenReportModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-accent-red/30 bg-accent-red/10 px-3.5 py-1.5 text-xs font-bold text-accent-red hover:bg-accent-red/20 transition-colors cursor-pointer font-mono"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t.submitBugReport || 'Submit a Bug Report'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-border-color bg-bg-surface p-4 text-text-primary space-y-3 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-color pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-text-muted font-bold">#{report.id}</span>
                    <h3 className="text-base font-black text-text-primary font-mono">
                      {report.title}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-text-secondary font-mono">
                    <span className="rounded-lg bg-bg-elevated text-text-primary px-2 py-0.5 font-bold border border-border-color">
                      {report.category}
                    </span>
                    <span>
                      {t.reportedOn || 'Reported on'}{' '}
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="self-start sm:self-center">{getStatusBadge(report.status)}</div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                {report.message}
              </p>

              {report.images && report.images.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1 font-mono">
                    <ImageIcon className="h-3 w-3 text-accent-red" />
                    {t.attachments || 'Attachments'} ({report.images.length})
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {report.images.map((imgUrl, i) => (
                      <a
                        key={i}
                        href={imgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative h-16 w-16 rounded-xl border border-border-color bg-bg-elevated overflow-hidden shadow-xs hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={imgUrl}
                          alt={`${t.attachments || 'Attachment'} ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {report.admin_notes && (
                <div className="mt-3 rounded-2xl border border-accent-amber/30 bg-accent-amber/10 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-accent-amber text-xs font-bold font-mono">
                    <Crown className="h-4 w-4" />
                    <span>{t.devResponse || 'Developer Response'}</span>
                  </div>
                  <p className="text-xs text-text-secondary italic">
                    {t.quoteOpen || '"'}
                    {report.admin_notes}
                    {t.quoteClose || '"'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && reports.length > 0 && totalPages > 1 && onPageChange && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalResults={totalCount}
          limit={perPage}
          onPageChange={onPageChange}
          onLimitChange={() => {}}
          dict={dict as any}
        />
      )}
    </div>
  );
};
