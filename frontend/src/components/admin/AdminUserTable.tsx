'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/admin/AdminUserTable.tsx

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
  dict?: Dictionary;
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
  dict,
  onSearchChange,
  onRoleFilterChange,
  onPageChange,
  onOpenCreateUser,
  onToggleRole,
  onToggleActive,
  onDeleteUser,
}) => {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 sm:p-6 backdrop-blur-xl shadow-sm dark:shadow-2xl space-y-6 w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-amber-500 dark:text-amber-400" />
          <h2 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 font-mono">
            {dict?.admin?.title || 'User Accounts'} ({totalUsers})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={dict?.admin?.searchUserPlaceholder || 'Search username / email...'}
              className="w-full sm:w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none shadow-inner"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 py-2 px-3 text-xs text-slate-900 dark:text-slate-200 focus:border-amber-500 focus:outline-none cursor-pointer shadow-inner [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-100"
          >
            <option value="all">{dict?.admin?.allRoles || 'All Roles'}</option>
            <option value="admin">{dict?.admin?.admins || 'Admins'}</option>
            <option value="user">{dict?.admin?.standardUsers || 'Standard Users'}</option>
          </select>

          <button
            type="button"
            onClick={onOpenCreateUser}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-950/30 transition-all cursor-pointer font-sans"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>{dict?.admin?.createUser || 'Create User'}</span>
          </button>
        </div>
      </div>

      {/* Mobile: stacked cards (no horizontal scroll / cramped 8-column table). */}
      <div className="sm:hidden space-y-3 w-full">
        {users.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 py-8 text-center text-xs text-slate-500 font-mono">
            {loading ? (dict?.admin?.loading || 'Loading users...') : (dict?.admin?.noUsers || 'No users found matching query.')}
          </div>
        ) : (
          users.map((u) => (
            <div key={u.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <UserAvatar user={u} size="xs" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{u.username}</span>
                      {u.id === currentUserId && (
                        <span className="shrink-0 rounded-md bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          {dict?.admin?.you || 'You'}
                        </span>
                      )}
                    </div>
                    <span className="block text-[11px] text-slate-500 font-mono truncate">{u.email}</span>
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    u.role === 'admin'
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : 'bg-slate-200/80 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}
                >
                  {u.role === 'admin' && <Crown className="h-2.5 w-2.5" />}
                  {u.role}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                <span>#{u.id}</span>
                <span>{dict?.admin?.thOwnedChars || 'Owned Chars'}: {u.owned_characters_count ?? 0}</span>
                <span>{dict?.admin?.thUnlockedPerks || 'Unlocked Perks'}: {u.unlocked_perks_count ?? 0}</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/80">
                {u.is_active ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{dict?.stats?.active || 'Active'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 font-semibold">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>{dict?.sidebar?.disabled || 'Disabled'}</span>
                  </span>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onToggleRole(u)}
                    title={u.role === 'admin' ? (dict?.admin?.demote || 'Demote to User') : (dict?.admin?.promote || 'Promote to Admin')}
                    className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-amber-500 hover:text-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-amber-500 dark:hover:text-amber-400 transition-colors shadow-sm cursor-pointer"
                  >
                    <Crown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleActive(u)}
                    title={u.is_active ? (dict?.admin?.disableAccount || 'Disable Account') : (dict?.admin?.enableAccount || 'Enable Account')}
                    className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-cyan-500 hover:text-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-cyan-500 dark:hover:text-cyan-400 transition-colors shadow-sm cursor-pointer"
                  >
                    <Lock className="h-4 w-4" />
                  </button>
                  {u.id !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => onDeleteUser(u)}
                      title={dict?.admin?.deleteUserTitle || 'Delete User'}
                      className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors shadow-sm cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop/tablet: full data table (own horizontal scroll only as a safety net). */}
      <div className="hidden sm:block overflow-x-auto w-full">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/50 text-[10px] uppercase font-black tracking-wider text-slate-600 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{dict?.admin?.thId || 'ID'}</th>
              <th className="px-4 py-3">{dict?.admin?.thUser || 'User'}</th>
              <th className="px-4 py-3">{dict?.admin?.thEmail || 'Email'}</th>
              <th className="px-4 py-3">{dict?.admin?.thRole || 'Role'}</th>
              <th className="px-4 py-3">{dict?.admin?.thOwnedChars || 'Owned Chars'}</th>
              <th className="px-4 py-3">{dict?.admin?.thUnlockedPerks || 'Unlocked Perks'}</th>
              <th className="px-4 py-3">{dict?.admin?.thStatus || 'Status'}</th>
              <th className="px-4 py-3 text-right">{dict?.admin?.thActions || 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500 font-mono">
                  {loading ? (dict?.admin?.loading || 'Loading users...') : (dict?.admin?.noUsers || 'No users found matching query.')}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-900 dark:text-slate-100 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-500">#{u.id}</td>
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <UserAvatar user={u} size="xs" />
                    <span className="truncate max-w-[120px]">{u.username}</span>
                    {u.id === currentUserId && (
                      <span className="rounded-md bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        {dict?.admin?.you || 'You'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        u.role === 'admin'
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : 'bg-slate-200/80 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      {u.role === 'admin' && <Crown className="h-2.5 w-2.5" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-200">
                    {u.owned_characters_count ?? 0}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-200">
                    {u.unlocked_perks_count ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>{dict?.stats?.active || 'Active'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 font-semibold">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>{dict?.sidebar?.disabled || 'Disabled'}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggleRole(u)}
                        title={u.role === 'admin' ? (dict?.admin?.demote || 'Demote to User') : (dict?.admin?.promote || 'Promote to Admin')}
                        className="relative rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 hover:border-amber-500 hover:text-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-amber-500 dark:hover:text-amber-400 transition-colors shadow-sm cursor-pointer before:absolute before:-inset-2.5 before:content-['']"
                      >
                        <Crown className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleActive(u)}
                        title={u.is_active ? (dict?.admin?.disableAccount || 'Disable Account') : (dict?.admin?.enableAccount || 'Enable Account')}
                        className="relative rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 hover:border-cyan-500 hover:text-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-cyan-500 dark:hover:text-cyan-400 transition-colors shadow-sm cursor-pointer before:absolute before:-inset-2.5 before:content-['']"
                      >
                        <Lock className="h-3.5 w-3.5" />
                      </button>

                      {u.id !== currentUserId && (
                        <button
                          type="button"
                          onClick={() => onDeleteUser(u)}
                          title={dict?.admin?.deleteUserTitle || 'Delete User'}
                          className="relative rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors shadow-sm cursor-pointer before:absolute before:-inset-2.5 before:content-['']"
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
          <span className="text-slate-600 dark:text-slate-400">
            {dict?.pagination?.showing || 'Showing'} {(page - 1) * 15 + 1} {dict?.pagination?.to || 'to'} {Math.min(page * 15, totalUsers)} {dict?.pagination?.of || 'of'} {totalUsers}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{dict?.pagination?.previous || 'Previous'}</span>
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page * 15 >= totalUsers}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
            >
              <span>{dict?.pagination?.next || 'Next'}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
