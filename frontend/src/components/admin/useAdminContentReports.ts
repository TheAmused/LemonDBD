'use client';
// frontend/src/components/admin/useAdminContentReports.ts
//
// The content-report queue: the filtered, paged list, the selected report's evidence, and its decision.
import { logger } from '@/utils/logger';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ADMIN_STORAGE, CONTENT_REPORT_FILTERS, oneOf } from '@/components/admin/adminStorage';
import { DEFAULT_PAGE_SIZE, lastPage } from '@/constants/pagination';
import { useDictionary } from '@/context/DictionaryContext';
import { usePersistentString } from '@/hooks/usePersistentString';
import { fetchContentReport, listContentReports, resolveContentReport } from '@/services/adminApi';
import { getErrorMessage } from '@/utils/api';
import type { AuthorDecision } from '@/types/moderation';
import type {
  ActionMessage,
  AdminContentReport,
  AdminContentReportDetail,
  ContentReportAction,
  ContentReportStatus,
  QueueStats,
} from '@/types/admin';

interface ContentQueueInput {
  enabled: boolean;
  refreshKey: number;
  notify: (message: ActionMessage) => void;
  onChanged: () => void;
}

export function useAdminContentReports({ enabled, refreshKey, notify, onChanged }: ContentQueueInput) {
  const t = useDictionary().admin;
  const [items, setItems] = useState<AdminContentReport[]>([]);
  const [stats, setStats] = useState<QueueStats<ContentReportStatus> | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatusState] = usePersistentString<ContentReportStatus | 'all'>(ADMIN_STORAGE.contentStatus, 'pending', oneOf(CONTENT_REPORT_FILTERS));
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminContentReportDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  /** Only the newest detail request may set state: a slow answer for a report no longer selected is dropped. */
  const latestDetailRequest = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    listContentReports({ page, per_page: DEFAULT_PAGE_SIZE, status })
      .then((data) => {
        if (cancelled) return;
        const list = data.items ?? [];
        if (list.length === 0 && page > 1 && (data.total ?? 0) > 0) {
          setPage(lastPage(data.total ?? 0, DEFAULT_PAGE_SIZE));
          return;
        }
        setItems(list);
        setStats(data.stats ?? null);
        setTotal(data.total ?? 0);
        setSelectedId((prev) => (list.some((r) => r.id === prev) ? prev : (list[0]?.id ?? null)));
      })
      .catch((err: unknown) => {
        if (!cancelled) notify({ type: 'error', text: getErrorMessage(err, t.contentReportsLoadFailed) });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, page, status, refreshKey, reloadKey, notify, t.contentReportsLoadFailed]);

  useEffect(() => {
    const request = ++latestDetailRequest.current;
    if (!enabled || selectedId === null) {
      setDetail(null);
      setLoadingDetail(false);
      return;
    }
    setLoadingDetail(true);
    fetchContentReport(selectedId)
      .then((body) => {
        if (request === latestDetailRequest.current) setDetail(body);
      })
      .catch((err: unknown) => {
        logger.error('Failed to load the content report:', err);
        if (request === latestDetailRequest.current) setDetail(null);
      })
      .finally(() => {
        if (request === latestDetailRequest.current) setLoadingDetail(false);
      });
  }, [enabled, selectedId, refreshKey, reloadKey]);

  const resolve = useCallback(
    async (id: number, action: ContentReportAction, author: AuthorDecision | null, notes: string): Promise<boolean> => {
      if (resolving) return false;
      setResolving(true);
      try {
        await resolveContentReport(id, action, { ...(action === 'ban' && author ? author : {}), admin_notes: notes.trim() || undefined });
        notify({ type: 'success', text: action === 'ban' ? t.contentReportBanned : t.contentReportDismissed });
        setReloadKey((k) => k + 1);
        onChanged();
        return true;
      } catch (err: unknown) {
        notify({ type: 'error', text: getErrorMessage(err, t.contentReportResolveFailed) });
        return false;
      } finally {
        setResolving(false);
      }
    },
    [resolving, notify, onChanged, t.contentReportBanned, t.contentReportDismissed, t.contentReportResolveFailed]
  );

  return {
    items,
    stats,
    total,
    loading,
    status,
    setStatus: (value: ContentReportStatus | 'all') => {
      setStatusState(value);
      setPage(1);
    },
    page,
    setPage,
    selectedId,
    setSelectedId,
    /** The selected report's full case, once it has loaded (never a stale one for another id). */
    detail: detail && detail.id === selectedId ? detail : null,
    loadingDetail,
    resolving,
    resolve,
  };
}

export type AdminContentQueue = ReturnType<typeof useAdminContentReports>;
