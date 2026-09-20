'use client';
// frontend/src/components/streaks/gauntlet/GauntletRulesModal.tsx

import React from 'react';
import { BookOpen, AlertTriangle, Flame, Lock, Snowflake, Clock } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { Role } from '@/types/gauntletStreak';
import { RulesModalShell, RulesModalNotices, RulesModalListSection } from '../RulesModalShell';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';

export interface GauntletRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  dict?: Dictionary;
}

interface TierDefinition {
  level: number;
  nameKey: string;
  defaultName: string;
  streakRange: string;
  perkLimit: number;
  badgeColor: string;
}

interface RuleException {
  labelKey: string;
  defaultLabel: string;
  textKey: string;
  defaultText: string;
}

const SURVIVOR_TIERS: TierDefinition[] = [
  {
    level: 0,
    nameKey: 'tierWarmUp',
    defaultName: 'The Warm Up',
    streakRange: '0 - 9',
    perkLimit: 4,
    badgeColor: 'bg-accent-green/20 text-accent-green border-accent-green/30',
  },
  {
    level: 1,
    nameKey: 'tierThinning',
    defaultName: 'The Thinning',
    streakRange: '10 - 19',
    perkLimit: 3,
    badgeColor: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
  },
  {
    level: 2,
    nameKey: 'tierStruggle',
    defaultName: 'The Struggle',
    streakRange: '20 - 29',
    perkLimit: 2,
    badgeColor: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
  },
  {
    level: 3,
    nameKey: 'tierHardcore',
    defaultName: 'The Hardcore',
    streakRange: '30 - 39',
    perkLimit: 1,
    badgeColor: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
  },
  {
    level: 4,
    nameKey: 'tierLegend',
    defaultName: 'The Legend',
    streakRange: '40+',
    perkLimit: 0,
    badgeColor: 'bg-accent-red/20 text-accent-red border-accent-red/30',
  },
];

const KILLER_TIERS: TierDefinition[] = [
  {
    level: 0,
    nameKey: 'tierBloodbath',
    defaultName: 'The Bloodbath',
    streakRange: '0 - 9',
    perkLimit: 3,
    badgeColor: 'bg-accent-green/20 text-accent-green border-accent-green/30',
  },
  {
    level: 1,
    nameKey: 'tierObsession',
    defaultName: 'The Obsession',
    streakRange: '10 - 19',
    perkLimit: 2,
    badgeColor: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
  },
  {
    level: 2,
    nameKey: 'tierExecutioner',
    defaultName: 'The Executioner',
    streakRange: '20 - 29',
    perkLimit: 1,
    badgeColor: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
  },
  {
    level: 3,
    nameKey: 'tierEntity',
    defaultName: 'The Entity',
    streakRange: '30+',
    perkLimit: 0,
    badgeColor: 'bg-accent-red/20 text-accent-red border-accent-red/30',
  },
];

const KILLER_EXCEPTIONS: RuleException[] = [
  {
    labelKey: 'excGameCancelledLabel',
    defaultLabel: 'Game cancelled',
    textKey: 'excGameCancelledText',
    defaultText: 'Someone leaves the lobby before it finishes loading and the match never starts.',
  },
  {
    labelKey: 'excHackersLabel',
    defaultLabel: 'Hackers',
    textKey: 'excHackersText',
    defaultText: 'Obvious cheaters are in the match.',
  },
  {
    labelKey: 'excCrashLabel',
    defaultLabel: 'Crash or server failure',
    textKey: 'excCrashText',
    defaultText: 'The game or server crashes mid-match.',
  },
];

const KILLER_CLARIFICATIONS: RuleException[] = [
  {
    labelKey: 'excSurvDcLabel',
    defaultLabel: 'Survivor disconnects',
    textKey: 'excSurvDcText',
    defaultText: 'Keep playing. The bot match still counts.',
  },
  {
    labelKey: 'excNoDodgingLabel',
    defaultLabel: 'No dodging',
    textKey: 'excNoDodgingText',
    defaultText: 'Play whatever lobby you get.',
  },
  {
    labelKey: 'excAddonsAllowedLabel',
    defaultLabel: 'Add-ons and offerings',
    textKey: 'excAddonsAllowedText',
    defaultText: 'All available.',
  },
];

