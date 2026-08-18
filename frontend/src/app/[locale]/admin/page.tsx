'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LemonIcon } from '@/components/LemonIcon';
import { Sidebar } from '@/components/Sidebar';
import { ScraperConfigModal } from '@/components/ScraperConfigModal';
import {
  Users,
  Database,
  Crown,
  Search,
  RefreshCw,
  Trash2,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Layers,
  Sparkles,
  Lock,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  X,
  Bug,
  Clock,
  MessageSquare,
  HelpCircle,
  Save,
  Image as ImageIcon,
  ExternalLink,
  Filter,
  Eye,
} from 'lucide-react';

interface AdminStats {
  total_users: number;
  active_users: number;
  admin_count: number;
  total_characters: number;
  survivors_count: number;
  killers_count: number;
  total_perks: number;
}

interface UserRow {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  owned_characters_count: number;
  unlocked_perks_count: number;
}

interface AdminBugReport {
  id: number;
  user_id?: number;
  reporter_name: string;
  reporter_email?: string;
  title: string;
  category: string;
  message: string;
  images: string[];
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}

interface BugReportStats {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  rejected: number;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending Review',
    badge: 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
  in_progress: {
    label: 'In Progress',
    badge: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  resolved: {
    label: 'Resolved',
    badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    badge: 'border-slate-500/40 bg-slate-500/10 text-slate-600 dark:text-slate-400',
    dot: 'bg-slate-500',
  },
};

export default function AdminPanelPage() {
  const params = useParams();
  const router = useRouter();
  const currentLocale = (params?.locale as string) || 'en';
  const { user, isAdmin, isAuthenticated, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'bugs'>('users');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Users Management State
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
  const [editingNotes, setEditingNotes] = useState<{ [key: number]: string }>({});

  // Modals & Actions
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');

  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [createUsername, setCreateUsername] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'user' | 'admin'>('user');
  const [isCreating, setIsCreating] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    document.title = 'LemonDBD - Admin Control Center';
  }, []);

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
          Pragma: 'no-cache',
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
          Pragma: 'no-cache',
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

