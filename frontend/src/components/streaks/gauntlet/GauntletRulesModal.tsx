'use client';
// frontend/src/components/streaks/gauntlet/GauntletRulesModal.tsx

import React from 'react';
import { BookOpen, AlertTriangle, Flame, Trophy, Lock } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { Role } from '@/types/gauntletStreak';
import { RulesModalShell } from '../RulesModalShell';

export interface GauntletRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  dict?: Dictionary | any;
}

interface TierDefinition {
  level: number;
  nameKey: string;
  defaultName: string;
  streakRange: string;
  perkLimit: number;
  badgeColor: string;
  descKey: string;
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
    defaultName: '',
    streakRange: '0 - 9',
    perkLimit: 4,
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    descKey: 'tierWarmUpDesc',
  },
  {
    level: 1,
    nameKey: 'tierThinning',
    defaultName: '',
    streakRange: '10 - 19',
    perkLimit: 3,
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    descKey: 'tierThinningDesc',
  },
  {
    level: 2,
    nameKey: 'tierStruggle',
    defaultName: '',
    streakRange: '20 - 29',
    perkLimit: 2,
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    descKey: 'tierStruggleDesc',
  },
  {
    level: 3,
    nameKey: 'tierHardcore',
    defaultName: '',
    streakRange: '30 - 39',
    perkLimit: 1,
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    descKey: 'tierHardcoreDesc',
  },
  {
    level: 4,
    nameKey: 'tierLegend',
    defaultName: '',
    streakRange: '40+',
    perkLimit: 0,
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    descKey: 'tierLegendDesc',
  },
];

const KILLER_TIERS: TierDefinition[] = [
  {
    level: 0,
    nameKey: 'tierBloodbath',
    defaultName: '',
    streakRange: '0 - 9',
    perkLimit: 3,
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    descKey: 'tierBloodbathDesc',
  },
  {
    level: 1,
    nameKey: 'tierObsession',
    defaultName: '',
    streakRange: '10 - 19',
    perkLimit: 2,
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    descKey: 'tierObsessionDesc',
  },
  {
    level: 2,
    nameKey: 'tierExecutioner',
    defaultName: '',
    streakRange: '20 - 29',
    perkLimit: 1,
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    descKey: 'tierExecutionerDesc',
  },
  {
    level: 3,
    nameKey: 'tierEntity',
    defaultName: '',
    streakRange: '30+',
    perkLimit: 0,
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    descKey: 'tierEntityDesc',
  },
];

const KILLER_EXCEPTIONS: RuleException[] = [
  {
    labelKey: 'excGameCancelledLabel',
    defaultLabel: '',
    textKey: 'excGameCancelledText',
    defaultText: '',
  },
  {
    labelKey: 'excHackersLabel',
    defaultLabel: '',
    textKey: 'excHackersText',
    defaultText: '',
  },
  {
    labelKey: 'excCrashLabel',
    defaultLabel: '',
    textKey: 'excCrashText',
    defaultText: '',
  },
  {
    labelKey: 'excSurvDcLabel',
    defaultLabel: '',
    textKey: 'excSurvDcText',
    defaultText: '',
  },
  {
    labelKey: 'excNoDodgingLabel',
    defaultLabel: '',
    textKey: 'excNoDodgingText',
    defaultText: '',
  },
  {
    labelKey: 'excAddonsAllowedLabel',
    defaultLabel: '',
    textKey: 'excAddonsAllowedText',
    defaultText: '',
  },
];

const SURVIVOR_EXCEPTIONS: RuleException[] = [
  {
    labelKey: 'excEarlyDcLabel',
    defaultLabel: '',
    textKey: 'excEarlyDcText',
    defaultText: '',
  },
  {
    labelKey: 'excGameCancelledLabel',
    defaultLabel: '',
    textKey: 'excGameCancelledText',
    defaultText: '',
  },
  {
    labelKey: 'excHackersLabel',
    defaultLabel: '',
    textKey: 'excHackersText',
    defaultText: '',
  },
];

