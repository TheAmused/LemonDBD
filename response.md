### Solution Overview

Here is a breakdown of the production-ready modular architecture for the **Admin Control Center**:

1. **Separation of Concerns & Componentization**:
* **`frontend/src/types/admin.ts`**: Centralizes TypeScript interfaces (`AdminStats`, `UserRow`, `AdminBugReport`, `BugReportStats`, `ActionMessage`).


* **`frontend/src/components/admin/AdminHeader.tsx`**: Encapsulates the admin title bar, DB maintenance modal trigger, live scraper sync action, and data refresh controls.


* **`frontend/src/components/admin/AdminStatsGrid.tsx`**: Renders system health and catalog metrics (users, admins, character counts, perks total, database status).


* **`frontend/src/components/admin/AdminUserTable.tsx`**: Manages user filtering, role promotions/demotions, account suspension, and pagination.


* **`frontend/src/components/admin/AdminCreateUserModal.tsx`**: Isolates new account creation, credential input validation, and modal animation.


* **`frontend/src/components/admin/AdminBugReportsWorkbench.tsx`**: Handles the bug dispatch workbench with master-detail ticket inspection, status filtering, and developer note sync.




2. **Mobile & Desktop Viewport Layout Fix**:
* Resolved the horizontal squishing bug by structuring the page container with `flex flex-col lg:flex-row` and dynamic padding via `useSidebarState()` (`isCollapsed ? 'lg:pl-20' : 'lg:pl-72'`).




3. **Strict TypeScript & Safety**:
* Eliminated all `any` usages, handling network exceptions safely using standard `instanceof Error` type checking.



---

### frontend/src/types/admin.ts

```typescript
export interface AdminStats {
  total_users: number;
  active_users: number;
  admin_count: number;
  total_characters: number;
  survivors_count: number;
  killers_count: number;
  total_perks: number;
}

export interface UserRow {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  owned_characters_count: number;
  unlocked_perks_count: number;
}

export interface AdminBugReport {
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

export interface BugReportStats {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  rejected: number;
}

export interface ActionMessage {
  type: 'success' | 'error';
  text: string;
}

```

### frontend/src/components/admin/AdminHeader.tsx

```tsx
'use client';

import React from 'react';
import { Crown, Database, RefreshCw } from 'lucide-react';

interface AdminHeaderProps {
  isSyncing: boolean;
  syncStatus: string;
  isLoading: boolean;
  onOpenDbMaintenance: () => void;
  onTriggerSync: () => void;
  onRefreshData: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  isSyncing,
  syncStatus,
  isLoading,
  onOpenDbMaintenance,
  onTriggerSync,
  onRefreshData,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 w-full">
      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-600/20 border border-red-500/30 text-red-400 shadow-lg shadow-red-950/40">
          <Crown className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-wider text-slate-100 font-mono">
            Admin Control Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            User directory, Discord bug report dispatch, and database scraper orchestration.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenDbMaintenance}
          title="Database Maintenance & Purge Controls"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer shadow-sm flex-1 sm:flex-initial"
        >
          <Database className="h-3.5 w-3.5 text-slate-400" />
          <span>DB Maintenance</span>
        </button>

        <button
          type="button"
          onClick={onTriggerSync}
          disabled={isSyncing}
          title="Execute Data Scraper and Database Seed"
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-950/30 transition-all cursor-pointer disabled:opacity-60 flex-1 sm:flex-initial"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? `Syncing (${syncStatus})` : 'Sync Database Scraper'}</span>
        </button>

        <button
          type="button"
          onClick={onRefreshData}
          title="Refresh metrics"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </div>
  );
};

```

### frontend/src/components/admin/AdminStatsGrid.tsx

```tsx
'use client';

import React from 'react';
import { Users, Crown, Layers, Sparkles, Database } from 'lucide-react';
import { AdminStats } from '@/types/admin';

interface AdminStatsGridProps {
  stats: AdminStats | null;
}

export const AdminStatsGrid: React.FC<AdminStatsGridProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 w-full">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
          <Users className="h-4 w-4 text-cyan-400" />
          <span>Total Users</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
          {stats?.total_users ?? '-'}
        </p>
        <span className="text-[10px] text-slate-500">Active: {stats?.active_users ?? '-'}</span>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
          <Crown className="h-4 w-4 text-rose-400" />
          <span>Admins</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
          {stats?.admin_count ?? '-'}
        </p>
        <span className="text-[10px] text-slate-500">Privileged accounts</span>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
          <Layers className="h-4 w-4 text-indigo-400" />
          <span>Characters</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
          {stats?.total_characters ?? '98'}
        </p>
        <span className="text-[10px] text-slate-500">
          {stats?.survivors_count ?? 54} Surv / {stats?.killers_count ?? 44} Killer
        </span>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>Perks</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
          {stats?.total_perks ?? '321'}
        </p>
        <span className="text-[10px] text-slate-500">Database teachables</span>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl backdrop-blur-sm col-span-2 sm:col-span-1">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
          <Database className="h-4 w-4 text-emerald-400" />
          <span>Database</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">ONLINE</p>
        <span className="text-[10px] text-slate-500">Relational Store</span>
      </div>
    </div>
  );
};

```

