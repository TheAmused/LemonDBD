'use client';
import type { Dictionary } from '@/locales/types';
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
import { AdminBugReport, BugReportStats } from '@/types/admin';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending Review',
    badge: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
    dot: 'bg-rose-500',
  },
  in_progress: {
    label: 'In Progress',
    badge: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    dot: 'bg-amber-500',
  },
  resolved: {
    label: 'Resolved',
    badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    badge: 'border-slate-500/40 bg-slate-500/10 text-slate-400',
    dot: 'bg-slate-500',
  },
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => onStatusFilterChange('pending')}
          className={`rounded-2xl border p-4 transition-all cursor-pointer ${
            bugStatusFilter === 'pending'
              ? 'border-rose-500 bg-rose-500/10 shadow-md'
              : 'border-rose-500/20 bg-rose-950/20 hover:border-rose-500/40'
          }`}
        >
          <span className="text-xs font-bold uppercase text-rose-400 flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4" /> {dict?.admin?.pending || 'Pending'}
          </span>
          <p className="text-xl sm:text-2xl font-black text-rose-400 font-mono mt-1">
            {bugStats?.pending ?? 0}

          </p>
        </div>

        <div
          onClick={() => onStatusFilterChange('in_progress')}
          className={`rounded-2xl border p-4 transition-all cursor-pointer ${
            bugStatusFilter === 'in_progress'
              ? 'border-amber-500 bg-amber-500/10 shadow-md'
              : 'border-amber-500/20 bg-amber-950/20 hover:border-amber-500/40'
          }`}
        >
          <span className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {dict?.admin?.inProgress || 'In Progress'}
          </span>
          <p className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-1">
            {bugStats?.in_progress ?? 0}

          </p>
        </div>

        <div
          onClick={() => onStatusFilterChange('resolved')}
          className={`rounded-2xl border p-4 transition-all cursor-pointer ${
            bugStatusFilter === 'resolved'
              ? 'border-emerald-500 bg-emerald-500/10 shadow-md'
              : 'border-emerald-500/20 bg-emerald-950/20 hover:border-emerald-500/40'
          }`}
        >
          <span className="text-xs font-bold uppercase text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4" /> {dict?.admin?.resolved || 'Resolved'}
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
            {bugStats?.resolved ?? 0}

          </p>
        </div>

        <div
          onClick={() => onStatusFilterChange('all')}
          className={`rounded-2xl border p-4 transition-all cursor-pointer ${
            bugStatusFilter === 'all'
              ? 'border-slate-500 bg-slate-800/50 shadow-md'
              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
          }`}
        >
          <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
            <Bug className="h-4 w-4" /> {dict?.admin?.totalTickets || 'Total Tickets'}
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-200 font-mono mt-1">
            {bugStats?.total ?? 0}

          </p>
        </div>
      </div>

      {/* Master-Detail Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Ticket Feed */}
        <div className="lg:col-span-5 flex flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="flex flex-col gap-2.5 pb-3 border-b border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={bugSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={dict?.admin?.searchTicketsPlaceholder || 'Search tickets / reporter...'}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-1.5 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                <Filter className="h-3 w-3" />
                <span>{dict?.admin?.filterLabel || 'Filter:'}</span>
              </div>
              <select
                value={bugStatusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950/80 py-1 px-2.5 text-xs text-slate-200 focus:border-rose-500 focus:outline-none cursor-pointer [&>option]:bg-slate-900 [&>option]:text-slate-100"
              >
                <option value="all">{dict?.admin?.statusAll || 'All Statuses'}</option>
                <option value="pending">{dict?.admin?.statusPending || 'Pending Review'}</option>
                <option value="in_progress">{dict?.admin?.statusInProgress || 'In Progress'}</option>
                <option value="resolved">{dict?.admin?.statusResolved || 'Resolved'}</option>
                <option value="rejected">{dict?.admin?.statusRejected || 'Rejected / Closed'}</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">
                {dict?.admin?.loadingTickets || 'Loading tickets...'}
              </div>
            ) : bugReports.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">
                {dict?.admin?.noBugReports || 'No bug reports found.'}
              </div>
            ) : (
              bugReports.map((report) => {

                const isSelected = selectedBugId === report.id;
                const cfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;

                return (
                  <div
                    key={report.id}
                    onClick={() => onSelectBug(report.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left space-y-2 ${
                      isSelected
                        ? 'border-rose-500/80 bg-rose-950/30 shadow-md ring-1 ring-rose-500/20'
                        : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                        <span className="font-mono text-xs font-black text-slate-300">
                          #{report.id}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${cfg.badge}`}
                      >
                        {cfg.label}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-slate-100 truncate">
                      {report.title}
                    </h4>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {report.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span className="font-semibold text-slate-300 truncate max-w-[140px]">
                        {report.reporter_name}
                      </span>
                      <div className="flex items-center gap-2">
                        {report.images?.length > 0 && (
                          <span className="flex items-center gap-0.5 text-slate-400">
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
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">
                {dict?.admin?.pageLabel || 'Page'} {bugPage} {dict?.admin?.ofLabel || 'of'} {Math.ceil(totalBugReports / 20)}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onPageChange(Math.max(1, bugPage - 1))}
                  disabled={bugPage === 1}
                  className="p-1.5 rounded-lg border border-slate-700 text-slate-300 disabled:opacity-30 hover:bg-slate-800 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange(bugPage + 1)}
                  disabled={bugPage * 20 >= totalBugReports}
                  className="p-1.5 rounded-lg border border-slate-700 text-slate-300 disabled:opacity-30 hover:bg-slate-800 cursor-pointer"
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
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-rose-400">
                      #{selectedBug.id}
                    </span>
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                      {selectedBug.category}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(selectedBug.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-100">
                    {selectedBug.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {dict?.admin?.reportedBy || 'Reported by'} <strong className="text-slate-200">{selectedBug.reporter_name}</strong>{' '}
                    ({selectedBug.reporter_email || dict?.admin?.noEmailProvided || 'No email provided'})
                  </p>
                </div>


                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <select
                    value={selectedBug.status}
                    onChange={(e) => onUpdateBug(selectedBug.id, e.target.value)}
                    className="rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-slate-700 bg-slate-950 text-slate-100 focus:border-rose-500 focus:outline-none cursor-pointer shadow-sm [&>option]:bg-slate-900 [&>option]:text-slate-100"
                  >
                    <option value="pending">{dict?.admin?.statusPending || 'Pending Review'}</option>
                    <option value="in_progress">{dict?.admin?.statusInProgress || 'In Progress'}</option>
                    <option value="resolved">{dict?.admin?.statusResolved || 'Resolved'}</option>
                    <option value="rejected">{dict?.admin?.statusRejected || 'Rejected / Closed'}</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => onDeleteBug(selectedBug.id)}
                    title={dict?.admin?.deleteBugReportTitle || 'Delete Ticket'}
                    className="p-2 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {dict?.admin?.description || 'Description'}
                </label>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap min-h-[100px]">
                  {selectedBug.message}

                </div>
              </div>

              {selectedBug.images && selectedBug.images.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" />
                    {dict?.admin?.attachmentsLabel || 'Attachments'} ({selectedBug.images.length})
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedBug.images.map((imgUrl, i) => (
                      <a
                        key={i}
                        href={imgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative h-28 rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-sm transition-all hover:scale-[1.02]"
                      >
                        <img
                          src={imgUrl}
                          alt={`Attachment ${i + 1}`}
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

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                  {dict?.admin?.devFeedbackLabel || 'Developer Feedback / Response Note (Visible to Submitter)'}
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <input

                    type="text"
                    value={editingNotes[selectedBug.id] ?? ''}
                    onChange={(e) => onNoteChange(selectedBug.id, e.target.value)}
                    placeholder={dict?.admin?.reasonPlaceholder || 'e.g. Fixed in patch v8.1 or investigating live logs...'}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateBug(selectedBug.id)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 px-4 py-2 text-xs font-bold shadow-md shadow-amber-950/30 transition-all cursor-pointer font-sans"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{dict?.user?.saveChanges || 'Save Note'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center text-slate-500">
              <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium">
                {dict?.user?.noReportsSubtitle || 'Select a ticket from the left to view details'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

