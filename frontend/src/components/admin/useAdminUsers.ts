'use client';
// frontend/src/components/admin/useAdminUsers.ts
//
// The user directory: the filtered, paged list and every account action an admin takes from it.
// `notify` receives the outcome; `onChanged` runs after anything that changes the panel's counts.
import { useCallback, useEffect, useState } from 'react';
import { ADMIN_STORAGE, USER_ROLE_FILTERS, USER_STANDING_FILTERS, oneOf } from '@/components/admin/adminStorage';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, lastPage } from '@/constants/pagination';
import { SEARCH_DEBOUNCE_MS } from '@/constants/timing';
import { useDictionary } from '@/context/DictionaryContext';
import { usePersistentNumber } from '@/hooks/usePersistentNumber';
import { usePersistentString } from '@/hooks/usePersistentString';
import { createUser, deleteUser, listUsers, resetTwoFactor, updateUser } from '@/services/adminApi';
import { getErrorMessage } from '@/utils/api';
import { formatMessage } from '@/utils/i18nFormat';
import type { ActionMessage, NewUser, Reauth, UserPatch, UserRoleFilter, UserRow, UserStandingFilter } from '@/types/admin';


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
  // The filters and the page size are remembered; the search text and the page number are not.
  const [role, setRoleState] = usePersistentString<UserRoleFilter>(ADMIN_STORAGE.usersRole, 'all', oneOf(USER_ROLE_FILTERS));
  const [standing, setStandingState] = usePersistentString<UserStandingFilter>(ADMIN_STORAGE.usersStanding, 'all', oneOf(USER_STANDING_FILTERS));
  const [page, setPage] = useState(1);
  const [perPage, setPerPageState] = usePersistentNumber<number>(ADMIN_STORAGE.usersPerPage, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS);
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
        const list = data.users ?? [];
        const count = data.total ?? 0;
        // The last row of the last page was deleted (or filtered away): step back to the new last page.
        if (list.length === 0 && page > 1 && count > 0) {
          setPage(lastPage(count, perPage));
          return;
        }
        setUsers(list);
        setTotal(count);
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
    resetTwoFactor: (user: UserRow, reauth?: Reauth) =>
      act(() => resetTwoFactor(user.id, reauth), formatMessage(t.twoFactorResetDone, { username: user.username })),
  };
}

export type AdminUsersDirectory = ReturnType<typeof useAdminUsers>;