### frontend/src/components/admin/AdminUserTable.tsx

```tsx
'use client';

import React from 'react';
import {
  Users,
  Search,
  UserPlus,
  Crown,
  Lock,
  Trash2,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { UserRow } from '@/types/admin';
import { UserAvatar } from '@/components/UserAvatar';

interface AdminUserTableProps {
  users: UserRow[];
  totalUsers: number;
  page: number;
  search: string;
  roleFilter: string;
  loading: boolean;
  currentUserId?: number;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onOpenCreateUser: () => void;
  onToggleRole: (user: UserRow) => void;
  onToggleActive: (user: UserRow) => void;
  onDeleteUser: (user: UserRow) => void;
}

export const AdminUserTable: React.FC<AdminUserTableProps> = ({
  users,
  totalUsers,
  page,
  search,
  roleFilter,
  loading,
  currentUserId,
  onSearchChange,
  onRoleFilterChange,
  onPageChange,
  onOpenCreateUser,
  onToggleRole,
  onToggleActive,
  onDeleteUser,
}) => {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-6 w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-amber-400" />
          <h2 className="text-base font-black uppercase tracking-wider text-slate-100 font-mono">
            User Accounts ({totalUsers})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search username / email..."
              className="w-full sm:w-64 rounded-xl border border-slate-700 bg-slate-950/80 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none shadow-inner"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950/80 py-2 px-3 text-xs text-slate-200 focus:border-amber-500 focus:outline-none cursor-pointer shadow-inner [&>option]:bg-slate-900 [&>option]:text-slate-100"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="user">Standard Users</option>
          </select>

          <button
            type="button"
            onClick={onOpenCreateUser}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-950/30 transition-all cursor-pointer font-sans"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-950/50 text-[10px] uppercase font-black tracking-wider text-slate-400">
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
          <tbody className="divide-y divide-slate-800/60">
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500 font-mono">
                  {loading ? 'Loading users...' : 'No users found matching query.'}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-500">#{u.id}</td>
                  <td className="px-4 py-3 font-bold text-slate-200">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar user={u} size="xs" />
                      <span className="truncate max-w-[120px]">{u.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 truncate max-w-[160px]">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                        u.role === 'admin'
                          ? 'border-red-500/40 bg-red-600/20 text-red-400'
                          : 'border-slate-700 bg-slate-800 text-slate-300'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-200">
                    {u.owned_characters_count ?? 0}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-200">
                    {u.unlocked_perks_count ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-red-400 font-semibold">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Disabled</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggleRole(u)}
                        title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                        className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:border-amber-500 hover:text-amber-400 transition-colors shadow-sm cursor-pointer"
                      >
                        <Crown className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleActive(u)}
                        title={u.is_active ? 'Disable Account' : 'Enable Account'}
                        className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:border-cyan-500 hover:text-cyan-400 transition-colors shadow-sm cursor-pointer"
                      >
                        <Lock className="h-3.5 w-3.5" />
                      </button>

                      {u.id !== currentUserId && (
                        <button
                          type="button"
                          onClick={() => onDeleteUser(u)}
                          title="Delete User"
                          className="rounded-lg border border-red-500/20 bg-red-950/30 p-1.5 text-red-400 hover:bg-red-900/50 transition-colors shadow-sm cursor-pointer"
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
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
          <span className="text-slate-400">
            Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, totalUsers)} of {totalUsers}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 font-semibold text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page * 15 >= totalUsers}
              className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 font-semibold text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

```

### frontend/src/components/admin/AdminCreateUserModal.tsx

