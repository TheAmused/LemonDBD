'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LemonIcon } from '@/components/LemonIcon';
import { Sidebar } from '@/components/Sidebar';
import { ScraperConfigModal } from '@/components/ScraperConfigModal';
import {
  ShieldAlert,
  Users,
  Database,
  Crown,
  Search,
  RefreshCw,
  Trash2,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  Layers,
  Sparkles,
  Compass,
  ArrowUpDown,
  Lock,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  X,
  Settings,
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

export default function AdminPanelPage() {
  const params = useParams();
  const router = useRouter();
  const currentLocale = (params?.locale as string) || 'en';
  const { user, isAdmin, isAuthenticated, isLoading } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchAdminData();
    }
  }, [isAuthenticated, isAdmin, fetchAdminData]);

  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && isAdmin) {
        fetchAdminData();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, isAdmin, fetchAdminData]);

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
    } catch (err: any) {
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
      } else {
        const data = await res.json();
        setActionMessage({ type: 'error', text: data.error || 'Failed to update role.' });
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
      } else {
        const data = await res.json();
        setActionMessage({ type: 'error', text: data.error || 'Failed to update status.' });
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
      } else {
        const data = await res.json();
        setActionMessage({ type: 'error', text: data.error || 'Failed to delete user.' });
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

      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: `User "${createUsername}" created successfully!` });
        setIsCreateUserOpen(false);
        setCreateUsername('');
        setCreateEmail('');
        setCreatePassword('');
        setCreateRole('user');
        await fetchAdminData();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to create user.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Network error.' });
    } finally {
      setIsCreating(false);
    }
  };

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
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/10 dark:bg-red-600/20 border border-red-500/30 text-red-600 dark:text-red-400 shadow-sm dark:shadow-lg dark:shadow-red-950/40">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-slate-900 dark:text-slate-100 font-mono">
                  Admin Control Center
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Global user management, ownership inspection, scraper engine controls, and system metrics.
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
                onClick={fetchAdminData}
                title="Refresh system metrics"
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                <span>Refresh Metrics</span>
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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-xl">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase mb-1">
                <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <span>Total Users</span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">{stats?.total_users ?? '-'}</p>
              <span className="text-[10px] text-slate-500">Active: {stats?.active_users ?? '-'}</span>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-xl">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase mb-1">
                <Crown className="h-4 w-4 text-rose-600 dark:text-red-400" />
                <span>Admins</span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">{stats?.admin_count ?? '-'}</p>
              <span className="text-[10px] text-slate-500">Privileged accounts</span>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-xl">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase mb-1">
                <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Characters</span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">{stats?.total_characters ?? '98'}</p>
              <span className="text-[10px] text-slate-500">
                {stats?.survivors_count ?? 54} Surv / {stats?.killers_count ?? 44} Killer
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-xl">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase mb-1">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Perks</span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">{stats?.total_perks ?? '321'}</p>
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

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 backdrop-blur-xl shadow-sm dark:shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                <h2 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-slate-200">
                  User Directory & Ownership Controls ({totalUsers})
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
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 py-1.5 px-3 text-xs text-slate-700 dark:text-slate-300 focus:border-amber-500 focus:outline-none transition-all cursor-pointer shadow-sm"
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
        </div>
      </main>

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
                <h3 className="text-base font-black tracking-wider text-slate-900 dark:text-slate-100 font-mono">Create New User</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Add a new account directly to the database</p>
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
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:outline-none shadow-sm cursor-pointer"
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
        onPurgeSuccess={fetchAdminData}
      />
    </div>
  );
}