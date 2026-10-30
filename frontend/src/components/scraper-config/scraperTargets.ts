// frontend/src/components/scraper-config/scraperTargets.ts
//
// What the database tools can export, import and purge. The ids are the backend's own names
// (backend/app/services/db/export_registry.py: TARGET_GROUPS, PURGEABLE_TARGETS, PURGE_REQUIRES), and a
// backend test fails when the two lists drift apart: an id the backend does not know used to be
// dropped without a word, so "Characters" exported nothing and purge reported success for tables it
// never touched.
import { Database, Globe, Settings, Users } from 'lucide-react';

export type ScraperTab = 'export' | 'import' | 'purge';

export interface TargetItem {
  id: string;
  label: string;
  desc: string;
  category: 'content' | 'users' | 'community' | 'settings';
}

/** English fallbacks; the admin dictionary's `target<Pascal>Label` / `...Desc` keys translate them. */
export const ALL_TARGETS: readonly TargetItem[] = [
  { id: 'chapters', label: 'Chapters', desc: 'DLC chapters and banner art', category: 'content' },
  { id: 'realms', label: 'Realms', desc: 'Realms and their artwork', category: 'content' },
  { id: 'item_categories', label: 'Item Categories', desc: 'Toolbox, med-kit, flashlight and the other item types', category: 'content' },
  { id: 'map_sources', label: 'Map Sources', desc: 'Where map callouts were taken from', category: 'content' },
  { id: 'survivors', label: 'Survivors', desc: 'Survivors, lore, stats and portraits', category: 'content' },
  { id: 'killers', label: 'Killers', desc: 'Killers, powers, lore, stats and portraits', category: 'content' },
  { id: 'perks', label: 'Perks', desc: 'Survivor and Killer teachable & general perks', category: 'content' },
  { id: 'items', label: 'Items & Equipment', desc: 'Survivor items and tools', category: 'content' },
  { id: 'killer_addons', label: 'Killer Add-ons', desc: 'Add-ons for every killer power', category: 'content' },
  { id: 'item_addons', label: 'Item Add-ons', desc: 'Add-ons for survivor items', category: 'content' },
  { id: 'offerings', label: 'Offerings', desc: 'Survivor and Killer offerings', category: 'content' },
  { id: 'maps', label: 'Maps & Callouts', desc: 'Map tiles and objective landmarks (with their realms)', category: 'content' },
  { id: 'map_layouts', label: 'Map Layouts', desc: 'Vector layout footprints for drawn maps', category: 'content' },
  { id: 'tier_lists', label: 'Tier Lists', desc: 'Official tier lists and their artwork', category: 'content' },
  { id: 'users', label: 'User Accounts', desc: 'Registered user profiles, roles and avatars', category: 'users' },
  { id: 'ownerships', label: 'User Ownership Records', desc: 'Unlocked perks, character prestige and favorites', category: 'users' },
  { id: 'user_showcases', label: 'Player Showcases', desc: 'Public profile mains and prestige display', category: 'users' },
  { id: 'banned_email_hashes', label: 'Ban-Evasion List', desc: 'Keyed hashes of permanently banned e-mail addresses (no pepper, no addresses)', category: 'users' },
  { id: 'bug_reports', label: 'Bug Reports', desc: 'Submitted bug reports and admin notes', category: 'community' },
  { id: 'changelog_posts', label: 'Changelog Posts', desc: 'Published What is New feed entries', category: 'community' },
  { id: 'gauntlet_runs', label: 'Gauntlet Streak Runs', desc: 'In-progress and completed gauntlet streak history', category: 'community' },
  { id: 'chaos_runs', label: 'Chaos Streak Runs', desc: 'In-progress and completed chaos streak history', category: 'community' },
  { id: 'history_runs', label: 'History Streak Runs', desc: 'In-progress and completed history streak history', category: 'community' },
  { id: 'id_please_runs', label: 'ID, Please Runs', desc: 'In-progress ID, Please runs and their match history', category: 'community' },
  { id: 'page_streak_runs', label: 'Page Streak Runs', desc: 'In-progress and completed page streak history', category: 'community' },
  { id: 'rosters', label: 'Smash or Pass Rosters', desc: 'Rosters, entities, stats and votes', category: 'community' },
  { id: 'challenge_mode_settings', label: 'Challenge Mode Toggles', desc: 'Site-wide enable and disable state per mode', category: 'settings' },
  { id: 'admin_audit_logs', label: 'Admin Audit Log', desc: 'History of administrative actions', category: 'settings' },
];

/**
 * What purge offers: everything except the accounts (that would delete you too), the audit log
 * (append-only) and the ban-evasion list (wiping it would let banned addresses back in).
 */
const NOT_PURGEABLE: readonly string[] = ['users', 'admin_audit_logs', 'banned_email_hashes'];
export const PURGEABLE_TARGET_IDS: readonly string[] = ALL_TARGETS.map((t) => t.id).filter((id) => !NOT_PURGEABLE.includes(id));

/** Tables whose rows point at another without a cascade: purging the parent needs these too. */
export const PURGE_REQUIRES: Readonly<Record<string, readonly string[]>> = {
  chapters: ['survivors', 'killers'],
  realms: ['maps'],
  map_sources: ['maps'],
  item_categories: ['items', 'item_addons'],
};

/** `ids` plus everything they need alongside for a purge, in the list's own order. */
export function withPurgeDependencies(ids: readonly string[]): string[] {
  const wanted = new Set(ids);
  for (const id of ids) for (const dep of PURGE_REQUIRES[id] ?? []) wanted.add(dep);
  return PURGEABLE_TARGET_IDS.filter((id) => wanted.has(id));
}

/** Deleting these also takes rows in other tables with it (foreign-key cascades). */
export const PURGE_CASCADES: readonly string[] = ['survivors', 'killers', 'perks'];

export const TARGET_KEY_MAP: Record<string, string> = {
  chapters: 'Chapters',
  realms: 'Realms',
  item_categories: 'ItemCategories',
  map_sources: 'MapSources',
  survivors: 'Survivors',
  killers: 'Killers',
  perks: 'Perks',
  items: 'Items',
  killer_addons: 'KillerAddons',
  item_addons: 'ItemAddons',
  offerings: 'Offerings',
  maps: 'Maps',
  map_layouts: 'MapLayouts',
  tier_lists: 'TierLists',
  users: 'Users',
  ownerships: 'Ownerships',
  user_showcases: 'UserShowcases',
  banned_email_hashes: 'BannedEmailHashes',
  bug_reports: 'BugReports',
  changelog_posts: 'ChangelogPosts',
  gauntlet_runs: 'GauntletRuns',
  chaos_runs: 'ChaosRuns',
  history_runs: 'HistoryRuns',
  id_please_runs: 'IdPleaseRuns',
  page_streak_runs: 'PageStreakRuns',
  rosters: 'Rosters',
  challenge_mode_settings: 'ChallengeModeSettings',
  admin_audit_logs: 'AdminAuditLogs',
};

export const TARGET_GROUPS_CONFIG = [
  { key: 'content' as const, labelKey: 'groupContent' as const, fallbackLabel: 'Game Content', icon: Database },
  { key: 'users' as const, labelKey: 'groupUsers' as const, fallbackLabel: 'Users & Accounts', icon: Users },
  { key: 'community' as const, labelKey: 'groupCommunity' as const, fallbackLabel: 'Community & Streaks', icon: Globe },
  { key: 'settings' as const, labelKey: 'groupSettings' as const, fallbackLabel: 'Configuration & System', icon: Settings },
];