const SURVIVOR_EXCEPTIONS: RuleException[] = [
  {
    labelKey: 'excEarlyDcLabel',
    defaultLabel: 'Early disconnect',
    textKey: 'excEarlyDcText',
    defaultText: 'A teammate leaves before any generator is finished.',
  },
  {
    labelKey: 'excGameCancelledLabel',
    defaultLabel: 'Game cancelled',
    textKey: 'excGameCancelledText',
    defaultText: 'Someone leaves the lobby before it finishes loading and the match never starts.',
  },
  {
    labelKey: 'excHackersLabel',
    defaultLabel: 'Hackers',
    textKey: 'excHackersText',
    defaultText: 'Obvious cheaters are in the match.',
  },
  {
    labelKey: 'excCrashLabel',
    defaultLabel: 'Crash or server failure',
    textKey: 'excCrashText',
    defaultText: 'The game or server crashes mid-match.',
  },
];

const SURVIVOR_CLARIFICATIONS: RuleException[] = [
  {
    labelKey: 'excAddonsAllowedLabel',
    defaultLabel: 'Add-ons and offerings',
    textKey: 'excAddonsAllowedText',
    defaultText: 'All available.',
  },
  {
    labelKey: 'clarRatOffLabel',
    defaultLabel: 'Rat off',
    textKey: 'clarRatOffText',
    defaultText: 'Teammates working with the killer to get you out counts as a loss.',
  },
  {
    labelKey: 'clarDeathIsDeathLabel',
    defaultLabel: 'A death is a death',
    textKey: 'clarDeathIsDeathText',
    defaultText:
      'Dying counts, even to stream sniping, a thrown game, or a teammate sabotaging you. Hackers are the exception, that still voids the whole match. See Exceptions above.',
  },
  {
    labelKey: 'clarKillerDcLabel',
    defaultLabel: 'Killer disconnects',
    textKey: 'clarKillerDcText',
    defaultText:
      "If the killer leaves before the first generator is done, or leaves because of a bug or server issue, the match doesn't count. If they leave after the first generator is done for any other reason, it counts as your escape.",
  },
];

