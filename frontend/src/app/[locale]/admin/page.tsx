'use client';
// frontend/src/app/[locale]/admin/page.tsx

import React, { useState, useEffect, useCallback, use, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/Sidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminStatsGrid } from '@/components/admin/AdminStatsGrid';
import { AdminUserTable } from '@/components/admin/AdminUserTable';
import { AdminPanelSkeleton } from '@/components/admin/AdminPanelSkeleton';
import { AdminTabContentSkeleton } from '@/components/admin/AdminTabContentSkeleton';
import { Locale } from '@/i18n/config';
import type { Dictionary } from '@/locales/types';
import type {
  AdminStats,
  UserRow,
  AdminBugReport,
  BugReportStats,
  ActionMessage,
} from '@/types/admin';
import { Users, Bug, ShieldAlert, BarChart3, ScrollText } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

// Only the "Users" tab (and its create/toggle-role modal chain) is visible
// on first paint. The other four admin subtabs, and every modal that only
// opens on interaction, are code-split out of the initial /admin bundle.
const AdminBugReportsWorkbench = dynamic(
  () => import('@/components/admin/AdminBugReportsWorkbench').then((m) => m.AdminBugReportsWorkbench),
  { ssr: false, loading: () => <AdminTabContentSkeleton /> }
);
const AdminChallengeControl = dynamic(
  () => import('@/components/admin/AdminChallengeControl').then((m) => m.AdminChallengeControl),
  { ssr: false, loading: () => <AdminTabContentSkeleton /> }
);
const AdminChallengeStats = dynamic(
  () => import('@/components/admin/AdminChallengeStats').then((m) => m.AdminChallengeStats),
  { ssr: false, loading: () => <AdminTabContentSkeleton /> }
);
const AdminAuditLogView = dynamic(
  () => import('@/components/admin/AdminAuditLogView').then((m) => m.AdminAuditLogView),
  { ssr: false, loading: () => <AdminTabContentSkeleton /> }
);
const AdminCreateUserModal = dynamic(
  () => import('@/components/admin/AdminCreateUserModal').then((m) => m.AdminCreateUserModal),
  { ssr: false }
);
const ScraperConfigModal = dynamic(
  () => import('@/components/ScraperConfigModal').then((m) => m.ScraperConfigModal),
  { ssr: false }
);
const ConfirmModal = dynamic(() => import('@/components/ConfirmModal').then((m) => m.ConfirmModal), {
  ssr: false,
});


interface AdminPageProps {
  params: Promise<{ locale: string }>;
}

type AdminTab = 'users' | 'bugs' | 'challenges' | 'challenge_stats' | 'audit';

