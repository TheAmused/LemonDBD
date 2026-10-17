// frontend/src/components/admin/adminStorage.ts
//
// Everything the admin panel remembers in this browser (localStorage), in one list: which tab is open,
// the filters and page sizes of each list, which fold-away sections are open. The panel is a working tool,
// so a refresh must put the admin back where they were.
//
// Deliberately NOT remembered: search text and page number (they go stale), the selected report or user
// (the row may be gone), "load images" in a report's evidence (each look at untrusted content is a fresh
// decision), and the "send e-mail" switch of a sanction (a remembered "no" would silence a notice by accident).
import type { UserRoleFilter, UserStandingFilter } from '@/types/admin';

/** Keys of the form `lemondbd_admin_<what>`; the moderation drawer keeps its older `lemondbd_moderation_` prefix. */
export const ADMIN_STORAGE = {
  tab: 'lemondbd_admin_tab',
  reportQueue: 'lemondbd_admin_queue',
  usersRole: 'lemondbd_admin_users_role',
  usersStanding: 'lemondbd_admin_users_standing',
  usersPerPage: 'lemondbd_admin_users_per_page',
  auditCategory: 'lemondbd_admin_audit_category',
  auditPerPage: 'lemondbd_admin_audit_per_page',
  bugsStatus: 'lemondbd_admin_bugs_status',
  contentStatus: 'lemondbd_admin_content_status',
  availabilityKind: 'lemondbd_admin_availability_kind',
  availabilityRole: 'lemondbd_admin_availability_role',
  availabilityDisabledOnly: 'lemondbd_admin_availability_disabled_only',
  availabilityModesOpen: 'lemondbd_admin_availability_modes_open',
  availabilityRosterOpen: 'lemondbd_admin_availability_roster_open',
  moderationHistoryOpen: 'lemondbd_moderation_history_open',
  moderationPreviewOpen: 'lemondbd_moderation_preview_open',
  moderationPreviewTab: 'lemondbd_moderation_preview_tab',
} as const;

/** A report queue's two fold-away sections (`bugs` / `content`; the list and the open case). */
export const adminQueueDrawerKey = (queue: string, section: 'list' | 'case') => `lemondbd_admin_${queue}_${section}_open`;

/** A card on the Tools tab. */
export const adminToolDrawerKey = (id: string) => `lemondbd_admin_tool_${id}`;

/** A type guard for "one of these strings", for usePersistentString: a stale stored value is ignored. */
export const oneOf =
  <T extends string>(values: readonly T[]) =>
  (value: string): value is T =>
    (values as readonly string[]).includes(value);

export const USER_ROLE_FILTERS = ['all', 'admin', 'user'] as const satisfies readonly UserRoleFilter[];
export const USER_STANDING_FILTERS = ['all', 'active', 'suspended', 'banned'] as const satisfies readonly UserStandingFilter[];
export const BUG_REPORT_FILTERS = ['all', 'pending', 'in_progress', 'resolved', 'rejected'] as const;
export const CONTENT_REPORT_FILTERS = ['all', 'pending', 'resolved_banned', 'dismissed', 'expired'] as const;