export const GauntletRulesModal: React.FC<GauntletRulesModalProps> = ({
  isOpen,
  onClose,
  role,
  dict,
}) => {
  const tiers = role === 'killer' ? KILLER_TIERS : SURVIVOR_TIERS;
  const roleLabel = role === 'killer'
    ? (dict?.filters?.killer || '')
    : (dict?.filters?.survivor || '');

  const rawStreaks = (dict?.streaks ?? {}) as Record<string, string>;

  const modalTitle = rawStreaks.gauntletRulesTitle
    ? rawStreaks.gauntletRulesTitle.replace('{role}', roleLabel)
    : roleLabel;

  const concept = role === 'killer'
    ? (rawStreaks.gauntletConceptKiller ||
        'Face every killer, one trial at a time. Your perk loadout shrinks with every tier, until you win with none at all.')
    : (rawStreaks.gauntletConceptSurvivor ||
        'Face every survivor, one trial at a time. Your perk loadout shrinks with every tier, until you win with none at all.');

  const winCondition = role === 'killer'
    ? (rawStreaks.gauntletWinConditionKiller || 'Win = 3 kills or more. Anything less breaks the streak.')
    : (rawStreaks.gauntletWinConditionSurvivor || 'Win = escape, through the exit gates or the hatch. Anything else breaks the streak.');

  const perkRule = role === 'killer'
    ? (rawStreaks.gauntletKillerPerkRule || 'You always run your own teachables. Start with all 3, lose one each tier.')
    : (rawStreaks.gauntletSurvivorPerkRule || 'Only 1 of your perks has to be your own teachable. The other 3 are your pick.');

  const rosterCapNote = role === 'killer'
    ? (rawStreaks.killerRosterCapNote || 'The roster stops at the 43 killers, up through The Slasher.')
    : (rawStreaks.survivorRosterCapNote || 'The roster stops at the 52 survivors, up through Kwon Tae-young.');

  const exceptions = role === 'killer' ? KILLER_EXCEPTIONS : SURVIVOR_EXCEPTIONS;
  const clarifications = role === 'killer' ? KILLER_CLARIFICATIONS : SURVIVOR_CLARIFICATIONS;

  return (
    <RulesModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={BookOpen}
      title={modalTitle}
      iconClassName="bg-accent-red/10 border-accent-red/20 text-accent-red"
      footerButtonClassName="bg-accent-red hover:bg-accent-red-hover"
      footerButtonLabel={rawStreaks.gotItLetsPlay || "Got It, Let's Play!"}
      dict={dict}
    >
      <div className="bg-bg-elevated border border-border-color rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-accent-red uppercase tracking-wider mb-2 flex items-center gap-2">
          <AdeptBadgeIcon className="w-4 h-4" aria-hidden="true" />
          <span>{rawStreaks.gauntletConcept || 'Gauntlet Concept'}</span>
        </h3>
        <p className="leading-relaxed text-xs sm:text-sm text-text-secondary">
          {concept}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3">
          {rawStreaks.howItWorks || 'How it works'}
        </h3>
        <ul className="space-y-2 text-xs sm:text-sm text-text-secondary leading-relaxed list-disc pl-4 marker:text-accent-red">
          <li>{winCondition}</li>
          <li>{perkRule}</li>
          <li>{rawStreaks.gauntletCheckpointRule || 'Every 10 wins banks a checkpoint, so a loss only falls back that far, not to zero.'}</li>
          <li>{rosterCapNote}</li>
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4 text-accent-red" aria-hidden="true" />
          <span>{rawStreaks.progressiveTierRestrictions || 'Progressive Tier Restrictions'}</span>
        </h3>
        <div className="grid grid-cols-1 gap-2.5" role="list">
          {tiers.map((tier) => {
            const tierName = rawStreaks[tier.nameKey] || tier.defaultName;
            const streakRangeFormatted = rawStreaks.streakRangeLabel
              ? rawStreaks.streakRangeLabel.replace('{range}', tier.streakRange)
              : tier.streakRange;

            const perkLimitText =
              tier.perkLimit === 0
                ? rawStreaks.perklessTrial || '0 Perks'
                : rawStreaks.perksAllowedCount
                  ? rawStreaks.perksAllowedCount.replace('{count}', String(tier.perkLimit))
                  : `${tier.perkLimit} ${tier.perkLimit > 1 ? (rawStreaks.perksAllowedPlural || '') : (rawStreaks.perksAllowedSingular || '')}`.trim();

            return (
              <div
                key={tier.level}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-bg-elevated border border-border-color rounded-xl gap-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${tier.badgeColor} whitespace-nowrap`}>
                    {rawStreaks.tierLabel || ''} {tier.level}{tierName ? `: ${tierName}` : ''}
                  </span>
                  <span className="text-xs font-medium text-text-muted">
                    ({streakRangeFormatted})
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                  <div className="flex items-center gap-1.5 font-bold text-accent-amber text-xs bg-accent-amber/10 px-3 py-1 rounded-lg border border-accent-amber/20 whitespace-nowrap">
                    <Lock className="w-3.5 h-3.5 text-accent-amber" aria-hidden="true" />
                    <span>{perkLimitText}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <RulesModalListSection
        icon={AlertTriangle}
        title={rawStreaks.exceptions || 'Exceptions'}
        intro={rawStreaks.voidMatchNotice || 'These void the match. Replay it.'}
        headerColorClassName="text-accent-red"
        boxClassName="border-accent-red/20"
        items={exceptions
          .map((item) => ({
            label: rawStreaks[item.labelKey] || item.defaultLabel,
            text: rawStreaks[item.textKey] || item.defaultText,
          }))
          .filter((item) => item.label || item.text)}
      />

      <RulesModalListSection
        icon={AlertTriangle}
        title={rawStreaks.clarifications || 'Clarifications'}
        headerColorClassName="text-accent-red"
        boxClassName="border-border-color"
        items={clarifications
          .map((item) => ({
            label: rawStreaks[item.labelKey] || item.defaultLabel,
            text: rawStreaks[item.textKey] || item.defaultText,
          }))
          .filter((item) => item.label || item.text)}
      />

      <RulesModalNotices
        accentClassName="border-accent-amber/20 bg-accent-amber/5 text-accent-amber"
        notices={[
          {
            icon: Snowflake,
            text: rawStreaks.runFreezeNotice ||
              'Your run freezes. New unlocks join after your next reset, loss to zero, or completion.',
          },
          {
            icon: Clock,
            text: rawStreaks.inactivityLossNotice || 'An in-progress run untouched for 90 days automatically counts as a loss.',
          },
        ]}
      />
    </RulesModalShell>
  );
};
