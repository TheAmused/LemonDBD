// frontend/src/components/admin/useAdminBugReports.ts
import { useCallback, useState } from 'react';
import { getBackendBaseUrl, authHeaders, getAuthToken, getErrorMessage } from '@/utils/api';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import type { ActionMessage, AdminBugReport, BugReportStats } from '@/types/admin';

/** The admin bug-report workbench: paged/filtered list, selection, notes and status/delete actions. */
export function useAdminBugReports({ onActionMessage }: { onActionMessage: (message: ActionMessage | null) => void }) {
  const dict = useDictionary();
  const API_BASE = getBackendBaseUrl();
  const [bugReports, setBugReports] = useState<AdminBugReport[]>([]);
  const [bugStats, setBugStats] = useState<BugReportStats | null>(null);
  const [bugSearch, setBugSearch] = useState<string>('');
  const [bugStatusFilter, setBugStatusFilter] = useState<string>('all');
  const [bugPage, setBugPage] = useState<number>(1);
  const [totalBugReports, setTotalBugReports] = useState<number>(0);
  const [loadingBugs, setLoadingBugs] = useState<boolean>(false);
  const [selectedBugId, setSelectedBugId] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});
  const [bugReportPendingDeletion, setBugReportPendingDeletion] = useState<number | null>(null);
  const [isDeletingBugReport, setIsDeletingBugReport] = useState<boolean>(false);

  const fetchBugReports = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    setLoadingBugs(true);
    try {
      const query = new URLSearchParams({
        page: bugPage.toString(),
        per_page: '20',
      });
      if (bugSearch.trim()) query.set('search', bugSearch.trim());
      if (bugStatusFilter !== 'all') query.set('status', bugStatusFilter);

      const res = await fetch(`${API_BASE}/api/v1/admin/bug-reports?${query.toString()}`, {
        headers: {
          ...authHeaders(token),
          'Cache-Control': 'no-cache',
        },
      });

      if (res.ok) {
        const data: { reports: AdminBugReport[]; stats: BugReportStats; total: number } = await res.json();
        const reportsList = data.reports || [];
        setBugReports(reportsList);
        setBugStats(data.stats || null);
        setTotalBugReports(data.total || 0);

        const initialNotes: Record<number, string> = {};
        reportsList.forEach((r) => {
          initialNotes[r.id] = r.admin_notes || '';
        });
        setEditingNotes(initialNotes);

        if (reportsList.length > 0) {
          setSelectedBugId((prev) => (reportsList.some((r) => r.id === prev) ? prev : reportsList[0].id));
        } else {
          setSelectedBugId(null);
        }
      }
    } catch (err: unknown) {
      console.error('Failed to load bug reports:', err);
    } finally {
      setLoadingBugs(false);
    }
  }, [API_BASE, bugPage, bugSearch, bugStatusFilter]);

  const handleUpdateBugReport = async (reportId: number, newStatus?: string) => {
    const token = getAuthToken();
    if (!token) return;

    const payload: Record<string, string> = {};
    if (newStatus) payload.status = newStatus;
    if (editingNotes[reportId] !== undefined) {
      payload.admin_notes = editingNotes[reportId];
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/bug-reports/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onActionMessage({
          type: 'success',
          text: formatMessage(dict.admin.ticketUpdatedSuccess, { id: reportId.toString() }) || `Report #${reportId} updated.`,
        });
        await fetchBugReports();
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err, dict.admin.networkError);
      onActionMessage({ type: 'error', text: msg });
    }
  };

  const handleDeleteBugReport = (reportId: number) => {
    setBugReportPendingDeletion(reportId);
  };

  const confirmDeleteBugReport = async () => {
    const reportId = bugReportPendingDeletion;
    if (reportId === null || isDeletingBugReport) return;
    const token = getAuthToken();
    if (!token) return;

    setIsDeletingBugReport(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/bug-reports/${reportId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });

      if (res.ok) {
        onActionMessage({
          type: 'success',
          text: formatMessage(dict.admin.ticketDeleteSuccess, { id: reportId.toString() }) || `Report #${reportId} deleted.`,
        });
        await fetchBugReports();
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err, dict.admin.ticketDeleteFailed);
      onActionMessage({ type: 'error', text: msg });
    } finally {
      setIsDeletingBugReport(false);
      setBugReportPendingDeletion(null);
    }
  };

  return {
    bugReports,
    bugStats,
    bugSearch,
    setBugSearch,
    bugStatusFilter,
    setBugStatusFilter,
    bugPage,
    setBugPage,
    totalBugReports,
    loadingBugs,
    selectedBugId,
    setSelectedBugId,
    editingNotes,
    setEditingNotes,
    fetchBugReports,
    bugReportPendingDeletion,
    setBugReportPendingDeletion,
    isDeletingBugReport,
    handleUpdateBugReport,
    handleDeleteBugReport,
    confirmDeleteBugReport,
  };
}