export default function AdminPanelPage({ params }: AdminPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const currentLocale = (resolvedParams?.locale as Locale) || 'en';
  const { user, isAdmin, isAuthenticated, isLoading } = useAuth();

  const dict = useDictionary();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);

  // Users State
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Bug Reports State
  const [bugReports, setBugReports] = useState<AdminBugReport[]>([]);
  const [bugStats, setBugStats] = useState<BugReportStats | null>(null);
  const [bugSearch, setBugSearch] = useState<string>('');
  const [bugStatusFilter, setBugStatusFilter] = useState<string>('all');
  const [bugPage, setBugPage] = useState<number>(1);
  const [totalBugReports, setTotalBugReports] = useState<number>(0);
  const [loadingBugs, setLoadingBugs] = useState<boolean>(false);
  const [selectedBugId, setSelectedBugId] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});

  // Modals & Scraper State
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'export' | 'import' | 'purge'>('export');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [isCreateUserOpen, setIsCreateUserOpen] = useState<boolean>(false);
  const [userPendingDeletion, setUserPendingDeletion] = useState<UserRow | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);
  const [bugReportPendingDeletion, setBugReportPendingDeletion] = useState<number | null>(null);
  const [isDeletingBugReport, setIsDeletingBugReport] = useState<boolean>(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useDocumentTitle(dict?.app?.adminPageTitle || 'LemonDBD - Admin Control Center');

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      router.replace(`/${currentLocale}`);
    }
  }, [isLoading, isAuthenticated, isAdmin, currentLocale, router]);

  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('lemondbd_token');
  };

  const fetchAdminData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    setLoadingData(true);
    try {
      const timestamp = Date.now();
      const statsRes = await fetch(`${API_BASE}/api/v1/admin/stats?_t=${timestamp}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        cache: 'no-store',
      });
      if (statsRes.ok) {
        const sData: AdminStats = await statsRes.json();
        setStats(sData);
      }

      const query = new URLSearchParams({
        page: page.toString(),
        per_page: '15',
        _t: timestamp.toString(),
      });
      if (search.trim()) query.set('search', search.trim());
      if (roleFilter !== 'all') query.set('role', roleFilter);

      const usersRes = await fetch(`${API_BASE}/api/v1/users?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        cache: 'no-store',
      });
      if (usersRes.ok) {
        const uData: { users: UserRow[]; total: number } = await usersRes.json();
        setUsers(uData.users || []);
        setTotalUsers(uData.total || 0);
      }
    } catch (err: unknown) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [API_BASE, page, roleFilter, search]);

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
          Authorization: `Bearer ${token}`,
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

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      if (activeTab === 'users' || activeTab === 'challenge_stats') {
        fetchAdminData();
      } else if (activeTab === 'bugs') {
        fetchBugReports();
      }
    }
  }, [isAuthenticated, isAdmin, activeTab, fetchAdminData, fetchBugReports]);

  const handleTriggerSync = async () => {
    if (isSyncing) return;
    const token = getAuthToken();
    if (!token) {
      setActionMessage({
        type: 'error',
        text: dict?.admin?.tokenNotFound || 'Authentication token not found. Please log in again.',
      });
      return;
    }

    setIsSyncing(true);
    setSyncStatus(dict?.admin?.scrapingWiki || 'Scraping wiki.gg...');
    try {
      const res = await fetch(`${API_BASE}/api/v1/scrape-and-seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data: { characters_synced?: number; perks_synced?: number } = await res.json();
        const charCount = data.characters_synced ?? 98;
        const perkCount = data.perks_synced ?? 321;
        const defaultMsg = `Database sync completed! Synced ${charCount} Characters and ${perkCount} Perks.`;
        setActionMessage({
          type: 'success',
          text: dict?.admin?.syncSuccessMsg
            ? dict.admin.syncSuccessMsg.replace('{characters}', charCount.toString()).replace('{perks}', perkCount.toString())
            : defaultMsg,
        });
      } else {
        const errorData: { error?: string; message?: string } = await res.json().catch(() => ({}));
        setActionMessage({
          type: 'error',
          text: errorData.error || errorData.message || dict?.admin?.syncFailedMsg || 'Scraper failed to sync data.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : dict?.admin?.networkError || 'Network error during scraper sync.';
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setIsSyncing(false);
      setSyncStatus('');
      await fetchAdminData();
    }
  };

  const handleToggleRole = async (targetUser: UserRow) => {
    const token = getAuthToken();
    if (!token) return;

    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${targetUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        const updatedMsg = dict?.admin?.roleUpdated
          ? dict.admin.roleUpdated.replace('{username}', targetUser.username).replace('{role}', newRole.toUpperCase())
          : `Updated ${targetUser.username}'s role to ${newRole.toUpperCase()}.`;
        setActionMessage({
          type: 'success',
          text: updatedMsg,
        });
        await fetchAdminData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : dict?.admin?.networkError || 'Network error.';
      setActionMessage({ type: 'error', text: msg });
    }
  };

  const handleToggleActive = async (targetUser: UserRow) => {
    const token = getAuthToken();
    if (!token) return;

    const newActive = !targetUser.is_active;
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${targetUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: newActive }),
      });
      if (res.ok) {
        const statusLabel = newActive ? 'ACTIVE' : 'SUSPENDED';
        const msg = newActive
          ? dict?.admin?.statusUpdatedActive?.replace('{username}', targetUser.username) || `${targetUser.username} is now ACTIVE.`
          : dict?.admin?.statusUpdatedSuspended?.replace('{username}', targetUser.username) || `${targetUser.username} is now SUSPENDED.`;
        setActionMessage({
          type: 'success',
          text: msg || `${targetUser.username} is now ${statusLabel}.`,
        });
        await fetchAdminData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : dict?.admin?.networkError || 'Network error.';
      setActionMessage({ type: 'error', text: msg });
    }
  };

  const handleDeleteUser = (targetUser: UserRow) => {
    setUserPendingDeletion(targetUser);
  };

  const confirmDeleteUser = async () => {
    const targetUser = userPendingDeletion;
    if (!targetUser || isDeletingUser) return;
    const token = getAuthToken();
    if (!token) return;

    setIsDeletingUser(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${targetUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: dict?.admin?.userDeletedSuccess?.replace('{username}', targetUser.username) || `User ${targetUser.username} deleted.`,
        });
        await fetchAdminData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : dict?.admin?.networkError || 'Network error.';
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setIsDeletingUser(false);
      setUserPendingDeletion(null);
    }
  };

  const handleCreateUser = async (userData: {
    username: string;
    email: string;
    password: string;
    role: 'user' | 'admin';
  }) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: dict?.admin?.userCreatedSuccess?.replace('{username}', userData.username) || `User "${userData.username}" created successfully!`,
        });
        setIsCreateUserOpen(false);
        await fetchAdminData();
      } else {
        const errorData: { error?: string } = await res.json().catch(() => ({}));
        setActionMessage({
          type: 'error',
          text: errorData.error || dict?.admin?.userCreateFailed || 'Failed to create user.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : dict?.admin?.networkError || 'Network error.';
      setActionMessage({ type: 'error', text: msg });
    }
  };

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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: dict?.admin?.ticketUpdatedSuccess?.replace('{id}', reportId.toString()) || `Ticket #${reportId} updated successfully.`,
        });
        await fetchBugReports();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : dict?.admin?.networkError || 'Failed to update ticket.';
      setActionMessage({ type: 'error', text: msg });
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
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: dict?.admin?.ticketDeleteSuccess?.replace('{id}', reportId.toString()) || `Bug report #${reportId} deleted.`,
        });
        await fetchBugReports();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : dict?.admin?.ticketDeleteFailed || 'Failed to delete bug report.';
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setIsDeletingBugReport(false);
      setBugReportPendingDeletion(null);
    }
  };

  if (!dict || isLoading || !isAuthenticated || !isAdmin) {
    // Layout-matched skeleton instead of a bare spinner -- keeps CLS at
    // zero once the real header/stats/table mount.
    return <AdminPanelSkeleton dict={dict} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar currentLocale={currentLocale} dict={dict} activeCategory="admin" />

      <main
        className="flex-1 w-full overflow-y-auto transition-[padding] duration-300 p-4 sm:p-6 lg:p-8 lemon-shell-main"
        id="main-admin-content"
      >
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <AdminHeader
            isSyncing={isSyncing}
            syncStatus={syncStatus}
            isLoading={loadingData || loadingBugs}
            onOpenDbMaintenance={(tab) => {
              if (tab) setModalTab(tab);
              setIsConfigOpen(true);
            }}
            onTriggerSync={handleTriggerSync}
            onRefreshData={() => (activeTab === 'users' ? fetchAdminData() : fetchBugReports())}
            dict={dict}
          />

          {actionMessage && (
            <div
              role="alert"
              aria-live="polite"
              className={`flex items-center justify-between rounded-xl border p-4 text-xs shadow-sm ${actionMessage.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
                }`}
            >
              <span className="font-semibold">{actionMessage.text}</span>
              <button
                type="button"
                onClick={() => setActionMessage(null)}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-sm leading-none ml-3 cursor-pointer p-1 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
                aria-label={dict?.admin?.closeSymbol || 'Close notification'}
              >
                {dict?.admin?.closeSymbol || '×'}
              </button>
            </div>
          )}

          {/* Subtab Switcher */}
          <nav aria-label={dict?.admin?.adminSections || 'Admin Sections'} className="flex flex-wrap sm:flex-nowrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'users'}
              onClick={() => setActiveTab('users')}
              className={`min-h-[48px] flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-amber-500 ${activeTab === 'users'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/40'
                }`}
            >
              <Users className="h-4 w-4" />
              <span>
                {dict?.admin?.userDirectoryLabel || 'User Directory'} ({totalUsers})
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'bugs'}
              onClick={() => setActiveTab('bugs')}
              className={`min-h-[48px] flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-rose-500 ${activeTab === 'bugs'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/40'
                }`}
            >
              <Bug className="h-4 w-4" />
              <span>
                {dict?.admin?.bugReportsLabel || 'Bug Reports'} ({bugStats?.pending ?? 0} {dict?.admin?.pending || 'Pending'})
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'challenges'}
              onClick={() => setActiveTab('challenges')}
              className={`min-h-[48px] flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-cyan-500 ${activeTab === 'challenges'
                  ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/40'
                }`}
            >
              <ShieldAlert className="h-4 w-4" />
              <span>{dict?.admin?.killSwitches || 'Kill Switches'}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'challenge_stats'}
              onClick={() => setActiveTab('challenge_stats')}
              className={`min-h-[48px] flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-indigo-500 ${activeTab === 'challenge_stats'
                  ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/40'
                }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>{dict?.admin?.challengeStats || 'Challenge Stats'}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'audit'}
              onClick={() => setActiveTab('audit')}
              className={`min-h-[48px] flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-500 ${activeTab === 'audit'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/40'
                }`}
            >
              <ScrollText className="h-4 w-4" />
              <span>{dict?.admin?.auditLog || 'Audit Log'}</span>
            </button>
          </nav>

          {activeTab === 'users' ? (
            <div className="space-y-6">
              <AdminStatsGrid stats={stats} dict={dict} />
              <AdminUserTable
                users={users}
                totalUsers={totalUsers}
                page={page}
                search={search}
                roleFilter={roleFilter}
                loading={loadingData}
                currentUserId={user?.id}
                dict={dict}
                onSearchChange={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                onRoleFilterChange={(val) => {
                  setRoleFilter(val);
                  setPage(1);
                }}
                onPageChange={setPage}
                onOpenCreateUser={() => setIsCreateUserOpen(true)}
                onToggleRole={handleToggleRole}
                onToggleActive={handleToggleActive}
                onDeleteUser={handleDeleteUser}
              />
            </div>
          ) : activeTab === 'challenges' ? (
            <Suspense fallback={<AdminTabContentSkeleton dict={dict} />}>
              <AdminChallengeControl onActionMessage={setActionMessage} dict={dict} />
            </Suspense>
          ) : activeTab === 'challenge_stats' ? (
            <Suspense fallback={<AdminTabContentSkeleton dict={dict} />}>
              <AdminChallengeStats stats={stats} dict={dict} />
            </Suspense>
          ) : activeTab === 'audit' ? (
            <Suspense fallback={<AdminTabContentSkeleton dict={dict} />}>
              <AdminAuditLogView dict={dict} />
            </Suspense>
          ) : (
            <Suspense fallback={<AdminTabContentSkeleton dict={dict} />}>
              <AdminBugReportsWorkbench
                bugReports={bugReports}
                bugStats={bugStats}
                totalBugReports={totalBugReports}
                bugPage={bugPage}
                bugSearch={bugSearch}
                bugStatusFilter={bugStatusFilter}
                selectedBugId={selectedBugId}
                editingNotes={editingNotes}
                loading={loadingBugs}
                dict={dict}
                onSearchChange={(val) => {
                  setBugSearch(val);
                  setBugPage(1);
                }}
                onStatusFilterChange={(val) => {
                  setBugStatusFilter(val);
                  setBugPage(1);
                }}
                onPageChange={setBugPage}
                onSelectBug={setSelectedBugId}
                onNoteChange={(id, text) =>
                  setEditingNotes((prev) => ({ ...prev, [id]: text }))
                }
                onUpdateBug={handleUpdateBugReport}
                onDeleteBug={handleDeleteBugReport}
              />
            </Suspense>
          )}
        </div>
      </main>

      <AdminCreateUserModal
        isOpen={isCreateUserOpen}
        onClose={() => setIsCreateUserOpen(false)}
        onSubmit={handleCreateUser}
        dict={dict}
      />

      <ScraperConfigModal
        key={modalTab}
        isOpen={isConfigOpen}
        initialTab={modalTab}
        onClose={() => setIsConfigOpen(false)}
        dict={dict}
        onPurgeSuccess={() => {
          fetchAdminData();
          fetchBugReports();
        }}
      />

      <ConfirmModal
        open={userPendingDeletion !== null}
        title={dict?.admin?.deleteUserTitle || 'Delete user?'}
        message={
          <>
            {dict?.admin?.confirmDeleteUserPrefix || 'Are you sure you want to delete user'}{' '}
            <strong className="font-bold text-slate-900 dark:text-white">{userPendingDeletion?.username}</strong>?
            <br />
            {dict?.admin?.cannotBeUndone || 'This cannot be undone.'}
          </>
        }
        confirmLabel={dict?.admin?.delete || 'Delete'}
        busy={isDeletingUser}
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserPendingDeletion(null)}
      />

      <ConfirmModal
        open={bugReportPendingDeletion !== null}
        title={dict?.admin?.deleteBugReportTitle || 'Delete bug report?'}
        message={
          dict?.admin?.confirmDeleteBugReport
            ? dict.admin.confirmDeleteBugReport.replace('{id}', (bugReportPendingDeletion ?? 0).toString())
            : `Are you sure you want to delete bug report #${bugReportPendingDeletion}?`
        }
        confirmLabel={dict?.admin?.delete || 'Delete'}
        busy={isDeletingBugReport}
        onConfirm={confirmDeleteBugReport}
        onCancel={() => setBugReportPendingDeletion(null)}
      />
    </div>
  );
}