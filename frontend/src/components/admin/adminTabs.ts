// frontend/src/components/admin/adminTabs.ts
const ADMIN_TABS = ['users', 'reports', 'availability', 'audit', 'settings', 'tools'] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];

export const isAdminTab = (value: string): value is AdminTab => (ADMIN_TABS as readonly string[]).includes(value);
/** localStorage key remembering the open tab across refreshes. */
export const ADMIN_TAB_STORAGE_KEY = 'lemondbd_admin_tab';

/** The two report queues behind the Reports tab. */
export type ReportQueue = 'bugs' | 'content';
export const isReportQueue = (value: string): value is ReportQueue => value === 'bugs' || value === 'content';
/** localStorage key remembering the open report queue. */
export const REPORT_QUEUE_STORAGE_KEY = 'lemondbd_admin_queue';
