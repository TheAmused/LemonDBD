// frontend/src/components/admin/adminTabs.ts
export type AdminTab = 'users' | 'bugs' | 'challenges' | 'challenge_stats' | 'audit' | 'settings';

const ADMIN_TABS: readonly AdminTab[] = ['users', 'bugs', 'challenges', 'challenge_stats', 'audit', 'settings'];
export const isAdminTab = (value: string): value is AdminTab => (ADMIN_TABS as readonly string[]).includes(value);
/** localStorage key remembering the open tab across refreshes. */
export const ADMIN_TAB_STORAGE_KEY = 'lemondbd_admin_tab';
