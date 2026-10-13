// frontend/src/utils/userShowcaseAnalytics.ts
import type { UserShowcaseState } from '@/types/userShowcase';
import { trackOnce } from '@/utils/analytics';

type ShowcaseRole = 'survivor' | 'killer';

const isFull = (perkIds: (number | null)[]): boolean => perkIds.length === 4 && perkIds.every((id) => id !== null);

/** Roles whose main has all 4 perks set. The character is always set (it has a default), so it does not count. */
export function completedShowcaseRoles(showcase: UserShowcaseState): ShowcaseRole[] {
  const roles: ShowcaseRole[] = [];
  if (isFull(showcase.survivorMain.perkIds)) roles.push('survivor');
  if (isFull(showcase.killerMain.perkIds)) roles.push('killer');
  return roles;
}

/**
 * `showcase_complete` once per user and role per browser. Called on every load and edit, so a
 * user who was already complete is counted too, and refilling a slot later is not counted again.
 */
export function reportCompleteShowcaseRoles(
  userId: number | string | null | undefined,
  showcase: UserShowcaseState
): void {
  if (userId === null || userId === undefined || userId === 'guest') return;
  for (const role of completedShowcaseRoles(showcase)) {
    trackOnce(`lemondbd_umami_showcase_complete_${userId}_${role}`, 'showcase_complete', { role });
  }
}
