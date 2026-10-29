// frontend/src/components/streaks/RulesModalSections.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { Clock, Snowflake } from 'lucide-react';
import { RulesModalListSection, RulesModalNotices, type RuleListEntry } from './RulesModalShell';
import { Surface } from '@/components/common/Surface';
import { usePrivacyInfo } from '@/hooks/usePrivacyInfo';
import { formatMessage } from '@/utils/i18nFormat';

/** The `dict.streaks` copy bag. */
export type StreakCopy = Dictionary['streaks'];

/** Keys of `dict.streaks` that hold plain text, so a rules entry can name its copy and still be type checked. */
export type StreakTextKey = { [K in keyof StreakCopy]: StreakCopy[K] extends string ? K : never }[keyof StreakCopy];

export type RulesTone = 'red' | 'neutral';

interface ToneClasses {
  conceptTitle: string;
  marker: string;
  notices: string;
}

const RULES_TONES: Record<RulesTone, ToneClasses> = {
  red: {
    conceptTitle: 'text-accent-red',
    marker: 'marker:text-accent-red',
    notices: 'border-accent-amber/20 bg-accent-amber/5 text-accent-amber',
  },
  neutral: {
    conceptTitle: 'text-text-secondary',
    marker: 'marker:text-text-muted',
    notices: 'border-border-color bg-bg-elevated text-text-secondary',
  },
};

/** Boxed "<Mode> Concept" card at the top of every rules modal. */
export const RulesConceptCard: React.FC<{ title: React.ReactNode; text: React.ReactNode; tone: RulesTone }> = ({
  title,
  text,
  tone,
}) => (
  <Surface tone="elevated" padding="none" className="p-4 shadow-sm">
    <h3 className={`type-label mb-2 ${RULES_TONES[tone].conceptTitle}`}>{title}</h3>
    <p className="type-body-fluid text-text-secondary">{text}</p>
  </Surface>
);

/** "How it works" bullet list; `hint` renders as an italic aside underneath. */
export const RulesHowItWorks: React.FC<{
  title: string;
  items: React.ReactNode[];
  tone: RulesTone;
  hint?: React.ReactNode;
}> = ({ title, items, tone, hint }) => (
  <div>
    <h3 className="type-label text-text-primary mb-3">{title}</h3>
    <ul
      className={`space-y-2 text-xs sm:text-sm text-text-secondary leading-relaxed list-disc pl-4 ${RULES_TONES[tone].marker}`}
    >
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
    {hint && <p className="mt-3 type-body-fluid text-text-muted italic">{hint}</p>}
  </div>
);

/** Titled section (difficulty / tier restrictions) wrapping its rows. */
export const RulesSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="type-label text-text-primary mb-3">{title}</h3>
    {children}
  </div>
);

export interface RulesDifficultyRow {
  label: string;
  text: string;
  badgeClassName: string;
}

export const RulesDifficultyRows: React.FC<{ rows: RulesDifficultyRow[]; alignTextRight?: boolean }> = ({
  rows,
  alignTextRight = false,
}) => (
  <div className="grid grid-cols-1 gap-2.5">
    {rows.map((row, i) => (
      <Surface
        key={i}
        tone="elevated" padding="none" className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-2 shadow-sm"
      >
        <span className={`px-2.5 py-1 rounded-chip text-xs font-bold border ${row.badgeClassName} whitespace-nowrap w-fit`}>
          {row.label}
        </span>
        <p className={`text-xs text-text-secondary${alignTextRight ? ' sm:text-right sm:max-w-xs' : ''}`}>{row.text}</p>
      </Surface>
    ))}
  </div>
);

export const DIFFICULTY_BADGE = {
  green: 'bg-accent-green/20 text-accent-green border-accent-green/30',
  amber: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
  red: 'bg-accent-red/20 text-accent-red border-accent-red/30',
} as const;

