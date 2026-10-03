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
    badgeClass: 'bg-accent-amber/15 text-accent-amber border-accent-amber/30',
    dotClass: 'bg-accent-amber',
  },
  bugfix: {
    label: 'Fixed',
    badgeClass: 'bg-accent-green/15 text-accent-green border-accent-green/30',
    dotClass: 'bg-accent-green',
  },
  balance: {
    label: 'Balance',
    badgeClass: 'bg-accent-rose/15 text-accent-rose border-accent-rose/30',
    dotClass: 'bg-accent-rose',
  },
  event: {
    label: 'Event',
    badgeClass: 'bg-accent-purple/15 text-accent-purple border-accent-purple/30',
    dotClass: 'bg-accent-purple',
  },
  announcement: {
    label: 'Announcement',
    badgeClass: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30',
    dotClass: 'bg-accent-blue',
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
