'use client';
// frontend/src/app/[locale]/admin/page.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LemonIcon } from '@/components/LemonIcon';
import { Sidebar } from '@/components/Sidebar';
import { ScraperConfigModal } from '@/components/ScraperConfigModal';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminStatsGrid } from '@/components/admin/AdminStatsGrid';
import { AdminUserTable } from '@/components/admin/AdminUserTable';
import { AdminCreateUserModal } from '@/components/admin/AdminCreateUserModal';
import { AdminBugReportsWorkbench } from '@/components/admin/AdminBugReportsWorkbench';
import { AdminChallengeControl } from '@/components/admin/AdminChallengeControl';
import { AdminChallengeStats } from '@/components/admin/AdminChallengeStats';
import { AdminAuditLogView } from '@/components/admin/AdminAuditLogView';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { useSidebarState } from '@/hooks/useSidebarState';
import {
  AdminStats,
  UserRow,
  AdminBugReport,
  BugReportStats,
  ActionMessage,
} from '@/types/admin';
import { Users, Bug, ShieldAlert, BarChart3, ScrollText } from 'lucide-react';

export default function AdminPanelPage() {
  const params = useParams();
  const router = useRouter();
  const currentLocale = (params?.locale as Locale) || 'en';
  const { isCollapsed } = useSidebarState();
  const { user, isAdmin, isAuthenticated, isLoading } = useAuth();

  const [dict, setDict] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'bugs' | 'challenges' | 'challenge_stats' | 'audit'>('users');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);

  // Users State
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  // Bug Reports State
  const [bugReports, setBugReports] = useState<AdminBugReport[]>([]);
  const [bugStats, setBugStats] = useState<BugReportStats | null>(null);
  const [bugSearch, setBugSearch] = useState('');
  const [bugStatusFilter, setBugStatusFilter] = useState('all');
  const [bugPage, setBugPage] = useState(1);
  const [totalBugReports, setTotalBugReports] = useState(0);
  const [loadingBugs, setLoadingBugs] = useState(false);
  const [selectedBugId, setSelectedBugId] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});

  // Modals & Scraper State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'export' | 'import' | 'purge'>('export');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    document.title = 'LemonDBD - Admin Control Center';
    getDictionary(currentLocale).then(setDict);
  }, [currentLocale]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      router.replace(`/${currentLocale}`);
    }
  }, [isLoading, isAuthenticated, isAdmin, currentLocale, router]);

  const fetchAdminData = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lemondbd_token') : null;
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
        const sData = await statsRes.json();
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
        const uData = await usersRes.json();
        setUsers(uData.users || []);
        setTotalUsers(uData.total || 0);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [API_BASE, page, roleFilter, search]);

  const fetchBugReports = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lemondbd_token') : null;
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
        const data = await res.json();
        const reportsList: AdminBugReport[] = data.reports || [];
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
    } catch (err) {
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('lemondbd_token') : null;
    if (!token) {
      setActionMessage({ type: 'error', text: 'Authentication token not found. Please log in again.' });
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Scraping wiki.gg...');
    try {
      const res = await fetch(`${API_BASE}/api/v1/scrape-and-seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setActionMessage({
          type: 'success',
          text: `Database sync completed! Synced ${data.characters_synced ?? 98} Characters and ${data.perks_synced ?? 321} Perks.`,
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        setActionMessage({
          type: 'error',
          text: errorData.error || errorData.message || 'Scraper failed to sync data.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error during scraper sync.';
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setIsSyncing(false);
      setSyncStatus('');
      await fetchAdminData();
    }
  };

  const handleToggleRole = async (targetUser: UserRow) => {
    const token = localStorage.getItem('lemondbd_token');
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
        setActionMessage({
          type: 'success',
          text: `Updated ${targetUser.username}'s role to ${newRole.toUpperCase()}.`,
        });
        await fetchAdminData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error.';
      setActionMessage({ type: 'error', text: msg });
    }
  };

  const handleToggleActive = async (targetUser: UserRow) => {
    const token = localStorage.getItem('lemondbd_token');
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
        setActionMessage({
          type: 'success',
          text: `${targetUser.username} is now ${newActive ? 'ACTIVE' : 'SUSPENDED'}.`,
        });
        await fetchAdminData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error.';
      setActionMessage({ type: 'error', text: msg });
    }
  };

  const handleDeleteUser = async (targetUser: UserRow) => {
    if (!confirm(`Are you sure you want to delete user "${targetUser.username}"? This cannot be undone.`)) {
      return;
    }
    const token = localStorage.getItem('lemondbd_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${targetUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: `User ${targetUser.username} deleted.` });
        await fetchAdminData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error.';
      setActionMessage({ type: 'error', text: msg });
    }
  };

  const handleCreateUser = async (userData: {
    username: string;
    email: string;
    password: string;
    role: 'user' | 'admin';
  }) => {
    const token = localStorage.getItem('lemondbd_token');
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
        setActionMessage({ type: 'success', text: `User "${userData.username}" created successfully!` });
        setIsCreateUserOpen(false);
        await fetchAdminData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        setActionMessage({ type: 'error', text: errorData.error || 'Failed to create user.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error.';
      setActionMessage({ type: 'error', text: msg });
    }
  };

  const handleUpdateBugReport = async (reportId: number, newStatus?: string) => {
    const token = localStorage.getItem('lemondbd_token');
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
          text: `Ticket #${reportId} updated successfully.`,
        });
        await fetchBugReports();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update ticket.';
      setActionMessage({ type: 'error', text: msg });
    }
  };

  const handleDeleteBugReport = async (reportId: number) => {
    if (!confirm(`Are you sure you want to delete bug report #${reportId}?`)) return;
    const token = localStorage.getItem('lemondbd_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/bug-reports/${reportId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setActionMessage({ type: 'success', text: `Bug report #${reportId} deleted.` });
        await fetchBugReports();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete bug report.';
      setActionMessage({ type: 'error', text: msg });
    }
  };

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b12] text-slate-100 font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <LemonIcon className="h-10 w-10 animate-bounce" />
          <p className="text-amber-400">
            {isLoading ? 'Verifying administrative access...' : 'Redirecting to Dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={currentLocale}
        dict={dict}
        activeCategory="admin"
      />

      <main
        className={`flex-1 w-full overflow-y-auto transition-all duration-300 p-4 sm:p-6 lg:p-8 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
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
          />

          {actionMessage && (
            <div
              className={`flex items-center justify-between rounded-xl border p-4 text-xs shadow-sm ${
                actionMessage.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-400'
              }`}
            >
              <span>{actionMessage.text}</span>
              <button
                type="button"
                onClick={() => setActionMessage(null)}
                className="text-slate-400 hover:text-slate-200 text-sm leading-none ml-3 cursor-pointer"
              >
                &times;
              </button>
            </div>
          )}

          {/* Subtab Switcher */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 border-b border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>User Directory ({totalUsers})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bugs')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'bugs'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bug className="h-4 w-4" />
              <span>Bug Reports ({bugStats?.pending ?? 0} Pending)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('challenges')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'challenges'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Kill Switches</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('challenge_stats')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'challenge_stats'
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Challenge Stats</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ScrollText className="h-4 w-4" />
              <span>Audit Log</span>
            </button>
          </div>

          {activeTab === 'users' ? (
            <div className="space-y-6">
              <AdminStatsGrid stats={stats} />
              <AdminUserTable
                users={users}
                totalUsers={totalUsers}
                page={page}
                search={search}
                roleFilter={roleFilter}
                loading={loadingData}
                currentUserId={user?.id}
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
            <AdminChallengeControl onActionMessage={setActionMessage} />
          ) : activeTab === 'challenge_stats' ? (
            <AdminChallengeStats stats={stats} />
          ) : activeTab === 'audit' ? (
            <AdminAuditLogView />
          ) : (
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
          )}
        </div>
      </main>

      <AdminCreateUserModal
        isOpen={isCreateUserOpen}
        onClose={() => setIsCreateUserOpen(false)}
        onSubmit={handleCreateUser}
      />

      <ScraperConfigModal
        key={modalTab}
        isOpen={isConfigOpen}
        initialTab={modalTab}
        onClose={() => setIsConfigOpen(false)}
        onPurgeSuccess={() => {
          fetchAdminData();
          fetchBugReports();
        }}
      />
    </div>
  );
}

