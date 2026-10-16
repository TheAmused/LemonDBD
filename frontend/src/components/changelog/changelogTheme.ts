// frontend/src/components/changelog/changelogTheme.ts
import type { ChangelogSection } from '@/types/changelog';

export const CHANGELOG_SECTIONS: ChangelogSection[] = ['new', 'qol', 'balance', 'bugfix', 'knownIssues', 'announcement'];

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
