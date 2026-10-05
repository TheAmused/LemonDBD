'use client';
// frontend/src/components/streaks/gauntlet/GauntletRulesModal.tsx

import React from 'react';
import { Lock } from 'lucide-react';
import { BOOST_ICONS } from './boostIcons';
import type { Dictionary } from '@/locales/types';
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
  streakCopy,
  type RuleEntryDef,
} from '../RulesModalSections';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";

export interface GauntletRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  gameMode?: GauntletGameMode;
}

interface TierDefinition {
  level: number;
  nameKey: string;
  defaultName: string;
  streakRange: string;
  perkLimit: number;
  badgeColor: string;
}

const SURVIVOR_TIERS: TierDefinition[] = [
  {
    level: 0,
    nameKey: 'tierWarmUp',
    defaultName: 'The Warm Up',
    streakRange: '1 - 10',
    perkLimit: 4,
    badgeColor: 'bg-accent-green/20 text-accent-green border-accent-green/30',
  },
  {
    level: 1,
    nameKey: 'tierThinning',
    defaultName: 'The Thinning',
    streakRange: '11 - 20',
    perkLimit: 3,
    badgeColor: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
  },
  {
    level: 2,
    nameKey: 'tierStruggle',
    defaultName: 'The Struggle',
    streakRange: '21 - 30',
    perkLimit: 2,
    badgeColor: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
  },
  {
    level: 3,
    nameKey: 'tierHardcore',
    defaultName: 'The Hardcore',
    streakRange: '31 - 40',
    perkLimit: 1,
    badgeColor: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
  },
  {
    level: 4,
    nameKey: 'tierLegend',
    defaultName: 'The Legend',
    streakRange: '41 - 52',
    perkLimit: 0,
    badgeColor: 'bg-accent-red/20 text-accent-red border-accent-red/30',
  },
];

// Duo and squad step a tier every 6 wins.
const TEAM_STREAK_RANGES = ['1 - 6', '7 - 12', '13 - 18', '19 - 26'];

const KILLER_TIERS: TierDefinition[] = [
  {
    level: 0,
    nameKey: 'tierBloodbath',
    defaultName: 'The Bloodbath',
    streakRange: '1 - 10',
    perkLimit: 3,
    badgeColor: 'bg-accent-green/20 text-accent-green border-accent-green/30',
  },
  {
    level: 1,
    nameKey: 'tierObsession',
    defaultName: 'The Obsession',
    streakRange: '11 - 20',
    perkLimit: 2,
    badgeColor: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
  },
  {
    level: 2,
    nameKey: 'tierExecutioner',
    defaultName: 'The Executioner',
    streakRange: '21 - 30',
    perkLimit: 1,
    badgeColor: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
  },
  {
    level: 3,
    nameKey: 'tierEntity',
    defaultName: 'The Entity',
    streakRange: '31 - 43',
    perkLimit: 0,
    badgeColor: 'bg-accent-red/20 text-accent-red border-accent-red/30',
  },
];

const SURVIVOR_EXCEPTIONS: RuleEntryDef[] = [
  {
    labelKey: 'excEarlyDcLabel',
    defaultLabel: 'Early disconnect',
    textKey: 'excEarlyDcText',
    defaultText: 'A teammate leaves before any generator is finished.',
  },
  RULE_GAME_CANCELLED,
  RULE_HACKERS,
  RULE_CRASH,
];

const SURVIVOR_CLARIFICATIONS: RuleEntryDef[] = [
  RULE_ADDONS_ALLOWED,
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
    variantTextKeys: { solo: 'soloKillerDcText', duo: 'duoKillerDcText', squad: 'squadKillerDcText' },
    defaultText:
      "If the killer leaves before the first generator is done, or leaves because of a bug or server issue, the match doesn't count. If they leave after the first generator is done for any other reason, it counts as your escape.",
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

  const rawStreaks = streakCopy(dict);

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
    ? (rawStreaks.gauntletWinConditionKiller || 'Win = 3 kills or more.')
    : (rawStreaks.gauntletWinConditionSurvivor || 'Win = escape, through the exit gates or the hatch. Anything else breaks the streak.');

  const perkRule = role === 'killer'
    ? (isLemonKiller && rawStreaks.lemonKillerPerkRule) || (rawStreaks.gauntletKillerPerkRule || 'You always run your own teachables.')
    : (isSolo && rawStreaks.soloPerkRule) ||
      rawStreaks.gauntletSurvivorPerkRule ||
      "One of your perks has to be the drawn character's own.";

  const rosterCapNote = role === 'killer'
    ? (rawStreaks.killerRosterCapNote || 'The roster stops at the 43 killers, up through The Slasher.')
    : (rawStreaks.survivorRosterCapNote || 'The roster stops at the 52 survivors, up through Kwon Tae-young.');

  const variant = isSolo ? 'solo' : isDuo ? 'duo' : isSquad ? 'squad' : undefined;
  const exceptions = role === 'killer' ? STANDARD_EXCEPTIONS : SURVIVOR_EXCEPTIONS;
  const clarifications = role === 'killer' ? STANDARD_CLARIFICATIONS_WITH_ADDONS : SURVIVOR_CLARIFICATIONS;

  const checkpointRule = isSolo
    ? rawStreaks.soloCheckpointRule
    : isDuo
    ? rawStreaks.duoCheckpointRule
    : isSquad
    ? rawStreaks.squadCheckpointRule
    : rawStreaks.gauntletCheckpointRule || 'You get a checkpoint every 10 wins, so a loss only falls back that far, not to zero.';

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
    ...(isSolo ? [rawStreaks.soloHalfWinRule, rawStreaks.soloPickRule] : []),
    ...(isDuo ? [rawStreaks.duoCharactersRule, rawStreaks.duoRematchRule, rawStreaks.duoHatchRule] : []),
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
        <RulesConceptCard tone="red" title={rawStreaks.devNoteTitle || 'Note from the devs'} text={devNote} />
      )}

      <RulesHowItWorks tone="red" title={rawStreaks.howItWorks || 'How it works'} items={howItWorks} />

      <RulesSection title={rawStreaks.progressiveTierRestrictions || 'Progressive Tier Restrictions'}>
        <div className="grid grid-cols-1 gap-2.5" role="list">
          {tiers.map((tier) => {
            const tierName = rawStreaks[tier.nameKey] || tier.defaultName;
            const streakRange = isTeam && role === 'survivor' ? TEAM_STREAK_RANGES[tier.level] : tier.streakRange;
            const streakRangeFormatted = rawStreaks.streakRangeLabel
              ? formatMessage(rawStreaks.streakRangeLabel, { range: streakRange })
              : streakRange;

            const perkLimitText =
              tier.perkLimit === 0
                ? (isSolo && role === 'survivor') || (isLemonKiller && role === 'killer')
                  ? rawStreaks.soloRandomPerkBadge || '1 random unique perk'
                  : rawStreaks.perklessTrial || '0 Perks'
                : rawStreaks.perksAllowedCount
                  ? formatMessage(rawStreaks.perksAllowedCount, { count: tier.perkLimit })
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
                  <div className="flex items-center gap-1.5 type-strong text-text-secondary whitespace-nowrap">
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{perkLimitText}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