const SURVIVOR_CLARIFICATIONS: RuleException[] = [
  {
    labelKey: 'clarRatOffLabel',
    defaultLabel: '',
    textKey: 'clarRatOffText',
    defaultText: '',
  },
  {
    labelKey: 'clarDeathIsDeathLabel',
    defaultLabel: '',
    textKey: 'clarDeathIsDeathText',
    defaultText: '',
  },
  {
    labelKey: 'clarKillerDcLabel',
    defaultLabel: '',
    textKey: 'clarKillerDcText',
    defaultText: '',
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

  const rawStreaks = dict?.streaks || {};

  const modalTitle = rawStreaks.gauntletRulesTitle
    ? rawStreaks.gauntletRulesTitle.replace('{role}', roleLabel)
    : roleLabel;

  return (
    <RulesModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={BookOpen}
      title={modalTitle}
      subtitle={rawStreaks.gauntletRulesSubtitle || ''}
      iconClassName="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
      footerButtonClassName="bg-amber-500 hover:bg-amber-400 !text-slate-950 shadow-amber-500/20"
    >
      <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Trophy className="w-4 h-4" aria-hidden="true" />
          <span>{rawStreaks.gauntletConcept || ''}</span>
        </h3>
        <p className="leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          {rawStreaks.beatEveryPrefix || ''} {role}{' '}
          {rawStreaks.gauntletConceptBody || ''}
        </p>
        {role === 'killer' && (
          <>
            <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              {rawStreaks.youOnlyEverRun || ''} <strong>{rawStreaks.yourOwnTeachablePerks || ''}</strong>
              {rawStreaks.neverAnyoneElseNote || ''}
            </p>
            <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              {rawStreaks.trialOnlyCountsWinOn || ''} <strong>{rawStreaks.threeKillsOrMore || ''}</strong>. {rawStreaks.anythingLessLoss || ''}
            </p>
          </>
        )}
        {role === 'survivor' && (
          <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            {rawStreaks.trialOnlyCountsWinIf || ''} <strong>{rawStreaks.escape || ''}</strong>{rawStreaks.exitGatesOrHatch || ''}
          </p>
        )}
        <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {role === 'killer'
            ? (rawStreaks.killerRosterCapNote || '')
            : (rawStreaks.survivorRosterCapNote || '')}
        </p>
        <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          {rawStreaks.every10WinsBanks || ''} <strong>{rawStreaks.checkpoint || ''}</strong>
          {rawStreaks.checkpointFallbackNote || ''}{' '}
          {role}{' '}
          {rawStreaks.checkpointPoolNote || ''}
        </p>
        <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {rawStreaks.pickTheseInGame || ''}
        </p>
        <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          {rawStreaks.rosterLockedNotice || ''}
        </p>
        <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          {rawStreaks.inactivityLossNotice || ''}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-500" aria-hidden="true" />
          <span>{rawStreaks.progressiveTierRestrictions || ''}</span>
        </h3>
        <div className="grid grid-cols-1 gap-2.5" role="list">
          {tiers.map((tier) => {
            const tierName = rawStreaks[tier.nameKey] || tier.defaultName;
            const tierDesc = rawStreaks[tier.descKey] || '';
            const streakRangeFormatted = rawStreaks.streakRangeLabel
              ? rawStreaks.streakRangeLabel.replace('{range}', tier.streakRange)
              : tier.streakRange;

            const perkLimitText =
              tier.perkLimit === 0
                ? rawStreaks.perklessTierNote || ''
                : rawStreaks.perksAllowedCount
                  ? rawStreaks.perksAllowedCount.replace('{count}', String(tier.perkLimit))
                  : `${tier.perkLimit} ${tier.perkLimit > 1 ? (rawStreaks.perksAllowedPlural || '') : (rawStreaks.perksAllowedSingular || '')}`.trim();

            return (
              <div
                key={tier.level}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl gap-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${tier.badgeColor} whitespace-nowrap`}>
                    {rawStreaks.tierLabel || ''} {tier.level}{tierName ? `: ${tierName}` : ''}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    ({streakRangeFormatted})
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                  {tierDesc && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 hidden lg:block max-w-xs truncate">
                      {tierDesc}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300 text-xs bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20 whitespace-nowrap">
                    <Lock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
                    <span>{perkLimitText}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {role === 'killer' ? (
        <div className="bg-slate-50 dark:bg-slate-950/80 border border-amber-500/20 rounded-xl p-4 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" aria-hidden="true" />
            <span>{rawStreaks.exceptionsAndClarifications || ''}</span>
          </h3>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {KILLER_EXCEPTIONS.map((item) => {
              const label = rawStreaks[item.labelKey] || item.defaultLabel;
              const text = rawStreaks[item.textKey] || item.defaultText;
              if (!label && !text) return null;
              return (
                <li key={item.labelKey}>
                  {label && <strong>{label}: </strong>}
                  <span>{text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <>
          <div className="bg-slate-50 dark:bg-slate-950/80 border border-amber-500/20 rounded-xl p-4 space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" aria-hidden="true" />
              <span>{rawStreaks.exceptions || ''}</span>
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {SURVIVOR_EXCEPTIONS.map((item) => {
                const label = rawStreaks[item.labelKey] || item.defaultLabel;
                const text = rawStreaks[item.textKey] || item.defaultText;
                if (!label && !text) return null;
                return (
                  <li key={item.labelKey}>
                    {label && <strong>{label}: </strong>}
                    <span>{text}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <span>{rawStreaks.clarifications || ''}</span>
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {SURVIVOR_CLARIFICATIONS.map((item) => {
                const label = rawStreaks[item.labelKey] || item.defaultLabel;
                const text = rawStreaks[item.textKey] || item.defaultText;
                if (!label && !text) return null;
                return (
                  <li key={item.labelKey}>
                    {label && <strong>{label}: </strong>}
                    <span>{text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </RulesModalShell>
  );
};