// frontend/src/components/moderation/moderationLabels.ts
//
// Readable names for the codes the moderation API stores. A code the UI does not know prints as itself.
import type { Dictionary } from '@/locales/types';
import { RULE_SECTION_NUMBERS, type RuleRef } from '@/types/moderation';
import { formatMessage } from '@/utils/i18nFormat';

type ModerationDict = Pick<Dictionary, 'moderation' | 'rules'>;

export function reasonLabel(dict: ModerationDict, code: string | null | undefined): string {
  if (!code) return '';
  const reasons = dict.moderation.reasons as Record<string, string>;
  return reasons[code] ?? code;
}

/** The cited Rules section as "Section 1: Don't be the Entity" ("" when no rule is cited). */
export function ruleLabel(dict: ModerationDict, ref: string | null | undefined): string {
  if (!ref) return '';
  const sections = dict.rules.sections as Record<string, { heading?: string } | undefined>;
  const name = sections[ref]?.heading ?? ref;
  const number = RULE_SECTION_NUMBERS[ref as RuleRef];
  return number ? formatMessage(dict.moderation.ruleSection, { number, name }) : name;
}
