'use client';
// frontend/src/components/admin/useAdminUsers.ts
//
// The user directory: the filtered, paged list and every account action an admin takes from it.
// `notify` receives the outcome; `onChanged` runs after anything that changes the panel's counts.
import { useCallback, useEffect, useState } from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import { createUser, deleteUser, listUsers, resetTwoFactor, updateUser } from '@/services/adminApi';
import { getErrorMessage } from '@/utils/api';
import { formatMessage } from '@/utils/i18nFormat';
import type { ActionMessage, NewUser, UserPatch, UserRoleFilter, UserRow, UserStandingFilter } from '@/types/admin';

const SEARCH_DEBOUNCE_MS = 300;
const USER_PAGE_SIZE = 15;

interface AdminUsersInput {
  enabled: boolean;
  refreshKey: number;
  notify: (message: ActionMessage) => void;
  onChanged: () => void;
}

export function useAdminUsers({ enabled, refreshKey, notify, onChanged }: AdminUsersInput) {
  const t = useDictionary().admin;
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearchState] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRoleState] = useState<UserRoleFilter>('all');
  const [standing, setStandingState] = useState<UserStandingFilter>('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPageState] = useState(USER_PAGE_SIZE);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    listUsers({
      page,
      per_page: perPage,
      search: debouncedSearch,
      role: role === 'all' ? undefined : role,
      standing: standing === 'all' ? undefined : standing,
    })
      .then((data) => {
        if (cancelled) return;
        setUsers(data.users ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((err: unknown) => {
        if (!cancelled) notify({ type: 'error', text: getErrorMessage(err, t.networkError) });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, page, perPage, debouncedSearch, role, standing, refreshKey, reloadKey, notify, t.networkError]);

  /** Every filter change starts again at page 1. */
  const filterSetter = <V,>(set: (value: V) => void) => (value: V) => {
    set(value);
    setPage(1);
  };

  /** Runs an account action, reports it, then reloads the list and the panel's counts. */
  const act = useCallback(
    async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
      try {
        await action();
        notify({ type: 'success', text: success });
        setReloadKey((k) => k + 1);
        onChanged();
        return true;
      } catch (err: unknown) {
        notify({ type: 'error', text: getErrorMessage(err, t.networkError) });
        return false;
      }
    },
    [notify, onChanged, t.networkError]
  );

  return {
    users,
    total,
    loading,
    page,
    setPage,
    perPage,
    setPerPage: filterSetter(setPerPageState),
    search,
    setSearch: filterSetter(setSearchState),
    role,
    setRole: filterSetter(setRoleState),
    standing,
    setStanding: filterSetter(setStandingState),
    /** Shows one account: its login, email or name in the search box and every other filter cleared. */
    showOnly: (query: string) => {
      setRoleState('all');
      setStandingState('all');
      setSearchState(query);
      setDebouncedSearch(query);
      setPage(1);
    },
    reload: () => setReloadKey((k) => k + 1),
    create: (user: NewUser) => act(() => createUser(user), formatMessage(t.userCreatedSuccess, { username: user.username })),
    update: (user: UserRow, patch: UserPatch) => act(() => updateUser(user.id, patch), formatMessage(t.userUpdatedSuccess, { username: patch.username ?? user.username })),
    remove: (user: UserRow) => act(() => deleteUser(user.id), formatMessage(t.userDeletedSuccess, { username: user.username })),
    resetTwoFactor: (user: UserRow) => act(() => resetTwoFactor(user.id), formatMessage(t.twoFactorResetDone, { username: user.username })),
  };
}

export type AdminUsersDirectory = ReturnType<typeof useAdminUsers>;
