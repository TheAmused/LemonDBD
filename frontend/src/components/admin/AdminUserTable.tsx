'use client';
// frontend/src/components/admin/AdminUserTable.tsx

import React from 'react';
import { Select, SearchInput } from '@/components/common/Field';
import { Button } from '@/components/common/Button';
import type { Dictionary } from '@/locales/types';
import {
  Users,
  UserPlus,
  Lock,
  Trash2,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { UserRow } from '@/types/admin';
import { UserAvatar } from '@/components/UserAvatar';
import { OverseerEyeIcon } from '@/components/icons/DbdIcons';

import { tip } from '@/components/common/Tooltip';
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
          <h2 className="text-base font-black uppercase tracking-wider text-text-primary">
            {dict?.admin?.title || 'User Accounts'} ({totalUsers})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <SearchInput
            fieldSize="sm"
            wrapperClassName="flex-1 sm:w-64 sm:flex-initial"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={dict?.admin?.searchUserPlaceholder || ''}
          />

          <Select
            fieldSize="sm"
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
            className="w-auto [&>option]:bg-bg-surface [&>option]:text-text-primary"
          >
            <option value="all">{dict?.admin?.allRoles || 'All Roles'}</option>
            <option value="admin">{dict?.admin?.admins || 'Admins'}</option>
            <option value="user">{dict?.admin?.standardUsers || 'Standard Users'}</option>
          </Select>

          <Button
            variant="primary"
            size="sm"
            onClick={onOpenCreateUser}
            leftIcon={<UserPlus className="h-3.5 w-3.5" />}
          >
            <span>{dict?.admin?.createUser || 'Create User'}</span>
          </Button>
        </div>
      </div>

      {/* Mobile view */}
      <div className="sm:hidden space-y-3 w-full">
        {users.length === 0 ? (
          <div className="rounded-2xl border border-border-color bg-bg-primary py-8 text-center text-xs text-text-muted">
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
                        <span className="shrink-0 rounded-md bg-accent-amber/15 border border-accent-amber/30 px-1.5 py-0.5 text-micro font-black uppercase tracking-wider text-accent-amber">
                          {dict?.admin?.you || 'You'}
                        </span>
                      )}
                    </div>
                    <span className="block type-caption text-text-muted truncate">{u.email}</span>
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-tiny font-black uppercase tracking-wider border ${
                    u.role === 'admin'
                      ? 'bg-accent-red/15 text-accent-red border-accent-red/30'
                      : 'bg-bg-elevated text-text-secondary border-border-color'
                  }`}
                >
                  {u.role === 'admin' && <OverseerEyeIcon className="h-2.5 w-2.5" />}
                  {u.role}
                </span>
              </div>

              <div className="flex items-center justify-between type-caption text-text-secondary">
                <span>#{u.id}</span>
                <span>{dict?.admin?.thOwnedChars || 'Owned Chars'}: {u.owned_characters_count ?? 0}</span>
                <span>{dict?.admin?.thUnlockedPerks || 'Unlocked Perks'}: {u.unlocked_perks_count ?? 0}</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border-color">
                {u.is_active ? (
                  <span className="inline-flex items-center gap-1 type-strong-xs text-accent-green">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{dict?.stats?.active || 'Active'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 type-strong-xs text-accent-red">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>{dict?.sidebar?.disabled || 'Disabled'}</span>
                  </span>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onToggleRole(u)}
                    {...tip(u.role === 'admin' ? dict?.admin?.demote || 'Demote' : dict?.admin?.promote || 'Promote', undefined, 'action')}
                    aria-label={u.role === 'admin' ? dict?.admin?.demote || 'Demote' : dict?.admin?.promote || 'Promote'}
                    className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-border-color bg-bg-surface text-text-primary hover:border-accent-amber hover:text-accent-amber transition-colors shadow-xs cursor-pointer"
                  >
                    <OverseerEyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleActive(u)}
                    {...tip(u.is_active ? dict?.admin?.disableAccount || 'Disable' : dict?.admin?.enableAccount || 'Enable', undefined, 'action')}
                    aria-label={u.is_active ? dict?.admin?.disableAccount || 'Disable' : dict?.admin?.enableAccount || 'Enable'}
                    className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-border-color bg-bg-surface text-text-primary hover:border-accent-red hover:text-accent-red transition-colors shadow-xs cursor-pointer"
                  >
                    <Lock className="h-4 w-4" />
                  </button>
                  {u.id !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => onDeleteUser(u)}
                      {...tip(dict?.admin?.deleteUserTitle || 'Delete', undefined, 'action')}
                      aria-label={dict?.admin?.deleteUserTitle || 'Delete'}
                      className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-accent-red/30 bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-colors shadow-xs cursor-pointer"
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
          <thead className="border-b border-border-color bg-bg-elevated type-label-2xs text-text-secondary">
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
                <td colSpan={8} className="py-8 text-center text-text-muted">
                  {loading ? dict?.admin?.loading || 'Loading...' : dict?.admin?.noUsers || 'No users found.'}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-bg-elevated/60 text-text-primary transition-colors">
                  <td className="px-4 py-3 text-text-muted">#{u.id}</td>
                  <td className="px-4 py-3 font-bold text-text-primary flex items-center gap-2">
                    <UserAvatar user={u} size="xs" />
                    <span className="truncate max-w-[120px]">{u.username}</span>
                    {u.id === currentUserId && (
                      <span className="rounded-md bg-accent-amber/15 border border-accent-amber/30 px-1.5 py-0.5 text-micro font-black uppercase tracking-wider text-accent-amber">
                        {dict?.admin?.you || 'You'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-tiny font-black uppercase tracking-wider border ${
                        u.role === 'admin'
                          ? 'bg-accent-red/15 text-accent-red border-accent-red/30'
                          : 'bg-bg-elevated text-text-secondary border-border-color'
                      }`}
                    >
                      {u.role === 'admin' && <OverseerEyeIcon className="h-2.5 w-2.5" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-primary">
                    {u.owned_characters_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-text-primary">
                    {u.unlocked_perks_count ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 type-strong-xs text-accent-green">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>{dict?.stats?.active || 'Active'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 type-strong-xs text-accent-red">
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
                        {...tip(u.role === 'admin' ? dict?.admin?.demote || 'Demote' : dict?.admin?.promote || 'Promote', undefined, 'action')}
                        aria-label={u.role === 'admin' ? dict?.admin?.demote || 'Demote' : dict?.admin?.promote || 'Promote'}
                        className="relative rounded-lg border border-border-color bg-bg-surface p-1.5 text-text-primary hover:border-accent-amber hover:text-accent-amber transition-colors shadow-xs cursor-pointer before:absolute before:-inset-2.5 before:content-['']"
                      >
                        <OverseerEyeIcon className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleActive(u)}
                        {...tip(u.is_active ? dict?.admin?.disableAccount || 'Disable' : dict?.admin?.enableAccount || 'Enable', undefined, 'action')}
                        aria-label={u.is_active ? dict?.admin?.disableAccount || 'Disable' : dict?.admin?.enableAccount || 'Enable'}
                        className="relative rounded-lg border border-border-color bg-bg-surface p-1.5 text-text-primary hover:border-accent-red hover:text-accent-red transition-colors shadow-xs cursor-pointer before:absolute before:-inset-2.5 before:content-['']"
                      >
                        <Lock className="h-3.5 w-3.5" />
                      </button>

                      {u.id !== currentUserId && (
                        <button
                          type="button"
                          onClick={() => onDeleteUser(u)}
                          {...tip(dict?.admin?.deleteUserTitle || 'Delete', undefined, 'action')}
                          aria-label={dict?.admin?.deleteUserTitle || 'Delete'}
                          className="relative rounded-lg border border-accent-red/30 bg-accent-red/10 p-1.5 text-accent-red hover:bg-accent-red/20 transition-colors shadow-xs cursor-pointer before:absolute before:-inset-2.5 before:content-['']"
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
            <Button
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              <span>{dict?.pagination?.previous || 'Previous'}</span>
            </Button>
            <Button
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page * 15 >= totalUsers}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              <span>{dict?.pagination?.next || 'Next'}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

