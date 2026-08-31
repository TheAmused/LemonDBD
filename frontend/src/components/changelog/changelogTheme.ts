// frontend/src/components/changelog/changelogTheme.ts
import type { ChangelogTag } from '@/types/changelog';

export interface ChangelogTagTheme {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const CHANGELOG_TAG_THEME: Record<ChangelogTag, ChangelogTagTheme> = {
  feature: {
    label: 'New',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dotClass: 'bg-amber-400',
  },
  bugfix: {
    label: 'Fixed',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dotClass: 'bg-emerald-400',
  },
  balance: {
    label: 'Balance',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    dotClass: 'bg-rose-400',
  },
  event: {
    label: 'Event',
    badgeClass: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    dotClass: 'bg-violet-400',
  },
  announcement: {
    label: 'Announcement',
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    dotClass: 'bg-sky-400',
  },
};

export const CHANGELOG_TAGS: ChangelogTag[] = ['feature', 'bugfix', 'balance', 'event', 'announcement'];

// Swatches offered by the rich-text color picker in the admin editor.
export const CHANGELOG_TEXT_COLORS: { name: string; value: string }[] = [
  { name: 'Bone', value: '#e2e8f0' },
  { name: 'Blood', value: '#dc2626' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Hex', value: '#a855f7' },
  { name: 'Hope', value: '#10b981' },
  { name: 'Fog', value: '#38bdf8' },
];

// Swatches offered by the rich-text highlight (background) picker.
export const CHANGELOG_HIGHLIGHT_COLORS: { name: string; value: string }[] = [
  { name: 'Blood', value: 'rgba(220,38,38,0.35)' },
  { name: 'Amber', value: 'rgba(245,158,11,0.35)' },
  { name: 'Hex', value: 'rgba(168,85,247,0.35)' },
  { name: 'Hope', value: 'rgba(16,185,129,0.35)' },
  { name: 'Fog', value: 'rgba(56,189,248,0.3)' },
];
