'use client';
// frontend/src/components/admin/AdminUserTable.tsx

import React from 'react';
import type { Dictionary } from '@/locales/types';
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
    <div className="rounded-3xl border border-border-color bg-bg-surface p-4 sm:p-6 backdrop-blur-xl shadow-xs space-y-6 w-full transition-colors duration-200">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border-color">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-accent-amber" />
          <h2 className="text-base font-black uppercase tracking-wider text-text-primary font-mono">
            {dict?.admin?.title || 'User Accounts'} ({totalUsers})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={dict?.admin?.searchUserPlaceholder || ''}
              className="w-full sm:w-64 rounded-xl border border-border-color bg-bg-primary py-2 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-amber focus:outline-none shadow-inner"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
            className="rounded-xl border border-border-color bg-bg-primary py-2 px-3 text-xs text-text-primary focus:border-accent-amber focus:outline-none cursor-pointer shadow-inner [&>option]:bg-bg-surface [&>option]:text-text-primary"
          >
            <option value="all">{dict?.admin?.allRoles || 'All Roles'}</option>
            <option value="admin">{dict?.admin?.admins || 'Admins'}</option>
            <option value="user">{dict?.admin?.standardUsers || 'Standard Users'}</option>
          </select>

          <button
            type="button"
            onClick={onOpenCreateUser}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-amber to-accent-amber-hover px-3.5 py-2 text-xs font-bold text-text-inverted shadow-md shadow-accent-amber/20 hover:scale-105 active:scale-95 transition-all cursor-pointer font-sans"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>{dict?.admin?.createUser || 'Create User'}</span>
          </button>
        </div>
      </div>

      {/* Mobile view */}
      <div className="sm:hidden space-y-3 w-full">
        {users.length === 0 ? (
          <div className="rounded-2xl border border-border-color bg-bg-primary py-8 text-center text-xs text-text-muted font-mono">
            {loading ? dict?.admin?.loading || 'Loading...' : dict?.admin?.noUsers || 'No users found.'}
          </div>
        ) : (
          users.map((u) => (
            <div key={u.id} className="rounded-2xl border border-border-color bg-bg-primary p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <UserAvatar user={u} size="xs" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-text-primary truncate">{u.username}</span>
                      {u.id === currentUserId && (
                        <span className="shrink-0 rounded-md bg-accent-amber/15 border border-accent-amber/30 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-accent-amber">
                          {dict?.admin?.you || 'You'}
                        </span>
                      )}
                    </div>
                    <span className="block text-[11px] text-text-muted font-mono truncate">{u.email}</span>
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                    u.role === 'admin'
                      ? 'bg-accent-red/15 text-accent-red border-accent-red/30'
                      : 'bg-bg-elevated text-text-secondary border-border-color'
                  }`}
                >
                  {u.role === 'admin' && <Crown className="h-2.5 w-2.5" />}
                  {u.role}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-text-secondary font-mono">
                <span>#{u.id}</span>
                <span>{dict?.admin?.thOwnedChars || 'Owned Chars'}: {u.owned_characters_count ?? 0}</span>
                <span>{dict?.admin?.thUnlockedPerks || 'Unlocked Perks'}: {u.unlocked_perks_count ?? 0}</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border-color">
                {u.is_active ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{dict?.stats?.active || 'Active'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-400 font-semibold">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>{dict?.sidebar?.disabled || 'Disabled'}</span>
                  </span>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onToggleRole(u)}
                    title={u.role === 'admin' ? dict?.admin?.demote || 'Demote' : dict?.admin?.promote || 'Promote'}
                    aria-label={u.role === 'admin' ? dict?.admin?.demote || 'Demote' : dict?.admin?.promote || 'Promote'}
                    className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-border-color bg-bg-surface text-text-primary hover:border-accent-amber hover:text-accent-amber transition-colors shadow-xs cursor-pointer"
                  >
                    <Crown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleActive(u)}
                    title={u.is_active ? dict?.admin?.disableAccount || 'Disable' : dict?.admin?.enableAccount || 'Enable'}
                    aria-label={u.is_active ? dict?.admin?.disableAccount || 'Disable' : dict?.admin?.enableAccount || 'Enable'}
                    className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-border-color bg-bg-surface text-text-primary hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors shadow-xs cursor-pointer"
                  >
                    <Lock className="h-4 w-4" />
                  </button>
                  {u.id !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => onDeleteUser(u)}
                      title={dict?.admin?.deleteUserTitle || 'Delete'}
                      aria-label={dict?.admin?.deleteUserTitle || 'Delete'}
                      className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors shadow-xs cursor-pointer"
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

      {/* Desktop view */}
      <div className="hidden sm:block overflow-x-auto w-full">
        <table className="w-full text-left text-xs text-text-primary">
          <thead className="border-b border-border-color bg-bg-primary text-[10px] uppercase font-black tracking-wider text-text-secondary">
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
          <tbody className="divide-y divide-border-subtle">
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-text-muted font-mono">
                  {loading ? dict?.admin?.loading || 'Loading...' : dict?.admin?.noUsers || 'No users found.'}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-bg-elevated/60 text-text-primary transition-colors">
                  <td className="px-4 py-3 font-mono text-text-muted">#{u.id}</td>
                  <td className="px-4 py-3 font-bold text-text-primary flex items-center gap-2">
                    <UserAvatar user={u} size="xs" />
                    <span className="truncate max-w-[120px]">{u.username}</span>
                    {u.id === currentUserId && (
                      <span className="rounded-md bg-accent-amber/15 border border-accent-amber/30 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-accent-amber">
                        {dict?.admin?.you || 'You'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary font-mono">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                        u.role === 'admin'
                          ? 'bg-accent-red/15 text-accent-red border-accent-red/30'
                          : 'bg-bg-elevated text-text-secondary border-border-color'
                      }`}
                    >
                      {u.role === 'admin' && <Crown className="h-2.5 w-2.5" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-text-primary">
                    {u.owned_characters_count ?? 0}
                  </td>
                  <td className="px-4 py-3 font-mono text-text-primary">
                    {u.unlocked_perks_count ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>{dict?.stats?.active || 'Active'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-400 font-semibold">
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
                        title={u.role === 'admin' ? dict?.admin?.demote || 'Demote' : dict?.admin?.promote || 'Promote'}
                        aria-label={u.role === 'admin' ? dict?.admin?.demote || 'Demote' : dict?.admin?.promote || 'Promote'}
                        className="relative rounded-lg border border-border-color bg-bg-surface p-1.5 text-text-primary hover:border-accent-amber hover:text-accent-amber transition-colors shadow-xs cursor-pointer before:absolute before:-inset-2 before:content-['']"
                      >
                        <Crown className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleActive(u)}
                        title={u.is_active ? dict?.admin?.disableAccount || 'Disable' : dict?.admin?.enableAccount || 'Enable'}
                        aria-label={u.is_active ? dict?.admin?.disableAccount || 'Disable' : dict?.admin?.enableAccount || 'Enable'}
                        className="relative rounded-lg border border-border-color bg-bg-surface p-1.5 text-text-primary hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors shadow-xs cursor-pointer before:absolute before:-inset-2 before:content-['']"
                      >
                        <Lock className="h-3.5 w-3.5" />
                      </button>

                      {u.id !== currentUserId && (
                        <button
                          type="button"
                          onClick={() => onDeleteUser(u)}
                          title={dict?.admin?.deleteUserTitle || 'Delete'}
                          aria-label={dict?.admin?.deleteUserTitle || 'Delete'}
                          className="relative rounded-lg border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 p-1.5 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors shadow-xs cursor-pointer before:absolute before:-inset-2 before:content-['']"
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
        <div className="flex items-center justify-between pt-4 border-t border-border-color text-xs">
          <span className="text-text-secondary">
            {dict?.pagination?.showing || 'Showing'} {(page - 1) * 15 + 1} {dict?.pagination?.to || 'to'} {Math.min(page * 15, totalUsers)} {dict?.pagination?.of || 'of'} {totalUsers}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-xl border border-border-color bg-bg-surface px-3 py-1.5 font-semibold text-text-primary disabled:opacity-40 hover:bg-bg-elevated transition-colors cursor-pointer shadow-xs"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{dict?.pagination?.previous || 'Previous'}</span>
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page * 15 >= totalUsers}
              className="flex items-center gap-1 rounded-xl border border-border-color bg-bg-surface px-3 py-1.5 font-semibold text-text-primary disabled:opacity-40 hover:bg-bg-elevated transition-colors cursor-pointer shadow-xs"
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

