// frontend/src/components/admin/adminTabs.ts
const ADMIN_TABS = ['users', 'reports', 'availability', 'audit', 'settings', 'tools'] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];

export const isAdminTab = (value: string): value is AdminTab => (ADMIN_TABS as readonly string[]).includes(value);

/** The two report queues behind the Reports tab. */
export type ReportQueue = 'bugs' | 'content';
export const isReportQueue = (value: string): value is ReportQueue => value === 'bugs' || value === 'content';