        const initialNotes: { [key: number]: string } = {};
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
      if (activeTab === 'users') {
        fetchAdminData();
      } else {
        fetchBugReports();
      }
    }
  }, [isAuthenticated, isAdmin, activeTab, fetchAdminData, fetchBugReports]);

  const handleTriggerSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus('Scraping deadbydaylight.wiki.gg...');
    try {
      const res = await fetch(`${API_BASE}/api/scrape-and-seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setActionMessage({
          type: 'success',
          text: `Database sync completed! Synced ${data.characters_synced ?? 98} Characters and ${data.perks_synced ?? 321} Perks.`,
        });
      } else {
        setActionMessage({ type: 'error', text: 'Scraper failed to sync data from wiki.gg.' });
      }
    } catch (err) {
      console.error('Failed to trigger database scraper job:', err);
      setActionMessage({ type: 'error', text: 'Network error during scraper sync.' });
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
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Network error.' });
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
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Network error.' });
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
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Network error.' });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('lemondbd_token');
    if (!token) return;

    setIsCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: createUsername,
          email: createEmail,
          password: createPassword,
          role: createRole,
        }),
      });

      if (res.ok) {
        setActionMessage({ type: 'success', text: `User "${createUsername}" created successfully!` });
        setIsCreateUserOpen(false);
        setCreateUsername('');
        setCreateEmail('');
        setCreatePassword('');
        setCreateRole('user');
        await fetchAdminData();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Network error.' });
    } finally {
      setIsCreating(false);
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
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to update ticket.' });
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
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to delete bug report.' });
    }
  };

  const selectedBug = bugReports.find((r) => r.id === selectedBugId) || null;

  const dummyDict = {
    app: { title: 'LemonDBD', syncWiki: 'Sync Wiki Data', syncing: 'Syncing...' },
    filters: { allCategories: 'Perks Vault', generatorTab: 'Perk Randomizer' },
  };

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <LemonIcon className="h-10 w-10 animate-bounce" />
          <p className="text-sm font-mono text-amber-600 dark:text-amber-400">
            {isLoading ? 'Verifying administrative access...' : 'Redirecting to Dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex transition-colors duration-300">
      <Sidebar
        currentLocale={currentLocale}
        dict={dummyDict}
        activeCategory="admin"
        onSelectCategory={() => { }}
      />

      <main className="flex-1 lg:pl-64 min-w-0">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/10 dark:bg-red-600/20 border border-red-500/30 text-red-600 dark:text-red-400 shadow-sm dark:shadow-lg dark:shadow-red-950/40">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-slate-900 dark:text-slate-100 font-mono">
                  Admin Control Center
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  User accounts, bug reports & Discord dispatch, and database scraper controls.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setIsConfigOpen(true)}
                title="Database Maintenance & Purge Controls"
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
              >
                <Database className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span>DB Maintenance</span>
              </button>

              <button
                onClick={handleTriggerSync}
                disabled={isSyncing}
                title="Execute Data Scraper and Database Seed"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-950/30 transition-all cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? `Syncing (${syncStatus})` : 'Sync Database Scraper'}</span>
              </button>

              <button
                onClick={() => (activeTab === 'users' ? fetchAdminData() : fetchBugReports())}
                title="Refresh metrics"
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingData || loadingBugs ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {actionMessage && (
            <div
              className={`flex items-center justify-between rounded-xl border p-4 text-xs shadow-sm ${actionMessage.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
                }`}
            >
              <span>{actionMessage.text}</span>
              <button
                onClick={() => setActionMessage(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                &times;
              </button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'users'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
            >
              <Users className="h-4 w-4" />
              <span>User Directory ({totalUsers})</span>
            </button>

            <button
              onClick={() => setActiveTab('bugs')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'bugs'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
            >
              <Bug className="h-4 w-4" />
              <span>Bug Reports ({bugStats?.pending ?? 0} Pending)</span>
            </button>
          </div>

          {activeTab === 'users' ? (
            <>
              {/* User Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-xl">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase mb-1">
                    <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Total Users</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                    {stats?.total_users ?? '-'}
                  </p>
                  <span className="text-[10px] text-slate-500">Active: {stats?.active_users ?? '-'}</span>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-xl">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase mb-1">
                    <Crown className="h-4 w-4 text-rose-600 dark:text-red-400" />
                    <span>Admins</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                    {stats?.admin_count ?? '-'}
                  </p>
                  <span className="text-[10px] text-slate-500">Privileged accounts</span>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-xl">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase mb-1">
                    <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Characters</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                    {stats?.total_characters ?? '98'}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {stats?.survivors_count ?? 54} Surv / {stats?.killers_count ?? 44} Killer
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-xl">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase mb-1">
                    <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>Perks</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                    {stats?.total_perks ?? '321'}
                  </p>
                  <span className="text-[10px] text-slate-500">Database teachables</span>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-xl">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase mb-1">
                    <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Database</span>
                  </div>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">ONLINE</p>
                  <span className="text-[10px] text-slate-500">PostgreSQL (Relational)</span>
                </div>
              </div>

              {/* User Directory Table */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/80 p-6 backdrop-blur-xl shadow-sm dark:shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                    <h2 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-slate-200">
                      User Accounts ({totalUsers})
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search username / email..."
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 py-1.5 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 w-48 sm:w-64 transition-all shadow-sm"
                      />
                    </div>

                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 py-1.5 px-3 text-xs text-slate-700 dark:text-slate-200 focus:border-amber-500 focus:outline-none transition-all cursor-pointer shadow-sm [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-100"
                    >
                      <option value="all">All Roles</option>
                      <option value="admin">Admins</option>
                      <option value="user">Standard Users</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setIsCreateUserOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-amber-950/30 transition-all cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Create User</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Owned Chars</th>
                        <th className="px-4 py-3">Unlocked Perks</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-slate-500 font-mono">
                            {loadingData ? 'Loading users...' : 'No users found matching query.'}
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-400 dark:text-slate-500">#{u.id}</td>
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-200">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shadow-sm">
                                  <LemonIcon className="h-4 w-4" />
                                </div>
                                <span>{u.username}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.email}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${u.role === 'admin'
                                    ? 'border-red-500/40 bg-red-600/10 dark:bg-red-600/15 text-red-700 dark:text-red-400'
                                    : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-900 dark:text-slate-200">
                              {u.owned_characters_count ?? 0}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-900 dark:text-slate-200">
                              {u.unlocked_perks_count ?? 0}
                            </td>
                            <td className="px-4 py-3">
                              {u.is_active ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  <span>Active</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 font-semibold">
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>Disabled</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleToggleRole(u)}
                                  title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-700 dark:text-slate-300 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors shadow-sm cursor-pointer"
                                >
                                  <Crown className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  onClick={() => handleToggleActive(u)}
                                  title={u.is_active ? 'Disable Account' : 'Enable Account'}
                                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-700 dark:text-slate-300 hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors shadow-sm cursor-pointer"
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                </button>

                                {u.id !== user?.id && (
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    title="Delete User"
                                    className="rounded-lg border border-rose-200 dark:border-red-500/20 bg-rose-50 dark:bg-red-950/30 p-1.5 text-rose-600 dark:text-red-400 hover:bg-rose-100 dark:hover:bg-red-900/50 transition-colors shadow-sm cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalUsers > 15 && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, totalUsers)} of {totalUsers}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Previous</span>
                      </button>
                      <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page * 15 >= totalUsers}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
                      >
                        <span>Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Bug Reports Workbench - Master-Detail Layout */
            <div className="space-y-6">
              {/* Quick Status Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div
                  onClick={() => setBugStatusFilter('pending')}
                  className={`rounded-2xl border p-4 transition-all cursor-pointer ${bugStatusFilter === 'pending'
                      ? 'border-rose-500 bg-rose-500/10 shadow-md'
                      : 'border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/20 hover:border-rose-500/40'
                    }`}
                >
                  <span className="text-xs font-bold uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4" /> Pending Review
                  </span>
                  <p className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1">
                    {bugStats?.pending ?? 0}
                  </p>
                </div>

                <div
                  onClick={() => setBugStatusFilter('in_progress')}
                  className={`rounded-2xl border p-4 transition-all cursor-pointer ${bugStatusFilter === 'in_progress'
                      ? 'border-amber-500 bg-amber-500/10 shadow-md'
                      : 'border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 hover:border-amber-500/40'
                    }`}
                >
                  <span className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> In Progress
                  </span>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
                    {bugStats?.in_progress ?? 0}
                  </p>
                </div>

                <div
                  onClick={() => setBugStatusFilter('resolved')}
                  className={`rounded-2xl border p-4 transition-all cursor-pointer ${bugStatusFilter === 'resolved'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-md'
                      : 'border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 hover:border-emerald-500/40'
                    }`}
                >
                  <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" /> Resolved
                  </span>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                    {bugStats?.resolved ?? 0}
                  </p>
                </div>

                <div
                  onClick={() => setBugStatusFilter('all')}
                  className={`rounded-2xl border p-4 transition-all cursor-pointer ${bugStatusFilter === 'all'
                      ? 'border-slate-400 dark:border-slate-600 bg-slate-200/50 dark:bg-slate-800/50 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                  <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Bug className="h-4 w-4" /> Total Tickets
                  </span>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-200 font-mono mt-1">
                    {bugStats?.total ?? 0}
                  </p>
                </div>
              </div>

              {/* Master-Detail Split Workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ── Left Pane: Ticket Feed (5 Cols) ── */}
                <div className="lg:col-span-5 flex flex-col rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/80 p-4 backdrop-blur-xl shadow-sm dark:shadow-2xl space-y-4">
                  {/* Search & Filter Bar */}
                  <div className="flex flex-col gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={bugSearch}
                        onChange={(e) => setBugSearch(e.target.value)}
                        placeholder="Search tickets / reporter..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 py-1.5 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-rose-500 focus:outline-none shadow-sm"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                        <Filter className="h-3 w-3" />
                        <span>Filter:</span>
                      </div>
                      <select
                        value={bugStatusFilter}
                        onChange={(e) => setBugStatusFilter(e.target.value)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 py-1 px-2.5 text-xs text-slate-700 dark:text-slate-200 focus:border-rose-500 focus:outline-none cursor-pointer [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-100"
                      >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending Review</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected / Closed</option>
                      </select>
                    </div>
                  </div>

                  {/* Scrollable Ticket List */}
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    {loadingBugs ? (
                      <div className="py-12 text-center text-xs text-slate-400 font-mono">
                        Loading tickets...
                      </div>
                    ) : bugReports.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 font-mono">
                        No bug reports found.
                      </div>
                    ) : (
                      bugReports.map((report) => {
                        const isSelected = selectedBugId === report.id;
                        const cfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;

                        return (
                          <div
                            key={report.id}
                            onClick={() => setSelectedBugId(report.id)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left space-y-2 ${isSelected
                                ? 'border-rose-500 dark:border-rose-500/80 bg-rose-50/50 dark:bg-rose-950/30 shadow-md ring-1 ring-rose-500/20'
                                : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                                <span className="font-mono text-xs font-black text-slate-700 dark:text-slate-300">
                                  #{report.id}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${cfg.badge}`}
                              >
                                {cfg.label}
                              </span>
                            </div>

                            <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                              {report.title}
                            </h4>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {report.message}
                            </p>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
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

                  {/* Pagination */}
                  {totalBugReports > 20 && (
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Page {bugPage} of {Math.ceil(totalBugReports / 20)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setBugPage((p) => Math.max(1, p - 1))}
                          disabled={bugPage === 1}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setBugPage((p) => p + 1)}
                          disabled={bugPage * 20 >= totalBugReports}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Right Pane: Ticket Inspector & Details (7 Cols) ── */}
                <div className="lg:col-span-7 sticky top-6">
                  {selectedBug ? (
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 p-6 backdrop-blur-xl shadow-sm dark:shadow-2xl space-y-6">
                      {/* Ticket Header & Status Selector */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-rose-500">
                              #{selectedBug.id}
                            </span>
                            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              {selectedBug.category}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(selectedBug.created_at).toLocaleString()}
                            </span>
                          </div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                            {selectedBug.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Reported by <strong className="text-slate-700 dark:text-slate-300">{selectedBug.reporter_name}</strong>{' '}
                            ({selectedBug.reporter_email || 'No email provided'})
                          </p>
                        </div>

                        {/* Status Control & Delete */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <select
                            value={selectedBug.status}
                            onChange={(e) => handleUpdateBugReport(selectedBug.id, e.target.value)}
                            className="rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-rose-500 focus:outline-none cursor-pointer shadow-sm [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-100"
                          >
                            <option value="pending">Pending Review</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="rejected">Rejected / Closed</option>
                          </select>

                          <button
                            onClick={() => handleDeleteBugReport(selectedBug.id)}
                            title="Delete Ticket"
                            className="p-2 rounded-xl border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Issue Description */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Description
                        </label>
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 p-4 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap min-h-[100px]">
                          {selectedBug.message}
                        </div>
                      </div>

                      {/* Attached Images */}
                      {selectedBug.images && selectedBug.images.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <ImageIcon className="h-3.5 w-3.5" />
                            Attachments ({selectedBug.images.length})
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {selectedBug.images.map((imgUrl, i) => (
                              <a
                                key={i}
                                href={imgUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative h-28 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-950 shadow-sm transition-all hover:scale-[1.02]"
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

                      {/* Developer Feedback / Note Editor */}
                      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
                          Developer Feedback / Response Note (Visible to Submitter)
                        </label>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                          <input
                            type="text"
                            value={editingNotes[selectedBug.id] ?? ''}
                            onChange={(e) =>
                              setEditingNotes((prev) => ({ ...prev, [selectedBug.id]: e.target.value }))
                            }
                            placeholder="e.g. Fixed in patch v8.1 or investigating live logs..."
                            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none shadow-sm"
                          />
                          <button
                            onClick={() => handleUpdateBugReport(selectedBug.id)}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white px-4 py-2 text-xs font-bold shadow-md shadow-amber-950/30 transition-all cursor-pointer"
                          >
                            <Save className="h-3.5 w-3.5" />
                            <span>Save Note</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400">
                      <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-medium">Select a ticket from the left to view details</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create User Modal */}
      {isCreateUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            onClick={() => !isCreating && setIsCreateUserOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/95 p-6 text-slate-900 dark:text-slate-100 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => !isCreating && setIsCreateUserOpen(false)}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-sm">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-wider text-slate-900 dark:text-slate-100 font-mono">
                  Create New User
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add a new account directly to the database
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                  placeholder="e.g. killer_master"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 py-2 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="e.g. master@lemondbd.com"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 py-2 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Minimum 3 characters"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 py-2 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Role Privilege
                </label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as 'user' | 'admin')}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:outline-none shadow-sm cursor-pointer [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-100"
                >
                  <option value="user">Standard User (Player)</option>
                  <option value="admin">Administrator (Full Control)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateUserOpen(false)}
                  disabled={isCreating}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-amber-950/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? (
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ScraperConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onPurgeSuccess={() => {
          fetchAdminData();
          fetchBugReports();
        }}
      />
    </div>
  );
}