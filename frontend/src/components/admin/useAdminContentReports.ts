'use client';
// frontend/src/components/admin/useAdminContentReports.ts
import { useCallback, useRef, useState } from 'react';
import { getBackendBaseUrl, authHeaders, getAuthToken, getErrorMessage } from '@/utils/api';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import type {
  ActionMessage,
  AdminContentReportDetail,
  AdminContentReportList,
  ContentReportAction,
} from '@/types/admin';

const PER_PAGE = 20;

/** The server's own error text when it sent one (409 "already resolved", 404, ...), else the fallback. */
async function responseError(res: Response, fallback: string): Promise<string> {
  try {
    const body: { error?: unknown } = await res.json();
    return typeof body.error === 'string' && body.error ? body.error : fallback;
  } catch {
    return fallback;
  }
}

/** The admin content-report workbench: filtered list, the selected report's evidence, and resolve/purge. */
export function useAdminContentReports({ onActionMessage }: { onActionMessage: (message: ActionMessage | null) => void }) {
  const dict = useDictionary();
  const API_BASE = getBackendBaseUrl();
  const [list, setList] = useState<AdminContentReportList | null>(null);
  const [pendingTotal, setPendingTotal] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminContentReportDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [resolving, setResolving] = useState<boolean>(false);
  /** Only the newest detail request may set state: a slow answer for a report no longer selected is dropped. */
  const latestDetailRequest = useRef<number>(0);

  /** Only the badge on the tab: one cheap request, independent of the open list. */
  const refreshPendingCount = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/content-reports?status=pending&page=1&per_page=1`, {
        headers: { ...authHeaders(token), 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data: AdminContentReportList = await res.json();
        setPendingTotal(data.pending_total ?? 0);
      }
    } catch (err: unknown) {
      console.error('Failed to load the content report count:', err);
    }
  }, [API_BASE]);

  const fetchReports = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({ status: statusFilter, page: String(page), per_page: String(PER_PAGE) });
      const res = await fetch(`${API_BASE}/api/v1/admin/content-reports?${query.toString()}`, {
        headers: { ...authHeaders(token), 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) {
        onActionMessage({ type: 'error', text: await responseError(res, dict.admin.contentReportsLoadFailed) });
        return;
      }
      const data: AdminContentReportList = await res.json();
      setList(data);
      setPendingTotal(data.pending_total ?? 0);
      const items = data.items ?? [];
      setSelectedId((prev) => (items.some((r) => r.id === prev) ? prev : (items[0]?.id ?? null)));
    } catch (err: unknown) {
      onActionMessage({ type: 'error', text: getErrorMessage(err, dict.admin.networkError) });
    } finally {
      setLoading(false);
    }
  }, [API_BASE, statusFilter, page, onActionMessage, dict.admin.contentReportsLoadFailed, dict.admin.networkError]);

  const fetchDetail = useCallback(async (reportId: number | null) => {
    const request = ++latestDetailRequest.current;
    if (reportId === null) {
      setDetail(null);
      setLoadingDetail(false);
      return;
    }
    const token = getAuthToken();
    if (!token) return;
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/content-reports/${reportId}/preview`, {
        headers: { ...authHeaders(token), 'Cache-Control': 'no-cache' },
      });
      const body = res.ok ? ((await res.json()) as AdminContentReportDetail) : null;
      if (request === latestDetailRequest.current) setDetail(body);
    } catch (err: unknown) {
      console.error('Failed to load the content report:', err);
      if (request === latestDetailRequest.current) setDetail(null);
    } finally {
      if (request === latestDetailRequest.current) setLoadingDetail(false);
    }
  }, [API_BASE]);

  const resolve = useCallback(async (reportId: number, action: ContentReportAction, banAuthor: boolean, notes: string) => {
    const token = getAuthToken();
    if (!token || resolving) return false;
    setResolving(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/content-reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ action, ban_author: action === 'ban' && banAuthor, admin_notes: notes.trim() || undefined }),
      });
      if (!res.ok) {
        onActionMessage({ type: 'error', text: await responseError(res, dict.admin.contentReportResolveFailed) });
        return false;
      }
      onActionMessage({
        type: 'success',
        text: action === 'ban' ? dict.admin.contentReportBanned : dict.admin.contentReportDismissed,
      });
      await fetchReports();
      return true;
    } catch (err: unknown) {
      onActionMessage({ type: 'error', text: getErrorMessage(err, dict.admin.networkError) });
      return false;
    } finally {
      setResolving(false);
    }
  }, [API_BASE, resolving, fetchReports, onActionMessage, dict.admin]);

  const purgeExpired = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/content-reports/purge-expired`, {
        method: 'POST',
        headers: authHeaders(token),
      });
      if (!res.ok) {
        onActionMessage({ type: 'error', text: await responseError(res, dict.admin.contentReportPurgeFailed) });
        return;
      }
      const data: { purged_count?: number } = await res.json();
      onActionMessage({
        type: 'success',
        text: formatMessage(dict.admin.contentReportPurged, { count: String(data.purged_count ?? 0) }),
      });
      await fetchReports();
    } catch (err: unknown) {
      onActionMessage({ type: 'error', text: getErrorMessage(err, dict.admin.networkError) });
    }
  }, [API_BASE, fetchReports, onActionMessage, dict.admin]);

  return {
    list,
    pendingTotal,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    loading,
    selectedId,
    setSelectedId,
    detail,
    loadingDetail,
    resolving,
    perPage: PER_PAGE,
    refreshPendingCount,
    fetchReports,
    fetchDetail,
    resolve,
    purgeExpired,
  };
}
