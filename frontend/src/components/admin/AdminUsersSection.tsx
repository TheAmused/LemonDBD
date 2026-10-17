'use client';
// frontend/src/components/admin/AdminUsersSection.tsx
//
// The user directory: search and filters (their options carry the counts), the accounts, and the
// actions on one account. Moderation is the row's main action; the rest sit in its "⋯" menu.
import React, { useState } from 'react';
import { Download, Gavel, Pencil, ShieldCheck, ShieldOff, Trash2, UserPlus } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ActionMenu, type ActionMenuItem } from '@/components/common/ActionMenu';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { EmptyState } from '@/components/common/EmptyState';
import { CustomDropdown } from '@/components/common/CustomDropdown';
import { SearchInput } from '@/components/common/Field';
import { Pagination } from '@/components/common/Pagination';
import { Surface } from '@/components/common/Surface';
import { tip } from '@/components/common/Tooltip';
import { OverseerEyeIcon } from '@/components/icons/DbdIcons';
import { UserAvatar } from '@/components/UserAvatar';
import { UserStandingBadge } from '@/components/admin/UserStandingBadge';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { downloadAccountData } from '@/services/userProfileApi';
import { getErrorMessage } from '@/utils/api';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';
import { formatMessage } from '@/utils/i18nFormat';
import type { AdminUsersDirectory } from '@/components/admin/useAdminUsers';
import type { ActionMessage, AdminOverview, UserRoleFilter, UserRow, UserStandingFilter } from '@/types/admin';

interface AdminUsersSectionProps {
  directory: AdminUsersDirectory;
  counts: AdminOverview['users'] | null;
  currentUserId?: number;
  notify: (message: ActionMessage) => void;
  onCreate: () => void;
  onEdit: (user: UserRow) => void;
  onModerate: (user: UserRow) => void;
}

type PendingAction = { kind: 'delete' | 'resetTwoFactor'; user: UserRow } | null;

