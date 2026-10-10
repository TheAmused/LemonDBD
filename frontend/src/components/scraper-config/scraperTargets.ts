// frontend/src/components/scraper-config/scraperTargets.ts
import { Globe, Layers, Settings, Users } from 'lucide-react';

export type ScraperTab = 'export' | 'import' | 'purge';

export interface TargetItem {
  id: string;
  label: string;
  desc: string;
  category: 'content' | 'users' | 'community' | 'settings';
}

export const ALL_TARGETS: readonly TargetItem[] = [
  { id: 'characters', label: 'Characters', desc: 'Survivors, Killers, powers, stats and portraits', category: 'content' },
  { id: 'perks', label: 'Perks', desc: 'Survivor and Killer teachable & general perks', category: 'content' },
  { id: 'items', label: 'Items & Equipment', desc: 'Survivor items and tools', category: 'content' },
  { id: 'addons', label: 'Add-ons', desc: 'Killer power and survivor item add-ons', category: 'content' },
  { id: 'offerings', label: 'Offerings', desc: 'Survivor and Killer offerings', category: 'content' },
  { id: 'chapters', label: 'Chapters', desc: 'DLC chapters and banner art', category: 'content' },
  { id: 'maps', label: 'Maps & Callouts', desc: 'Map realms, tiles, and objective landmarks', category: 'content' },
  { id: 'users', label: 'User Accounts', desc: 'Registered user profiles, roles and avatars', category: 'users' },
  { id: 'ownerships', label: 'User Ownership Records', desc: 'Unlocked perks, character prestige and favorites', category: 'users' },
  { id: 'user_showcases', label: 'Player Showcases', desc: 'Public profile mains and prestige display', category: 'users' },
  { id: 'community_builds', label: 'Community Builds', desc: 'User-created builds and upvotes', category: 'community' },
  { id: 'custom_perks', label: 'Custom Perks', desc: 'Community-designed custom perks', category: 'community' },
  { id: 'daily_quests', label: 'Daily Quests', desc: 'Daily challenges and completion states', category: 'community' },
  { id: 'bug_reports', label: 'Bug Reports', desc: 'Submitted bug reports and admin notes', category: 'community' },
  { id: 'changelog_posts', label: 'Changelog Posts', desc: 'Published What is New feed entries', category: 'community' },
  { id: 'draft_sessions', label: 'Draft Sessions', desc: 'Live perk draft room state', category: 'settings' },
  { id: 'challenge_mode_settings', label: 'Challenge Mode Toggles', desc: 'Site-wide enable and disable state per mode', category: 'settings' },
  { id: 'admin_audit_logs', label: 'Admin Audit Log', desc: 'History of administrative actions', category: 'settings' },
  { id: 'guesser_stats', label: 'Guesser Stats', desc: 'Streaks and guesser game records', category: 'settings' },
  { id: 'gauntlet_runs', label: 'Gauntlet Streak Runs', desc: 'In-progress and completed gauntlet streak history', category: 'community' },
  { id: 'chaos_runs', label: 'Chaos Streak Runs', desc: 'In-progress and completed chaos streak history', category: 'community' },
  { id: 'history_runs', label: 'History Streak Runs', desc: 'In-progress and completed history streak history', category: 'community' },
  { id: 'page_streak_runs', label: 'Page Streak Runs', desc: 'In-progress and completed page streak history', category: 'community' },
  { id: 'rosters', label: 'Smash or Pass Rosters', desc: 'Rosters, entities, stats and votes', category: 'community' },
];

export const TARGET_KEY_MAP: Record<string, string> = {
  characters: 'Characters',
  perks: 'Perks',
  items: 'Items',
  addons: 'Addons',
  offerings: 'Offerings',
  chapters: 'Chapters',
  maps: 'Maps',
  users: 'Users',
  ownerships: 'Ownerships',
  user_showcases: 'UserShowcases',
  community_builds: 'CommunityBuilds',
  custom_perks: 'CustomPerks',
  daily_quests: 'DailyQuests',
  bug_reports: 'BugReports',
  changelog_posts: 'ChangelogPosts',
  draft_sessions: 'DraftSessions',
  challenge_mode_settings: 'ChallengeModeSettings',
  admin_audit_logs: 'AdminAuditLogs',
  guesser_stats: 'GuesserStats',
  gauntlet_runs: 'GauntletRuns',
  chaos_runs: 'ChaosRuns',
  history_runs: 'HistoryRuns',
  page_streak_runs: 'PageStreakRuns',
  rosters: 'Rosters',
};

export const TARGET_GROUPS_CONFIG = [
  { key: 'content' as const, labelKey: 'groupContent' as const, fallbackLabel: 'Game Content', icon: Layers },
  { key: 'users' as const, labelKey: 'groupUsers' as const, fallbackLabel: 'Users & Accounts', icon: Users },
  { key: 'community' as const, labelKey: 'groupCommunity' as const, fallbackLabel: 'Community & Streaks', icon: Globe },
  { key: 'settings' as const, labelKey: 'groupSettings' as const, fallbackLabel: 'Configuration & System', icon: Settings },
];
