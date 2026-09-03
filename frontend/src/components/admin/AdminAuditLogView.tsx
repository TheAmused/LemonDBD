'use client';
// frontend/src/components/admin/AdminAuditLogView.tsx

import React, { useCallback, useEffect, useState } from 'react';
import type { Dictionary } from '@/locales/types';
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminAuditLogEntry } from '@/types/admin';
import { backendBase } from '@/utils/staticUrl';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

const ACTION_COLORS: Record<string, string> = {
  character_disabled: 'text-rose-700 dark:text-rose-400',
  perk_disabled: 'text-rose-700 dark:text-rose-400',
  challenge_mode_disabled: 'text-rose-700 dark:text-rose-400',
  character_enabled: 'text-emerald-700 dark:text-emerald-400',
  perk_enabled: 'text-emerald-700 dark:text-emerald-400',
  challenge_mode_enabled: 'text-emerald-700 dark:text-emerald-400',
  user_deleted: 'text-rose-700 dark:text-rose-400',
};

export const AdminAuditLogView: React.FC<{ dict?: Dictionary }> = ({ dict }) => {
  const [logs, setLogs] = useState<AdminAuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const perPage = 25;

  const load = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lemondbd_token') : null;
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${backendBase}/api/v1/admin/audit-logs?page=${page}&per_page=${perPage}`, {
        headers: authHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const describeDetails = (log: AdminAuditLogEntry): string | null => {
    if (!log.details) return null;
    try {
      const parsed = JSON.parse(log.details);
      const reason = parsed.reason;
      return reason ? `"${reason}"` : null;
    } catch {
      return null;
    }
  };

  return (
    <div className="rounded-2xl border border-border-color bg-bg-surface p-4 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-sm transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-text-primary">
          <ScrollText className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          <span>{dict?.admin?.auditLog || 'Activity Log'}</span>
        </h3>
        <span className="text-xs text-text-secondary font-medium">
          {total} {dict?.admin?.totalActionsLabel || 'total actions'}
        </span>
      </div>

      {loading ? (
        <p className="text-xs text-text-muted py-8 text-center font-mono">
          {dict?.admin?.loadingAuditLog || 'Loading activity...'}
        </p>
      ) : logs.length === 0 ? (
        <p className="text-xs text-text-muted py-8 text-center">
          {dict?.admin?.noAuditLogs || 'No records found.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left font-mono uppercase tracking-wider text-text-secondary border-b border-border-color">
                <th className="py-2.5 pr-3 font-bold">{dict?.admin?.thAdmin || 'User'}</th>
                <th className="py-2.5 pr-3 font-bold">{dict?.admin?.thAction || 'Action'}</th>
                <th className="py-2.5 pr-3 font-bold">{dict?.admin?.thTarget || 'Target'}</th>
                <th className="py-2.5 pr-3 font-bold">{dict?.admin?.thReason || 'Reason'}</th>
                <th className="py-2.5 font-bold text-right">{dict?.admin?.thWhen || 'Time'}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-border-subtle hover:bg-bg-elevated/50 transition-colors text-text-primary"
                >
                  <td className="py-3 pr-3 font-bold whitespace-nowrap">
                    {log.admin_username || `#${log.admin_user_id ?? '?'}`}
                  </td>
                  <td className={`py-3 pr-3 font-mono whitespace-nowrap font-semibold ${ACTION_COLORS[log.action] || 'text-text-secondary'}`}>
                    {log.action}
                  </td>
                  <td className="py-3 pr-3 text-text-secondary whitespace-nowrap">
                    {log.target_type ? `${log.target_type}#${log.target_id}` : '-'}
                  </td>
                  <td className="py-3 pr-3 text-text-secondary italic truncate max-w-[240px]">
                    {describeDetails(log) || '-'}
                  </td>
                  <td className="py-3 text-right text-text-muted font-mono whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5 pt-3 border-t border-border-color">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-2 rounded-lg border border-border-color bg-bg-surface hover:bg-bg-elevated text-text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-text-secondary font-mono font-medium">
            {dict?.admin?.pageLabel || 'Page'} {page} {dict?.admin?.ofLabel || 'of'} {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="p-2 rounded-lg border border-border-color bg-bg-surface hover:bg-bg-elevated text-text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