export function AdminUsersSection({ directory, counts, currentUserId, notify, onCreate, onEdit, onModerate }: AdminUsersSectionProps) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.admin;
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const { users, total, loading, page, perPage } = directory;

  const count = (n: number | undefined) => ({ count: n ?? '–' });
  const isSelf = (u: UserRow) => u.id === currentUserId;
  // Administrators and your own account cannot be moderated (the server refuses both too).
  const canModerate = (u: UserRow) => u.role !== 'admin' && !isSelf(u);

  const download = async (u: UserRow) => {
    try {
      await downloadAccountData(u.id);
    } catch (err: unknown) {
      notify({ type: 'error', text: getErrorMessage(err, t.downloadUserDataFailed) });
    }
  };

  const menuItems = (u: UserRow): ActionMenuItem[] => [
    { key: 'edit', label: t.editUser, icon: <Pencil className="h-4 w-4" aria-hidden="true" />, onSelect: () => onEdit(u) },
    ...(u.two_factor_enabled
      ? [{ key: '2fa', label: t.resetTwoFactor, icon: <ShieldOff className="h-4 w-4" aria-hidden="true" />, onSelect: () => setPending({ kind: 'resetTwoFactor', user: u }) }]
      : []),
    { key: 'download', label: t.downloadUserData, icon: <Download className="h-4 w-4" aria-hidden="true" />, onSelect: () => void download(u) },
    ...(isSelf(u)
      ? []
      : [{ key: 'delete', label: t.deleteUser, icon: <Trash2 className="h-4 w-4" aria-hidden="true" />, onSelect: () => setPending({ kind: 'delete', user: u }), danger: true }]),
  ];

  const actions = (u: UserRow) => (
    <div className="flex items-center justify-end gap-1.5">
      {canModerate(u) && (
        <Button
          size="sm"
          icon
          onClick={() => onModerate(u)}
          aria-label={dict.moderation.admin.openButton}
          {...tip(dict.moderation.admin.openButton, undefined, 'action')}
        >
          <Gavel className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
      <ActionMenu label={formatMessage(t.userActions, { username: u.username })} items={menuItems(u)} />
    </div>
  );

  const identity = (u: UserRow) => (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar user={u} size="sm" showAdminBadge={false} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate type-strong text-text-primary">{u.username}</span>
          <span className="truncate type-caption text-text-muted">@{u.login}</span>
          {isSelf(u) && <Badge tone="amber" size="xs" square>{t.you}</Badge>}
        </div>
        <p className="truncate type-caption text-text-muted">{u.email}</p>
      </div>
    </div>
  );

  const status = (u: UserRow) => (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <UserStandingBadge user={u} />
      {u.two_factor_enabled && (
        <span {...tip(t.twoFactorOn, undefined, 'status')} className="inline-flex items-center gap-1 type-strong-xs text-accent-green">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t.twoFactorBadge}
        </span>
      )}
      {u.is_verified === false && (
        <span {...tip(t.unverifiedTip, undefined, 'status')} className="type-strong-xs text-accent-amber">
          {t.unverifiedBadge}
        </span>
      )}
    </div>
  );

  const role = (u: UserRow) => (
    <Badge tone={u.role === 'admin' ? 'red' : 'neutral'} size="sm" square icon={u.role === 'admin' ? <OverseerEyeIcon className="h-2.5 w-2.5" /> : undefined}>
      {u.role === 'admin' ? t.roleAdmin : t.rolePlayer}
    </Badge>
  );

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === 'delete') await directory.remove(pending.user);
      else await directory.resetTwoFactor(pending.user);
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  return (
    <Surface padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border-color p-3 sm:p-4">
        <SearchInput
          fieldSize="sm"
          wrapperClassName="min-w-[12rem] flex-1"
          value={directory.search}
          onChange={(e) => directory.setSearch(e.target.value)}
          placeholder={t.searchUserPlaceholder}
          aria-label={t.searchUserPlaceholder}
        />
        <CustomDropdown<UserRoleFilter>
          ariaLabel={t.thRole}
          accent="primary"
          value={directory.role}
          onChange={directory.setRole}
          buttonClassName="py-2"
          options={[
            { value: 'all', label: formatMessage(t.roleFilterAll, count(counts?.total)) },
            { value: 'admin', label: formatMessage(t.roleFilterAdmins, count(counts?.admins)) },
            { value: 'user', label: formatMessage(t.roleFilterPlayers, count(counts?.players)) },
          ]}
        />
        <CustomDropdown<UserStandingFilter>
          ariaLabel={t.thStanding}
          accent="primary"
          value={directory.standing}
          onChange={directory.setStanding}
          buttonClassName="py-2"
          options={[
            { value: 'all', label: t.standingFilterAll },
            { value: 'active', label: formatMessage(t.standingFilterActive, count(counts?.active)) },
            { value: 'suspended', label: formatMessage(t.standingFilterSuspended, count(counts?.suspended)) },
            { value: 'banned', label: formatMessage(t.standingFilterBanned, count(counts?.banned)) },
          ]}
        />
        <Button variant="primary" size="sm" onClick={onCreate} leftIcon={<UserPlus className="h-3.5 w-3.5" aria-hidden="true" />}>
          {t.createUser}
        </Button>
      </div>

      {users.length === 0 ? (
        <EmptyState variant="inline" title={loading ? t.loading : t.noUsers} />
      ) : (
        <div className={cn('transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
          {/* Phones: one card per account */}
          <ul className="divide-y divide-border-subtle sm:hidden">
            {users.map((u) => (
              <li key={u.id} className="space-y-3 p-3">
                <div className="flex items-start justify-between gap-2">
                  {identity(u)}
                  {role(u)}
                </div>
                <div className="flex items-center justify-between gap-2">
                  {status(u)}
                  {actions(u)}
                </div>
              </li>
            ))}
          </ul>

          {/* Wider screens: the table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left text-xs text-text-primary">
              <thead className="border-b border-border-color bg-bg-elevated/60 type-label-2xs text-text-secondary">
                <tr>
                  <th scope="col" className="px-4 py-2.5">{t.thUser}</th>
                  <th scope="col" className="px-4 py-2.5">{t.thRole}</th>
                  <th scope="col" className="px-4 py-2.5">{t.thStanding}</th>
                  <th scope="col" className="hidden px-4 py-2.5 text-right lg:table-cell">{t.thCharacters}</th>
                  <th scope="col" className="hidden px-4 py-2.5 text-right lg:table-cell">{t.thPerks}</th>
                  <th scope="col" className="hidden px-4 py-2.5 xl:table-cell">{t.thJoined}</th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    <span className="sr-only">{t.thActions}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-bg-elevated/40">
                    <td className="max-w-[18rem] px-4 py-2.5">{identity(u)}</td>
                    <td className="px-4 py-2.5">{role(u)}</td>
                    <td className="px-4 py-2.5">{status(u)}</td>
                    <td className="hidden px-4 py-2.5 text-right tabular-nums lg:table-cell">{u.owned_characters_count ?? 0}</td>
                    <td className="hidden px-4 py-2.5 text-right tabular-nums lg:table-cell">{u.unlocked_perks_count ?? 0}</td>
                    <td className="hidden whitespace-nowrap px-4 py-2.5 text-text-secondary xl:table-cell">{formatDate(u.created_at, locale)}</td>
                    <td className="px-4 py-2.5">{actions(u)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {total > 0 && (
        <Pagination
          className="mt-0 border-t border-border-color px-3 py-2.5 sm:mt-0 sm:px-4 sm:pt-2.5 lg:pt-2.5 wide:pt-2.5"
          page={page}
          totalPages={Math.ceil(total / perPage)}
          totalResults={total}
          limit={perPage}
          onPageChange={directory.setPage}
          onLimitChange={directory.setPerPage}
        />
      )}

      <ConfirmModal
        open={pending !== null}
        title={pending?.kind === 'delete' ? t.deleteUserTitle : t.resetTwoFactorTitle}
        message={formatMessage(pending?.kind === 'delete' ? t.confirmDeleteUser : t.resetTwoFactorMessage, { username: pending?.user.username ?? '' })}
        confirmLabel={pending?.kind === 'delete' ? t.delete : t.resetTwoFactorConfirm}
        cancelLabel={t.cancel}
        busy={busy}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </Surface>
  );
}
