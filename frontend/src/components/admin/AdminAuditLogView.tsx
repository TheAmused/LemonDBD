'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/admin/AdminAuditLogView.tsx

import React, { useCallback, useEffect, useState } from 'react';
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminAuditLogEntry } from '@/types/admin';
import { backendBase } from '@/utils/staticUrl';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

const ACTION_COLORS: Record<string, string> = {
  character_disabled: 'text-rose-400',
  perk_disabled: 'text-rose-400',
  challenge_mode_disabled: 'text-rose-400',
  character_enabled: 'text-emerald-400',
  perk_enabled: 'text-emerald-400',
  challenge_mode_enabled: 'text-emerald-400',
  user_deleted: 'text-rose-400',
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300">
          <ScrollText className="h-4 w-4 text-cyan-400" />
          {dict?.admin?.auditLog || 'Admin Activity Log'}
        </h3>
        <span className="text-[11px] text-slate-500">{total} {dict?.admin?.totalActionsLabel || 'total actions'}</span>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500 py-8 text-center">{dict?.admin?.loadingAuditLog || 'Loading audit log...'}</p>
      ) : logs.length === 0 ? (
        <p className="text-xs text-slate-500 py-8 text-center">{dict?.admin?.noAuditLogs || 'No admin actions logged yet.'}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left font-mono uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="py-2 pr-3 font-semibold">{dict?.admin?.thAdmin || 'Admin'}</th>
                <th className="py-2 pr-3 font-semibold">{dict?.admin?.thAction || 'Action'}</th>
                <th className="py-2 pr-3 font-semibold">{dict?.admin?.thTarget || 'Target'}</th>
                <th className="py-2 pr-3 font-semibold">{dict?.admin?.thReason || 'Reason'}</th>
                <th className="py-2 font-semibold text-right">{dict?.admin?.thWhen || 'When'}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-900 hover:bg-slate-950/40">
                  <td className="py-2.5 pr-3 font-bold text-slate-200 whitespace-nowrap">
                    {log.admin_username || `user #${log.admin_user_id ?? '?'}`}
                  </td>
                  <td className={`py-2.5 pr-3 font-mono whitespace-nowrap ${ACTION_COLORS[log.action] || 'text-slate-300'}`}>
                    {log.action}
                  </td>
                  <td className="py-2.5 pr-3 text-slate-400 whitespace-nowrap">
                    {log.target_type ? `${log.target_type}#${log.target_id}` : '-'}
                  </td>
                  <td className="py-2.5 pr-3 text-slate-500 italic truncate max-w-[220px]">
                    {describeDetails(log) || '-'}
                  </td>
                  <td className="py-2.5 text-right text-slate-600 font-mono whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] text-slate-500 font-mono">
            {dict?.admin?.pageLabel || 'Page'} {page} {dict?.admin?.ofLabel || 'of'} {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
