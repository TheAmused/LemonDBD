// frontend/src/components/admin/useAdminUsers.ts
import { useCallback, useState } from 'react';
import { getBackendBaseUrl, authHeaders, getAuthToken, getErrorMessage } from '@/utils/api';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import type { ActionMessage, AdminStats, UserRow } from '@/types/admin';

interface AdminUsersInput {
  onActionMessage: (message: ActionMessage | null) => void;
  onUserCreated: () => void;
}

/** The admin user directory: stats, paged/filtered list, and the actions on a user. */
export function useAdminUsers({ onActionMessage, onUserCreated }: AdminUsersInput) {
  const dict = useDictionary();
  const API_BASE = getBackendBaseUrl();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [userPendingDeletion, setUserPendingDeletion] = useState<UserRow | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);

  const fetchAdminData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    setLoadingData(true);
    try {
      const timestamp = Date.now();
      const statsRes = await fetch(`${API_BASE}/api/v1/admin/stats?_t=${timestamp}`, {
        headers: {
          ...authHeaders(token),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        cache: 'no-store',
      });
      if (statsRes.ok) {
        const sData: AdminStats = await statsRes.json();
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
          ...authHeaders(token),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        cache: 'no-store',
      });
      if (usersRes.ok) {
        const uData: { users: UserRow[]; total: number } = await usersRes.json();
        setUsers(uData.users || []);
        setTotalUsers(uData.total || 0);
      }
    } catch (err: unknown) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [API_BASE, page, roleFilter, search]);

  const handleToggleRole = async (targetUser: UserRow) => {
    const token = getAuthToken();
    if (!token) return;

    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${targetUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        onActionMessage({
          type: 'success',
          text: dict.admin.roleUpdated
            ? formatMessage(dict.admin.roleUpdated, { username: targetUser.username, role: newRole.toUpperCase() })
            : `${targetUser.username} role updated to ${newRole.toUpperCase()}.`,
        });
        await fetchAdminData();
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err, dict.admin.networkError);
      onActionMessage({ type: 'error', text: msg });
    }
  };

  const handleToggleActive = async (targetUser: UserRow) => {
    const token = getAuthToken();
    if (!token) return;

    const newActive = !targetUser.is_active;
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${targetUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify({ is_active: newActive }),
      });
      if (res.ok) {
        onActionMessage({
          type: 'success',
          text: newActive
            ? formatMessage(dict.admin.statusUpdatedActive, { username: targetUser.username }) || `${targetUser.username} is active.`
            : formatMessage(dict.admin.statusUpdatedSuspended, { username: targetUser.username }) || `${targetUser.username} is suspended.`,
        });
        await fetchAdminData();
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err, dict.admin.networkError);
      onActionMessage({ type: 'error', text: msg });
    }
  };

  const handleDeleteUser = (targetUser: UserRow) => {
    setUserPendingDeletion(targetUser);
  };

  const confirmDeleteUser = async () => {
    const targetUser = userPendingDeletion;
    if (!targetUser || isDeletingUser) return;
    const token = getAuthToken();
    if (!token) return;

    setIsDeletingUser(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${targetUser.id}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      if (res.ok) {
        onActionMessage({
          type: 'success',
          text: formatMessage(dict.admin.userDeletedSuccess, { username: targetUser.username }) || `${targetUser.username} deleted.`,
        });
        await fetchAdminData();
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err, dict.admin.networkError);
      onActionMessage({ type: 'error', text: msg });
    } finally {
      setIsDeletingUser(false);
      setUserPendingDeletion(null);
    }
  };

  const handleCreateUser = async (userData: {
    username: string;
    email: string;
    password: string;
    role: 'user' | 'admin';
  }) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify(userData),
      });

      if (res.ok) {
        onActionMessage({
          type: 'success',
          text: formatMessage(dict.admin.userCreatedSuccess, { username: userData.username }) || `${userData.username} created successfully.`,
        });
        onUserCreated();
        await fetchAdminData();
      } else {
        const errorData: { error?: string } = await res.json().catch(() => ({}));
        onActionMessage({
          type: 'error',
          text: errorData.error || dict.admin.userCreateFailed,
        });
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err, dict.admin.networkError);
      onActionMessage({ type: 'error', text: msg });
    }
  };

  return {
    stats,
    users,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    page,
    setPage,
    totalUsers,
    loadingData,
    fetchAdminData,
    userPendingDeletion,
    setUserPendingDeletion,
    isDeletingUser,
    handleToggleRole,
    handleToggleActive,
    handleDeleteUser,
    confirmDeleteUser,
    handleCreateUser,
  };
}
