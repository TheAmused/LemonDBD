// frontend/src/components/moderation/moderationLabels.ts
//
// Readable names for the codes the moderation API stores. A code the UI does not know prints as itself.
import type { Dictionary } from '@/locales/types';

type ModerationDict = Pick<Dictionary, 'moderation' | 'rules'>;

export function reasonLabel(dict: ModerationDict, code: string | null | undefined): string {
  if (!code) return '';
  const reasons = dict.moderation.reasons as Record<string, string>;
  return reasons[code] ?? code;
}

/** The Rules page heading of the cited section ("" when no rule is cited). */
export function ruleLabel(dict: ModerationDict, ref: string | null | undefined): string {
  if (!ref) return '';
  const sections = dict.rules.sections as Record<string, { heading?: string } | undefined>;
  return sections[ref]?.heading ?? ref;
}
