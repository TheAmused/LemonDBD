'use client';
// frontend/src/components/admin/useAdminBugReports.ts
//
// The bug-report queue: the filtered, paged list, the selected ticket, and its status / reply / delete.
import { useCallback, useEffect, useState } from 'react';
import { ADMIN_STORAGE, BUG_REPORT_FILTERS, oneOf } from '@/components/admin/adminStorage';
import { DEFAULT_PAGE_SIZE, lastPage } from '@/constants/pagination';
import { SEARCH_DEBOUNCE_MS } from '@/constants/timing';
import { useDictionary } from '@/context/DictionaryContext';
import { usePersistentString } from '@/hooks/usePersistentString';
import { deleteBugReport, listBugReports, updateBugReport } from '@/services/adminApi';
import { getErrorMessage } from '@/utils/api';
import { formatMessage } from '@/utils/i18nFormat';
import type { ActionMessage, AdminBugReport, BugReportStatus, QueueStats } from '@/types/admin';

interface BugQueueInput {
  enabled: boolean;
  refreshKey: number;
  notify: (message: ActionMessage) => void;
  onChanged: () => void;
}

export function useAdminBugReports({ enabled, refreshKey, notify, onChanged }: BugQueueInput) {
  const t = useDictionary().admin;
  const [reports, setReports] = useState<AdminBugReport[]>([]);
  const [stats, setStats] = useState<QueueStats<BugReportStatus> | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatusState] = usePersistentString<BugReportStatus | 'all'>(ADMIN_STORAGE.bugsStatus, 'pending', oneOf(BUG_REPORT_FILTERS));
  const [search, setSearchState] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    listBugReports({ page, per_page: DEFAULT_PAGE_SIZE, status: status === 'all' ? undefined : status, search: debouncedSearch })
      .then((data) => {
        if (cancelled) return;
        const list = data.reports ?? [];
        if (list.length === 0 && page > 1 && (data.total ?? 0) > 0) {
          setPage(lastPage(data.total ?? 0, DEFAULT_PAGE_SIZE));
          return;
        }
        setReports(list);
        setStats(data.stats ?? null);
        setTotal(data.total ?? 0);
        setSelectedId((prev) => (list.some((r) => r.id === prev) ? prev : (list[0]?.id ?? null)));
      })
      .catch((err: unknown) => {
        if (!cancelled) notify({ type: 'error', text: getErrorMessage(err, t.networkError) });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, page, status, debouncedSearch, refreshKey, reloadKey, notify, t.networkError]);

  const act = useCallback(
    async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
      try {
        await action();
        notify({ type: 'success', text: success });
        setReloadKey((k) => k + 1);
        onChanged();
        return true;
      } catch (err: unknown) {
        notify({ type: 'error', text: getErrorMessage(err, t.networkError) });
        return false;
      }
    },
    [notify, onChanged, t.networkError]
  );

  return {
    reports,
    stats,
    total,
    loading,
    status,
    setStatus: (value: BugReportStatus | 'all') => {
      setStatusState(value);
      setPage(1);
    },
    search,
    setSearch: (value: string) => {
      setSearchState(value);
      setPage(1);
    },
    page,
    setPage,
    selectedId,
    setSelectedId,
    selected: reports.find((r) => r.id === selectedId) ?? null,
    /** A reply typed but not sent goes with the status: under a status filter the ticket leaves the list. */
    changeStatus: (id: number, next: BugReportStatus, notes?: string) =>
      act(() => updateBugReport(id, { status: next, ...(notes !== undefined ? { admin_notes: notes } : {}) }), formatMessage(t.ticketUpdatedSuccess, { id })),
    reply: (id: number, notes: string) =>
      act(() => updateBugReport(id, { admin_notes: notes }), formatMessage(t.ticketReplySaved, { id })),
    remove: (id: number) => act(() => deleteBugReport(id), formatMessage(t.ticketDeleteSuccess, { id })),
  };
}

export type AdminBugQueue = ReturnType<typeof useAdminBugReports>;
