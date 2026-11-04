// frontend/src/utils/smashOrPass/terms.ts
import { isKiller, isSurvivor } from '@/utils/characterUtils';

/** A role or gender as shown to people: words capitalised, `monster_other`-style keys spelled out. */
export function termLabel(term: string): string {
  return term
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\p{L}[\p{L}\p{M}']*/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

/** The gender keys the official rosters use; the filters, the leaderboard and the built-in personas know these. */
export const OFFICIAL_GENDERS = ['female', 'male', 'monster_other'] as const;

/**
 * A gender as stored: one of the official keys when the words name one (`Female`, `MALE`,
 * `Monster`, `Monster / Other` -> `female`, `male`, `monster_other`), otherwise the author's own
 * word as written. Custom rosters then filter and match personas exactly like the official ones.
 */
export function canonicalGender(value: string | undefined | null): string {
  const trimmed = (value ?? '').trim();
  const key = trimmed.toLowerCase().replace(/[\s/&_-]+/g, '_').replace(/^_+|_+$/g, '');
  if (key === 'female' || key === 'male' || key === 'monster_other') return key;
  if (key === 'monster' || key === 'monsters' || key === 'monster_or_other' || key === 'monsters_other') return 'monster_other';
  return trimmed;
}

export interface GenderLabels {
  femaleOnly: string;
  maleOnly: string;
  monsters: string;
}

/** A gender as shown to people: the translated label for an official key, any other word capitalised. */
export function genderLabel(gender: string | undefined | null, labels: GenderLabels): string {
  const key = canonicalGender(gender);
  if (key === 'female') return labels.femaleOnly;
  if (key === 'male') return labels.maleOnly;
  if (key === 'monster_other') return labels.monsters;
  return termLabel(key);
}

export interface RoleBadgeLabels {
  survivors: string;
  killers: string;
}

/** The badge a role gets: Survivor and Killer keep their colours; any other role is shown as written, neutral. */
export function roleBadge(role: string | undefined | null, labels: RoleBadgeLabels): { tone: 'green' | 'red' | 'neutral'; label: string } {
  if (isSurvivor(role)) return { tone: 'green', label: labels.survivors };
  if (isKiller(role)) return { tone: 'red', label: labels.killers };
  return { tone: 'neutral', label: termLabel(role ?? '') };
}
