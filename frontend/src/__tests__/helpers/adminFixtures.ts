// frontend/src/__tests__/helpers/adminFixtures.ts
//
// Sample accounts and a network-free user directory for the admin panel tests.
import React from 'react';
import { AdminUsersSection } from '@/components/admin/AdminUsersSection';
import type { AdminUsersDirectory } from '@/components/admin/useAdminUsers';
import type { AdminOverview, UserRow } from '@/types/admin';
import { renderWithDictionary } from './renderWithDictionary';

export const sampleUsers: UserRow[] = [
  {
    id: 1,
    login: 'sign_in_42',
    username: 'lemon_admin',
    email: 'lemon@example.com',
    role: 'admin',
    is_active: true,
    is_verified: true,
    created_at: new Date('2026-01-01').toISOString(),
    owned_characters_count: 12,
    unlocked_perks_count: 34,
  },
  {
    id: 2,
    login: 'player_7',
    username: 'player_seven',
    email: 'seven@example.com',
    role: 'user',
    is_active: true,
    is_verified: false,
    two_factor_enabled: true,
    created_at: new Date('2026-02-01').toISOString(),
    owned_characters_count: 3,
    unlocked_perks_count: 9,
  },
];

const noop = () => {};
const asyncOk = async () => true;

/** A user directory as useAdminUsers returns it, without the network. */
export function fakeDirectory(overrides: Partial<AdminUsersDirectory> = {}): AdminUsersDirectory {
  return {
    users: sampleUsers,
    total: sampleUsers.length,
    loading: false,
    page: 1,
    setPage: noop,
    perPage: 15,
    setPerPage: noop,
    search: '',
    setSearch: noop,
    role: 'all',
    setRole: noop,
    standing: 'all',
    setStanding: noop,
    showOnly: noop,
    reload: noop,
    create: asyncOk,
    update: asyncOk,
    remove: asyncOk,
    resetTwoFactor: asyncOk,
    ...overrides,
  };
}

export const counts: AdminOverview['users'] = { total: 80, admins: 1, players: 79, active: 77, suspended: 2, banned: 1 };

export function renderUsers(overrides: Partial<AdminUsersDirectory> = {}, currentUserId = 999) {
  return renderWithDictionary(
    React.createElement(AdminUsersSection, {
      directory: fakeDirectory(overrides),
      counts,
      currentUserId,
      notify: noop,
      onCreate: noop,
      onEdit: noop,
      onModerate: noop,
    })
  );
}