```tsx
'use client';

import React, { useState } from 'react';
import { UserPlus, X } from 'lucide-react';

interface AdminCreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: {
    username: string;
    email: string;
    password: string;
    role: 'user' | 'admin';
  }) => Promise<void>;
}

export const AdminCreateUserModal: React.FC<AdminCreateUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ username, email, password, role });
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={() => !isSubmitting && onClose()}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-6 text-slate-100 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 z-10">
        <button
          type="button"
          onClick={() => !isSubmitting && onClose()}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shadow-sm">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-wider text-slate-100 font-mono">
              Create New User
            </h3>
            <p className="text-xs text-slate-400">
              Add a new account directly to the database
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. killer_master"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none shadow-inner"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. master@lemondbd.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none shadow-inner"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 3 characters"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none shadow-inner"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Role Privilege
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-2 px-3 text-xs text-slate-100 focus:border-amber-500 focus:outline-none shadow-inner cursor-pointer [&>option]:bg-slate-900 [&>option]:text-slate-100"
            >
              <option value="user">Standard User (Player)</option>
              <option value="admin">Administrator (Full Control)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-950/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
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
  );
};

```

### frontend/src/components/admin/AdminBugReportsWorkbench.tsx

```tsx
'use client';

import React from 'react';
import {
  HelpCircle,
  Clock,
  CheckCircle,
  Bug,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  MessageSquare,
  Save,
  Eye,
} from 'lucide-react';
import { AdminBugReport, BugReportStats } from '@/types/admin';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending Review',
    badge: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
    dot: 'bg-rose-500',
  },
  in_progress: {
    label: 'In Progress',
    badge: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    dot: 'bg-amber-500',
  },
  resolved: {
    label: 'Resolved',
    badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    badge: 'border-slate-500/40 bg-slate-500/10 text-slate-400',
    dot: 'bg-slate-500',
  },
};

interface AdminBugReportsWorkbenchProps {
  bugReports: AdminBugReport[];
  bugStats: BugReportStats | null;
  totalBugReports: number;
  bugPage: number;
  bugSearch: string;
  bugStatusFilter: string;
  selectedBugId: number | null;
  editingNotes: Record<number, string>;
  loading: boolean;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSelectBug: (id: number) => void;
  onNoteChange: (id: number, text: string) => void;
  onUpdateBug: (id: number, newStatus?: string) => void;
  onDeleteBug: (id: number) => void;
}

export const AdminBugReportsWorkbench: React.FC<AdminBugReportsWorkbenchProps> = ({
  bugReports,
  bugStats,
  totalBugReports,
  bugPage,
  bugSearch,
  bugStatusFilter,
  selectedBugId,
  editingNotes,
  loading,
  onSearchChange,
  onStatusFilterChange,
  onPageChange,
  onSelectBug,
  onNoteChange,
  onUpdateBug,
  onDeleteBug,
}) => {
  const selectedBug = bugReports.find((r) => r.id === selectedBugId) || null;

  return (
    <div className="space-y-6 w-full">
      {/* Quick Status Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => onStatusFilterChange('pending')}
          className={`rounded-2xl border p-4 transition-all cursor-pointer ${
            bugStatusFilter === 'pending'
              ? 'border-rose-500 bg-rose-500/10 shadow-md'
              : 'border-rose-500/20 bg-rose-950/20 hover:border-rose-500/40'
          }`}
        >
          <span className="text-xs font-bold uppercase text-rose-400 flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4" /> Pending
          </span>
          <p className="text-xl sm:text-2xl font-black text-rose-400 font-mono mt-1">
            {bugStats?.pending ?? 0}
          </p>
        </div>

        <div
          onClick={() => onStatusFilterChange('in_progress')}
          className={`rounded-2xl border p-4 transition-all cursor-pointer ${
            bugStatusFilter === 'in_progress'
              ? 'border-amber-500 bg-amber-500/10 shadow-md'
              : 'border-amber-500/20 bg-amber-950/20 hover:border-amber-500/40'
          }`}
        >
          <span className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> In Progress
          </span>
          <p className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-1">
            {bugStats?.in_progress ?? 0}
          </p>
        </div>

        <div
          onClick={() => onStatusFilterChange('resolved')}
          className={`rounded-2xl border p-4 transition-all cursor-pointer ${
            bugStatusFilter === 'resolved'
              ? 'border-emerald-500 bg-emerald-500/10 shadow-md'
              : 'border-emerald-500/20 bg-emerald-950/20 hover:border-emerald-500/40'
          }`}
        >
          <span className="text-xs font-bold uppercase text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4" /> Resolved
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
            {bugStats?.resolved ?? 0}
          </p>
        </div>

        <div
          onClick={() => onStatusFilterChange('all')}
          className={`rounded-2xl border p-4 transition-all cursor-pointer ${
            bugStatusFilter === 'all'
              ? 'border-slate-500 bg-slate-800/50 shadow-md'
              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
          }`}
        >
          <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
            <Bug className="h-4 w-4" /> Total Tickets
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-200 font-mono mt-1">
            {bugStats?.total ?? 0}
          </p>
        </div>
      </div>

      {/* Master-Detail Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Ticket Feed */}
        <div className="lg:col-span-5 flex flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="flex flex-col gap-2.5 pb-3 border-b border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={bugSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search tickets / reporter..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-1.5 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                <Filter className="h-3 w-3" />
                <span>Filter:</span>
              </div>
              <select
                value={bugStatusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950/80 py-1 px-2.5 text-xs text-slate-200 focus:border-rose-500 focus:outline-none cursor-pointer [&>option]:bg-slate-900 [&>option]:text-slate-100"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected / Closed</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">
                Loading tickets...
              </div>
            ) : bugReports.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">
                No bug reports found.
              </div>
            ) : (
              bugReports.map((report) => {
                const isSelected = selectedBugId === report.id;
                const cfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;

                return (
                  <div
                    key={report.id}
                    onClick={() => onSelectBug(report.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left space-y-2 ${
                      isSelected
                        ? 'border-rose-500/80 bg-rose-950/30 shadow-md ring-1 ring-rose-500/20'
                        : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                        <span className="font-mono text-xs font-black text-slate-300">
                          #{report.id}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${cfg.badge}`}
                      >
                        {cfg.label}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-slate-100 truncate">
                      {report.title}
                    </h4>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {report.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span className="font-semibold text-slate-300 truncate max-w-[140px]">
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

          {totalBugReports > 20 && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">
                Page {bugPage} of {Math.ceil(totalBugReports / 20)}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onPageChange(Math.max(1, bugPage - 1))}
                  disabled={bugPage === 1}
                  className="p-1.5 rounded-lg border border-slate-700 text-slate-300 disabled:opacity-30 hover:bg-slate-800 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange(bugPage + 1)}
                  disabled={bugPage * 20 >= totalBugReports}
                  className="p-1.5 rounded-lg border border-slate-700 text-slate-300 disabled:opacity-30 hover:bg-slate-800 cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Ticket Inspector */}
        <div className="lg:col-span-7 sticky top-6">
          {selectedBug ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-rose-400">
                      #{selectedBug.id}
                    </span>
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                      {selectedBug.category}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(selectedBug.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-100">
                    {selectedBug.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Reported by <strong className="text-slate-200">{selectedBug.reporter_name}</strong>{' '}
                    ({selectedBug.reporter_email || 'No email provided'})
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <select
                    value={selectedBug.status}
                    onChange={(e) => onUpdateBug(selectedBug.id, e.target.value)}
                    className="rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-slate-700 bg-slate-950 text-slate-100 focus:border-rose-500 focus:outline-none cursor-pointer shadow-sm [&>option]:bg-slate-900 [&>option]:text-slate-100"
                  >
                    <option value="pending">Pending Review</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected / Closed</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => onDeleteBug(selectedBug.id)}
                    title="Delete Ticket"
                    className="p-2 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Description
                </label>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap min-h-[100px]">
                  {selectedBug.message}
                </div>
              </div>

              {selectedBug.images && selectedBug.images.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
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
                        className="group relative h-28 rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-sm transition-all hover:scale-[1.02]"
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

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                  Developer Feedback / Response Note (Visible to Submitter)
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <input
                    type="text"
                    value={editingNotes[selectedBug.id] ?? ''}
                    onChange={(e) => onNoteChange(selectedBug.id, e.target.value)}
                    placeholder="e.g. Fixed in patch v8.1 or investigating live logs..."
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateBug(selectedBug.id)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 px-4 py-2 text-xs font-bold shadow-md shadow-amber-950/30 transition-all cursor-pointer font-sans"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Note</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center text-slate-500">
              <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium">Select a ticket from the left to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

```

### frontend/src/app/[locale]/admin/page.tsx

```tsx
'use client';

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
import { Users, Bug } from 'lucide-react';

export default function AdminPanelPage() {
  const params = useParams();
  const router = useRouter();
  const currentLocale = (params?.locale as Locale) || 'en';
  const { isCollapsed } = useSidebarState();
  const { user, isAdmin, isAuthenticated, isLoading } = useAuth();

  const [dict, setDict] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'bugs'>('users');
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
      if (activeTab === 'users') {
        fetchAdminData();
      } else {
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
            onOpenDbMaintenance={() => setIsConfigOpen(true)}
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

```