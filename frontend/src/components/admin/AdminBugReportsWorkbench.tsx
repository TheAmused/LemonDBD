'use client';
// frontend/src/components/admin/AdminBugReportsWorkbench.tsx

import React from 'react';
import {
  HelpCircle,
  Clock,
  CheckCircle,
  Bug,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  MessageSquare,
  Save,
  Eye,
} from 'lucide-react';
import type { AdminBugReport, BugReportStats } from '@/types/admin';
import type { Dictionary } from '@/locales/types';

interface StatusConfigItem {
  label: string;
  badge: string;
  dot: string;
}

const STATUS_CONFIG: Record<string, StatusConfigItem> = {
  pending: {
    label: 'Pending',
    badge: 'border-rose-500/40 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
  in_progress: {
    label: 'In Progress',
    badge: 'border-amber-500/40 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  resolved: {
    label: 'Resolved',
    badge: 'border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    badge: 'border-border-color bg-bg-elevated text-text-secondary',
    dot: 'bg-slate-400',
  },
};

const STATUS_LABEL_KEYS: Record<string, keyof NonNullable<Dictionary['admin']>> = {
  pending: 'statusPending',
  in_progress: 'statusInProgress',
  resolved: 'statusResolved',
  rejected: 'statusRejected',
};

interface AdminBugReportsWorkbenchProps {
  bugReports: AdminBugReport[];
  bugStats: BugReportStats | null;
  totalBugReports: number;
  bugPage: number;
  bugSearch: string;
  bugStatusFilter: string;
  selectedBugId: number | null;
  editingNotes: Record<number, string>;
  loading: boolean;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSelectBug: (id: number) => void;
  onNoteChange: (id: number, text: string) => void;
  onUpdateBug: (id: number, newStatus?: string) => void;
  onDeleteBug: (id: number) => void;
  dict?: Dictionary;
}

export const AdminBugReportsWorkbench: React.FC<AdminBugReportsWorkbenchProps> = ({
  bugReports,
  bugStats,
  totalBugReports,
  bugPage,
  bugSearch,
  bugStatusFilter,
  selectedBugId,
  editingNotes,
  loading,
  onSearchChange,
  onStatusFilterChange,
  onPageChange,
  onSelectBug,
  onNoteChange,
  onUpdateBug,
  onDeleteBug,
  dict,
}) => {
  const selectedBug = bugReports.find((r) => r.id === selectedBugId) || null;

  return (
    <div className="space-y-6 w-full">
      {/* Quick Status Filters */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
        role="group"
        aria-label={dict?.admin?.filterLabel || ''}
      >
        <button
          type="button"
          onClick={() => onStatusFilterChange('pending')}
          aria-pressed={bugStatusFilter === 'pending'}
          className={`rounded-2xl border p-4 transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-accent-red ${
            bugStatusFilter === 'pending'
              ? 'border-rose-500 bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300 shadow-sm ring-1 ring-rose-500/30'
              : 'border-rose-200 bg-rose-50/70 text-rose-800 dark:border-rose-500/20 dark:bg-rose-950/20 dark:text-rose-400 hover:border-rose-300'
          }`}
        >
          <span className="text-xs font-bold uppercase flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4" /> {dict?.admin?.statusPending || dict?.admin?.pending || ''}
          </span>
          <p className="text-xl sm:text-2xl font-black font-mono mt-1">
            {bugStats?.pending ?? 0}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange('in_progress')}
          aria-pressed={bugStatusFilter === 'in_progress'}
          className={`rounded-2xl border p-4 transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-accent-amber ${
            bugStatusFilter === 'in_progress'
              ? 'border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 shadow-sm ring-1 ring-amber-500/30'
              : 'border-amber-200 bg-amber-50/70 text-amber-800 dark:border-amber-500/20 dark:bg-amber-950/20 dark:text-amber-400 hover:border-amber-300'
          }`}
        >
          <span className="text-xs font-bold uppercase flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {dict?.admin?.statusInProgress || dict?.admin?.inProgress || ''}
          </span>
          <p className="text-xl sm:text-2xl font-black font-mono mt-1">
            {bugStats?.in_progress ?? 0}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange('resolved')}
          aria-pressed={bugStatusFilter === 'resolved'}
          className={`rounded-2xl border p-4 transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
            bugStatusFilter === 'resolved'
              ? 'border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-500/30'
              : 'border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-950/20 dark:text-emerald-400 hover:border-emerald-300'
          }`}
        >
          <span className="text-xs font-bold uppercase flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4" /> {dict?.admin?.statusResolved || dict?.admin?.resolved || ''}
          </span>
          <p className="text-xl sm:text-2xl font-black font-mono mt-1">
            {bugStats?.resolved ?? 0}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange('all')}
          aria-pressed={bugStatusFilter === 'all'}
          className={`rounded-2xl border p-4 transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-border-color ${
            bugStatusFilter === 'all'
              ? 'border-border-color bg-bg-elevated text-text-primary shadow-sm ring-1 ring-border-color'
              : 'border-border-color bg-bg-surface text-text-secondary hover:border-border-subtle'
          }`}
        >
          <span className="text-xs font-bold uppercase flex items-center gap-1.5">
            <Bug className="h-4 w-4" /> {dict?.admin?.totalTickets || ''}
          </span>
          <p className="text-xl sm:text-2xl font-black text-text-primary font-mono mt-1">
            {bugStats?.total ?? 0}
          </p>
        </button>
      </div>

      {/* Master-Detail Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Ticket Feed */}
        <div className="lg:col-span-5 flex flex-col rounded-3xl border border-border-color bg-bg-surface p-4 shadow-sm dark:shadow-2xl space-y-4">
          <div className="flex flex-col gap-2.5 pb-3 border-b border-border-color">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                aria-label={dict?.admin?.searchTicketsPlaceholder || ''}
                value={bugSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={dict?.admin?.searchTicketsPlaceholder || ''}
                className="w-full rounded-xl border border-border-color bg-bg-primary py-2 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-red focus:outline-none shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <label htmlFor="bug-status-filter-select" className="flex items-center gap-1 text-[11px] font-bold text-text-secondary">
                <Filter className="h-3 w-3" />
                <span>{dict?.admin?.filterLabel || ''}</span>
              </label>
              <select
                id="bug-status-filter-select"
                value={bugStatusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="rounded-lg border border-border-color bg-bg-primary py-1.5 px-3 text-xs text-text-primary focus:border-accent-red focus:outline-none cursor-pointer"
              >
                <option value="all">{dict?.admin?.statusAll || ''}</option>
                <option value="pending">{dict?.admin?.statusPending || ''}</option>
                <option value="in_progress">{dict?.admin?.statusInProgress || ''}</option>
                <option value="resolved">{dict?.admin?.statusResolved || ''}</option>
                <option value="rejected">{dict?.admin?.statusRejected || ''}</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-12 text-center text-xs text-text-muted font-mono">
                {dict?.admin?.loadingTickets || ''}
              </div>
            ) : bugReports.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted font-mono">
                {dict?.admin?.noBugReports || ''}
              </div>
            ) : (
              bugReports.map((report) => {
                const isSelected = selectedBugId === report.id;
                const cfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
                const statusDictKey = STATUS_LABEL_KEYS[report.status];
                const statusLabel = (statusDictKey && dict?.admin?.[statusDictKey]) || cfg.label;

                return (
                  <div
                    key={report.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectBug(report.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectBug(report.id);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left space-y-2 focus:outline-none focus:ring-2 focus:ring-accent-red ${
                      isSelected
                        ? 'border-accent-red bg-rose-50/90 dark:bg-rose-950/30 shadow-sm ring-1 ring-accent-red/30'
                        : 'border-border-subtle bg-bg-primary hover:border-border-color'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                        <span className="font-mono text-xs font-black text-text-primary">
                          #{report.id}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${cfg.badge}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-text-primary truncate">
                      {report.title}
                    </h4>

                    <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                      {report.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-text-muted pt-1">
                      <span className="font-semibold text-text-secondary truncate max-w-[140px]">
                        {report.reporter_name}
                      </span>
                      <div className="flex items-center gap-2">
                        {report.images?.length > 0 && (
                          <span className="flex items-center gap-0.5 text-text-muted">
                            <ImageIcon className="h-3 w-3" />
                            {report.images.length}
                          </span>
                        )}
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {totalBugReports > 20 && (
            <div className="flex items-center justify-between pt-3 border-t border-border-color text-xs">
              <span className="text-text-secondary text-[11px]">
                {dict?.admin?.pageLabel || ''} {bugPage} {dict?.admin?.ofLabel || ''}{' '}
                {Math.ceil(totalBugReports / 20)}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onPageChange(Math.max(1, bugPage - 1))}
                  disabled={bugPage === 1}
                  aria-label={dict?.admin?.prevPage || ''}
                  className="p-1.5 rounded-lg border border-border-color bg-bg-surface text-text-primary hover:bg-bg-elevated disabled:opacity-30 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent-red shadow-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange(bugPage + 1)}
                  disabled={bugPage * 20 >= totalBugReports}
                  aria-label={dict?.admin?.nextPage || ''}
                  className="p-1.5 rounded-lg border border-border-color bg-bg-surface text-text-primary hover:bg-bg-elevated disabled:opacity-30 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent-red shadow-xs"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Ticket Inspector */}
        <div className="lg:col-span-7 sticky top-6">
          {selectedBug ? (
            <div className="rounded-3xl border border-border-color bg-bg-surface p-5 sm:p-6 shadow-sm dark:shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-color">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-accent-red">
                      #{selectedBug.id}
                    </span>
                    <span className="rounded-md bg-bg-elevated text-text-secondary border border-border-color px-2 py-0.5 text-[10px] font-bold">
                      {selectedBug.category}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {new Date(selectedBug.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-text-primary">
                    {selectedBug.title}
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {dict?.admin?.reportedBy || ''}{' '}
                    <strong className="text-text-primary">{selectedBug.reporter_name}</strong>{' '}
                    ({selectedBug.reporter_email || dict?.admin?.noEmailProvided || ''})
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <select
                    value={selectedBug.status}
                    aria-label={dict?.admin?.updateStatus || ''}
                    onChange={(e) => onUpdateBug(selectedBug.id, e.target.value)}
                    className="rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-border-color bg-bg-primary text-text-primary focus:border-accent-red focus:outline-none cursor-pointer shadow-xs"
                  >
                    <option value="pending">{dict?.admin?.statusPending || ''}</option>
                    <option value="in_progress">{dict?.admin?.statusInProgress || ''}</option>
                    <option value="resolved">{dict?.admin?.statusResolved || ''}</option>
                    <option value="rejected">{dict?.admin?.statusRejected || ''}</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => onDeleteBug(selectedBug.id)}
                    title={dict?.admin?.deleteBugReportTitle || ''}
                    aria-label={dict?.admin?.deleteBugReportTitle || ''}
                    className="p-2 rounded-xl border border-rose-500/40 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-red"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                  {dict?.admin?.description || ''}
                </h4>
                <div className="rounded-2xl border border-border-color bg-bg-primary p-4 text-xs text-text-primary leading-relaxed whitespace-pre-wrap min-h-[100px]">
                  {selectedBug.message}
                </div>
              </div>

              {selectedBug.images && selectedBug.images.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" />
                    {dict?.admin?.attachmentsLabel || ''} ({selectedBug.images.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedBug.images.map((imgUrl, i) => (
                      <a
                        key={i}
                        href={imgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={dict?.admin?.attachmentsLabel ? `${dict.admin.attachmentsLabel} ${i + 1}` : ''}
                        className="group relative h-28 rounded-2xl border border-border-color overflow-hidden bg-bg-elevated shadow-xs transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-accent-red"
                      >
                        <img
                          src={imgUrl}
                          alt={dict?.admin?.attachmentsLabel ? `${dict.admin.attachmentsLabel} ${i + 1}` : ''}
                          className="h-full w-full object-cover group-hover:opacity-85 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <ExternalLink className="h-5 w-5" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-border-color">
                <label htmlFor={`dev-feedback-${selectedBug.id}`} className="text-[11px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-accent-amber" />
                  {dict?.admin?.devFeedbackLabel || ''}
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <input
                    id={`dev-feedback-${selectedBug.id}`}
                    type="text"
                    value={editingNotes[selectedBug.id] ?? ''}
                    onChange={(e) => onNoteChange(selectedBug.id, e.target.value)}
                    placeholder={dict?.admin?.reasonPlaceholder || ''}
                    className="flex-1 rounded-xl border border-border-color bg-bg-primary px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-amber focus:outline-none shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateBug(selectedBug.id)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-amber to-accent-amber-hover text-text-inverted px-4 py-2 text-xs font-bold shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer font-sans focus:outline-none focus:ring-2 focus:ring-accent-amber"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{dict?.admin?.saveNote || dict?.user?.saveChanges || ''}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border-color p-12 text-center text-text-muted">
              <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium">
                {dict?.user?.noReportsSubtitle || ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