/* ------------------------------------------------------------------ */
/* Shared Exceptions / Clarifications / housekeeping notices           */
/* ------------------------------------------------------------------ */

export interface RuleEntryDef {
  labelKey: StreakTextKey;
  textKey: StreakTextKey;
  /** Alternate text keys per variant (e.g. gauntlet solo/duo/squad wording). */
  variantTextKeys?: Record<string, StreakTextKey>;
}

export const RULE_GAME_CANCELLED: RuleEntryDef = {
  labelKey: 'excGameCancelledLabel',
  textKey: 'excGameCancelledText',
};
export const RULE_HACKERS: RuleEntryDef = {
  labelKey: 'excHackersLabel',
  textKey: 'excHackersText',
};
export const RULE_CRASH: RuleEntryDef = {
  labelKey: 'excCrashLabel',
  textKey: 'excCrashText',
};
const RULE_SURVIVOR_DC: RuleEntryDef = {
  labelKey: 'excSurvDcLabel',
  textKey: 'excSurvDcText',
};
const RULE_NO_DODGING: RuleEntryDef = {
  labelKey: 'excNoDodgingLabel',
  textKey: 'excNoDodgingText',
};
export const RULE_ADDONS_ALLOWED: RuleEntryDef = {
  labelKey: 'excAddonsAllowedLabel',
  textKey: 'excAddonsAllowedText',
};

/** The streak_prune_days default, shown until /privacy-info answers. */
const DEFAULT_INACTIVITY_DAYS = 90;

export const STANDARD_EXCEPTIONS: RuleEntryDef[] = [RULE_GAME_CANCELLED, RULE_HACKERS, RULE_CRASH];
export const STANDARD_CLARIFICATIONS: RuleEntryDef[] = [RULE_SURVIVOR_DC, RULE_NO_DODGING];
export const STANDARD_CLARIFICATIONS_WITH_ADDONS: RuleEntryDef[] = [...STANDARD_CLARIFICATIONS, RULE_ADDONS_ALLOWED];

/** Looks each def up in the copy bag and drops empty rows. */
export function resolveRuleEntries(copy: StreakCopy, defs: RuleEntryDef[], variant?: string): RuleListEntry[] {
  return defs
    .map((def) => {
      const textKey = (variant && def.variantTextKeys?.[variant]) || def.textKey;
      return {
        label: copy[def.labelKey],
        text: copy[textKey],
      };
    })
    .filter((item) => item.label || item.text);
}

export const RulesModalFooterSections: React.FC<{
  copy: StreakCopy;
  tone: RulesTone;
  exceptions: RuleListEntry[];
  clarifications: RuleListEntry[];
  /** Override for the "these void the match" intro line. */
  voidIntro?: string;
  /** False for a mode whose lists are live, where "your run freezes" would be untrue. */
  showFreezeNotice?: boolean;
}> = ({ copy, tone, exceptions, clarifications, voidIntro, showFreezeNotice = true }) => {
  const t = RULES_TONES[tone];
  // The admin setting (Settings > Retention), as the Privacy Policy quotes it; 90 until it has loaded.
  const privacy = usePrivacyInfo();
  const inactivityDays = privacy ? Math.max(1, Math.round(privacy.streakPruneSeconds / 86_400)) : DEFAULT_INACTIVITY_DAYS;
  return (
    <>
      <RulesModalListSection
        title={copy.exceptions}
        intro={voidIntro || copy.voidMatchNotice}
        items={exceptions}
      />
      <RulesModalListSection
        title={copy.clarifications}
        items={clarifications}
      />
      <RulesModalNotices
        accentClassName={t.notices}
        notices={[
          ...(showFreezeNotice ? [{ icon: Snowflake, text: copy.runFreezeNotice }] : []),
          {
            icon: Clock,
            text: formatMessage(copy.inactivityLossNotice, { days: inactivityDays }),
          },
        ]}
      />
    </>
  );
};
