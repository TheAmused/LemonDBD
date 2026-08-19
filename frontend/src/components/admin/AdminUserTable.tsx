'use client';
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

