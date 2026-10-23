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
import { Table, TableBody, TableHead, TableRow, Td, Th } from '@/components/common/Table';
import { tip } from '@/components/common/Tooltip';
import { OverseerEyeIcon } from '@/components/icons/DbdIcons';
import { UserAvatar } from '@/components/UserAvatar';
import { UserStandingBadge } from '@/components/admin/UserStandingBadge';
import { EMPTY_REAUTH, ReauthFields, reauthBody, useReauthReady } from '@/components/admin/ReauthFields';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { downloadAccountData } from '@/services/userProfileApi';
import { getErrorMessage } from '@/utils/api';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';
import { formatMessage } from '@/utils/i18nFormat';
import type { AdminUsersDirectory } from '@/components/admin/useAdminUsers';
import type { ActionMessage, AdminOverview, Reauth, UserRoleFilter, UserRow, UserStandingFilter } from '@/types/admin';

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
  const [reauth, setReauth] = useState<Reauth>(EMPTY_REAUTH);
  const reauthReady = useReauthReady(reauth);
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
    { key: 'edit', label: t.editUser, icon: <Pencil className="icon-md" aria-hidden="true" />, onSelect: () => onEdit(u) },
    // Your own second factor is switched off on your profile (with your password and a code).
    ...(u.two_factor_enabled && !isSelf(u)
      ? [{ key: '2fa', label: t.resetTwoFactor, icon: <ShieldOff className="icon-md" aria-hidden="true" />, onSelect: () => setPending({ kind: 'resetTwoFactor', user: u }) }]
      : []),
    { key: 'download', label: t.downloadUserData, icon: <Download className="icon-md" aria-hidden="true" />, onSelect: () => void download(u) },
    // Admins are never deleted from here (the server refuses too): take the admin role away first.
    ...(isSelf(u) || u.role === 'admin'
      ? []
      : [{ key: 'delete', label: t.deleteUser, icon: <Trash2 className="icon-md" aria-hidden="true" />, onSelect: () => setPending({ kind: 'delete', user: u }), danger: true }]),
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
          <Gavel className="icon-md" aria-hidden="true" />
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
        <Badge tone="green" size="sm" plain icon={<ShieldCheck className="icon-sm" aria-hidden="true" />} {...tip(t.twoFactorOn, undefined, 'status')}>
          {t.twoFactorBadge}
        </Badge>
      )}
      {u.is_verified === false && (
        <Badge tone="amber" size="sm" plain {...tip(t.unverifiedTip, undefined, 'status')}>
          {t.unverifiedBadge}
        </Badge>
      )}
    </div>
  );

  const role = (u: UserRow) => (
    <Badge tone={u.role === 'admin' ? 'red' : 'neutral'} size="sm" square icon={u.role === 'admin' ? <OverseerEyeIcon className="icon-2xs" /> : undefined}>
      {u.role === 'admin' ? t.roleAdmin : t.rolePlayer}
    </Badge>
  );

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === 'delete') await directory.remove(pending.user);
      else await directory.resetTwoFactor(pending.user, needsOwnPassword ? reauthBody(reauth) : undefined);
    } finally {
      setBusy(false);
      setPending(null);
      setReauth(EMPTY_REAUTH);
    }
  };
  /** Resetting another admin's second factor needs the acting admin to re-authenticate. */
  const needsOwnPassword = pending?.kind === 'resetTwoFactor' && pending.user.role === 'admin' && !isSelf(pending.user);

  return (
    <Surface padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border-color p-3 sm:p-4">
        <SearchInput
          fieldSize="sm"
          wrapperClassName="min-w-field flex-1"
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
        <Button variant="primary" size="sm" onClick={onCreate} leftIcon={<UserPlus className="icon-sm" aria-hidden="true" />}>
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
          <Table wrapperClassName="hidden sm:block">
            <TableHead>
              <tr>
                <Th>{t.thUser}</Th>
                <Th>{t.thRole}</Th>
                <Th>{t.thStanding}</Th>
                <Th className="hidden text-right lg:table-cell">{t.thCharacters}</Th>
                <Th className="hidden text-right lg:table-cell">{t.thPerks}</Th>
                <Th className="hidden xl:table-cell">{t.thJoined}</Th>
                <Th className="text-right">
                  <span className="sr-only">{t.thActions}</span>
                </Th>
              </tr>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <Td className="max-w-cell">{identity(u)}</Td>
                  <Td>{role(u)}</Td>
                  <Td>{status(u)}</Td>
                  <Td className="hidden text-right tabular-nums lg:table-cell">{u.owned_characters_count ?? 0}</Td>
                  <Td className="hidden text-right tabular-nums lg:table-cell">{u.unlocked_perks_count ?? 0}</Td>
                  <Td className="hidden whitespace-nowrap text-text-secondary xl:table-cell">{formatDate(u.created_at, locale)}</Td>
                  <Td>{actions(u)}</Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > 0 && (
        <Pagination
          variant="embedded"
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
        message={
          <>
            {formatMessage(pending?.kind === 'delete' ? t.confirmDeleteUser : t.resetTwoFactorMessage, { username: pending?.user.username ?? '' })}
            {needsOwnPassword && (
              <div className="mt-3">
                <ReauthFields value={reauth} onChange={setReauth} hint={t.confirmOwnPasswordHint} disabled={busy} />
              </div>
            )}
          </>
        }
        confirmLabel={pending?.kind === 'delete' ? t.delete : t.resetTwoFactorConfirm}
        cancelLabel={t.cancel}
        busy={busy}
        confirmDisabled={needsOwnPassword && !reauthReady}
        onConfirm={() => { void confirm(); }}
        onCancel={() => {
          setPending(null);
          setReauth(EMPTY_REAUTH);
        }}
      />
    </Surface>
  );
}
