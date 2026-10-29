// frontend/src/components/streaks/id-please/idPleaseNeeds.ts
import type { Dictionary } from '@/locales/types';
import type { IdPleaseDifficultyEligibility, IdPleaseSideRequirement } from '@/types/idPleaseStreak';
import { formatMessage } from '@/utils/i18nFormat';

/** One line per shortfall on a side: too few characters, too few unlocked perks. */
function sideLines(copy: Dictionary['streaks'], sideLabel: string, requirement: IdPleaseSideRequirement): string[] {
  const lines: string[] = [];
  if (requirement.characters.have < requirement.characters.need) {
    lines.push(formatMessage(copy.idPleaseNeedsCharacters, { side: sideLabel, need: requirement.characters.need, have: requirement.characters.have }));
  }
  if (requirement.perks.have < requirement.perks.need) {
    lines.push(formatMessage(copy.idPleaseNeedsPerks, { side: sideLabel, need: requirement.perks.need, have: requirement.perks.have }));
  }
  return lines;
}

/** What a locked difficulty still needs; empty when it is playable. */
export function idPleaseNeeds(copy: Dictionary['streaks'], eligibility: IdPleaseDifficultyEligibility): string[] {
  return [...sideLines(copy, copy.killer, eligibility.killer), ...sideLines(copy, copy.survivor, eligibility.survivor)];
}
