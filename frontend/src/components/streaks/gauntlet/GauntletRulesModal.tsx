'use client';
import { PadlockHeartIcon } from '@/components/icons/DbdIcons';
// frontend/src/components/streaks/gauntlet/GauntletRulesModal.tsx

import React from 'react';
import { BOOST_ICONS } from './boostIcons';
import type { GauntletGameMode, Role } from '@/types/gauntletStreak';
import { RulesModalShell } from '../RulesModalShell';
import {
  RULE_ADDONS_ALLOWED,
  RULE_CRASH,
  RULE_GAME_CANCELLED,
  RULE_HACKERS,
  RulesConceptCard,
  RulesSection,
  RulesHowItWorks,
  RulesModalFooterSections,
  STANDARD_CLARIFICATIONS_WITH_ADDONS,
  STANDARD_EXCEPTIONS,
  resolveRuleEntries,
  type RuleEntryDef,
  type StreakTextKey,
} from '../RulesModalSections';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";
import { Surface } from '@/components/common/Surface';

export interface GauntletRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  gameMode?: GauntletGameMode;
}

interface TierDefinition {
  level: number;
  nameKey: StreakTextKey;
  streakRange: string;
  perkLimit: number;
  badgeColor: string;
}

const SURVIVOR_TIERS: TierDefinition[] = [
  {
    level: 0,
    nameKey: 'tierWarmUp',
    streakRange: '1 - 10',
    perkLimit: 4,
    badgeColor: 'text-accent-green',
  },
  {
    level: 1,
    nameKey: 'tierThinning',
    streakRange: '11 - 20',
    perkLimit: 3,
    badgeColor: 'text-accent-amber',
  },
  {
    level: 2,
    nameKey: 'tierStruggle',
    streakRange: '21 - 30',
    perkLimit: 2,
    badgeColor: 'text-accent-amber',
  },
  {
    level: 3,
    nameKey: 'tierHardcore',
    streakRange: '31 - 40',
    perkLimit: 1,
    badgeColor: 'text-accent-amber',
  },
  {
    level: 4,
    nameKey: 'tierLegend',
    streakRange: '41 - 52',
    perkLimit: 0,
    badgeColor: 'text-accent-red',
  },
];

// The hardest tier shown is red, even where the roster stops before the perkless one.
const LAST_TIER_COLOR = 'text-accent-red';

// Duo and squad step a tier every 6 wins.
const TEAM_STREAK_RANGES = ['1 - 6', '7 - 12', '13 - 18', '19 - 26'];

const KILLER_TIERS: TierDefinition[] = [
  {
    level: 0,
    nameKey: 'tierBloodbath',
    streakRange: '1 - 10',
    perkLimit: 3,
    badgeColor: 'text-accent-green',
  },
  {
    level: 1,
    nameKey: 'tierObsession',
    streakRange: '11 - 20',
    perkLimit: 2,
    badgeColor: 'text-accent-amber',
  },
  {
    level: 2,
    nameKey: 'tierExecutioner',
    streakRange: '21 - 30',
    perkLimit: 1,
    badgeColor: 'text-accent-amber',
  },
  {
    level: 3,
    nameKey: 'tierEntity',
    streakRange: '31 - 43',
    perkLimit: 0,
    badgeColor: 'text-accent-red',
  },
];

const SURVIVOR_EXCEPTIONS: RuleEntryDef[] = [
  {
    labelKey: 'excEarlyDcLabel',
    textKey: 'excEarlyDcText',
  },
  RULE_GAME_CANCELLED,
  RULE_HACKERS,
  RULE_CRASH,
];

const SURVIVOR_CLARIFICATIONS: RuleEntryDef[] = [
  RULE_ADDONS_ALLOWED,
  {
    labelKey: 'clarRatOffLabel',
    textKey: 'clarRatOffText',
  },
  {
    labelKey: 'clarDeathIsDeathLabel',
    textKey: 'clarDeathIsDeathText',
  },
  {
    labelKey: 'clarKillerDcLabel',
    textKey: 'clarKillerDcText',
    variantTextKeys: { solo: 'soloKillerDcText', duo: 'duoKillerDcText', squad: 'squadKillerDcText' },
  },
];

