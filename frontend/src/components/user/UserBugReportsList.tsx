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
  /** Total count across all pages (falls back to reports.length when omitted). */
  total?: number;
  page?: number;
  perPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
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
}) => {
  const t: Record<string, string> = propT || dict?.user || {};
  const totalCount = total ?? reports.length;

  const getStatusBadge = (status: UserBugReport['status']) => {
    switch (status) {
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-400">
            <Clock className="h-3 w-3 animate-spin" />
            <span>{t.statusInProgress || 'In Progress'}</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
            <CheckCircle className="h-3 w-3" />
            <span>{t.statusResolved || 'Resolved'}</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-500/30 bg-slate-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
            <XCircle className="h-3 w-3" />
            <span>{t.statusClosed || 'Closed'}</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-400">
            <HelpCircle className="h-3 w-3" />
            <span>{t.statusPending || 'Pending'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-black tracking-wider text-slate-100 font-mono flex items-center gap-2">
            <Bug className="h-5 w-5 text-rose-500" />
            <span>{t.bugReportsTitle || 'Your Submitted Bug Reports'}</span>
          </h2>
        </div>

        <button
          type="button"
          onClick={onOpenReportModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-950/40 transition-all cursor-pointer w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span>{t.reportNewBug || 'Report New Bug'}</span>
        </button>
      </div>

      {loading ? (
        <UserBugReportsSkeleton dict={dict} count={Math.min(perPage, 5) || 3} />
      ) : reports.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/40 p-8 sm:p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <Bug className="h-6 w-6" />
          </div>
          <h3 className="text-base font-black text-slate-200">
            {t.noReportsTitle || 'No Bug Reports Submitted'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {t.noReportsSubtitle ||
              'You have not reported any glitches yet. If you spot incorrect perk numbers or map callout issues, report them!'}
          </p>
          <button
            type="button"
            onClick={onOpenReportModal}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t.submitBugReport || 'Submit a Bug Report'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-slate-500 font-bold">#{report.id}</span>
                    <h3 className="text-base font-black text-slate-100">
                      {report.title}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-slate-400">
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-bold">
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

              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {report.message}
              </p>

              {report.images && report.images.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3 text-rose-500" />
                    {t.attachments || 'Attachments'} ({report.images.length})
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {report.images.map((imgUrl, i) => (
                      <a
                        key={i}
                        href={imgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative h-16 w-16 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-sm hover:opacity-90 transition-opacity"
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
                <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                    <Crown className="h-4 w-4" />
                    <span>{t.devResponse || 'Developer Response'}</span>
                  </div>
                  <p className="text-xs text-slate-300 italic">
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