export const GauntletRulesModal: React.FC<GauntletRulesModalProps> = ({ isOpen, onClose, role, gameMode }) => {
  const dict = useDictionary();
  const isSolo = gameMode === 'lemon_solo';
  const isDuo = gameMode === 'lemon_duo';
  const isSquad = gameMode === 'lemon_squad';
  const isTeam = isDuo || isSquad;
  const isLemonKiller = gameMode === 'lemon_killer';
  // Duo and squad have four stages, so they stop before the perkless tier.
  const tiers =
    role === 'killer' ? KILLER_TIERS : isTeam ? SURVIVOR_TIERS.slice(0, TEAM_STREAK_RANGES.length) : SURVIVOR_TIERS;
  const roleLabel = role === 'killer'
    ? (dict.filters.killer)
    : (dict.filters.survivor);

  const rawStreaks = dict.streaks;

  const modalTitle = rawStreaks.gauntletRulesTitle
    ? formatMessage(rawStreaks.gauntletRulesTitle, { role: roleLabel })
    : roleLabel;

  const devNote = isLemonKiller ? rawStreaks.lemonKillerDevNote : isSolo || isDuo || isSquad ? rawStreaks.soloDevNote : undefined;

  const winCondition = isSolo && rawStreaks.soloWinCondition
    ? rawStreaks.soloWinCondition
    : isDuo && rawStreaks.duoWinCondition
    ? rawStreaks.duoWinCondition
    : isSquad && rawStreaks.squadWinCondition
    ? rawStreaks.squadWinCondition
    : role === 'killer'
    ? rawStreaks.gauntletWinConditionKiller
    : rawStreaks.gauntletWinConditionSurvivor;

  const perkRule = role === 'killer'
    ? (isLemonKiller && rawStreaks.lemonKillerPerkRule) || rawStreaks.gauntletKillerPerkRule
    : (isSolo && rawStreaks.soloPerkRule) ||
      rawStreaks.gauntletSurvivorPerkRule;

  const rosterCapNote = role === 'killer'
    ? rawStreaks.killerRosterCapNote
    : rawStreaks.survivorRosterCapNote;

  const variant = isSolo ? 'solo' : isDuo ? 'duo' : isSquad ? 'squad' : undefined;
  const exceptions = role === 'killer' ? STANDARD_EXCEPTIONS : SURVIVOR_EXCEPTIONS;
  const clarifications = role === 'killer' ? STANDARD_CLARIFICATIONS_WITH_ADDONS : SURVIVOR_CLARIFICATIONS;

  const checkpointRule = isSolo
    ? rawStreaks.soloCheckpointRule
    : isDuo
    ? rawStreaks.duoCheckpointRule
    : isSquad
    ? rawStreaks.squadCheckpointRule
    : rawStreaks.gauntletCheckpointRule;

  const howItWorks = [
    winCondition,
    ...(isLemonKiller
      ? [
          rawStreaks.lemonKillerTokenRule,
          <>
            {rawStreaks.lemonKillerBoostRule}
            <ul className="mt-1.5 space-y-1.5">
              {(
                [
                  ['reroll', rawStreaks.lemonKillerRerollRule],
                  ['pick', rawStreaks.lemonKillerPickRule],
                  ['slot', rawStreaks.lemonKillerSlotRule],
                  ['shield', rawStreaks.lemonKillerShieldRule],
                ] as const
              ).map(([boost, text]) => {
                const Icon = BOOST_ICONS[boost];
                return (
                  <li key={boost} className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-red" aria-hidden="true" />
                    <span>{text}</span>
                  </li>
                );
              })}
            </ul>
          </>,
          rawStreaks.lemonKillerTokenKeepRule,
        ]
      : []),
    ...(isSolo ? [rawStreaks.soloPickRule] : []),
    ...(isDuo ? [rawStreaks.duoCharactersRule, rawStreaks.duoRematchRule] : []),
    ...(isSquad ? [rawStreaks.squadCharactersRule, rawStreaks.squadRematchRule, rawStreaks.squadUniquePerkRule] : []),
    perkRule,
    checkpointRule,
    ...(isSolo ? [rawStreaks.soloPerkTierRule] : []),
    rosterCapNote,
  ];

  return (
    <RulesModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
    >
      {devNote && (
        <RulesConceptCard tone="red" title={rawStreaks.devNoteTitle} text={devNote} />
      )}

      <RulesHowItWorks tone="red" title={rawStreaks.howItWorks} items={howItWorks} />

      <RulesSection title={rawStreaks.progressiveTierRestrictions}>
        <ul className="grid grid-cols-1 gap-2.5">
          {tiers.map((tier, index) => {
            const tierName = rawStreaks[tier.nameKey];
            const streakRange = isTeam && role === 'survivor' ? TEAM_STREAK_RANGES[tier.level] : tier.streakRange;
            const perkLimitText =
              tier.perkLimit === 0
                ? (isSolo && role === 'survivor') || (isLemonKiller && role === 'killer')
                  ? rawStreaks.soloRandomPerkBadge
                  : rawStreaks.perklessTrial
                : `${tier.perkLimit} ${tier.perkLimit > 1 ? rawStreaks.perksAllowedPlural : rawStreaks.perksAllowedSingular}`;

            return (
              <li key={tier.level}>
                <Surface
                  tone="elevated" padding="none" className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold ${index === tiers.length - 1 ? LAST_TIER_COLOR : tier.badgeColor} whitespace-nowrap`}>
                      {rawStreaks.tierLabel || ''} {tier.level}{tierName ? `: ${tierName}` : ''}
                    </span>
                    <span className="text-xs font-medium text-text-muted">
                      ({streakRange})
                    </span>
                  </div>
  
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5 type-strong text-text-secondary whitespace-nowrap">
                      <PadlockHeartIcon className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{perkLimitText}</span>
                    </div>
                  </div>
                </Surface>
              </li>
            );
          })}
        </ul>
      </RulesSection>

      <RulesModalFooterSections
        copy={rawStreaks}
        tone="red"
        voidIntro={(isSolo && rawStreaks.soloVoidMatchNotice) || undefined}
        exceptions={resolveRuleEntries(rawStreaks, exceptions)}
        clarifications={resolveRuleEntries(rawStreaks, clarifications, variant)}
      />
    </RulesModalShell>
  );
};
