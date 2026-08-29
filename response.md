### src/components/streaks/gauntlet/GauntletRulesModal.tsx

```tsx
'use client';

import React from 'react';
import { BookOpen, AlertTriangle, Flame, Trophy, Lock } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { Role } from '@/types/gauntletStreak';
import { RulesModalShell } from '../RulesModalShell';

export interface GauntletRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  dict?: Dictionary;
}

interface TierDefinition {
  level: number;
  name: string;
  streakRange: string;
  perkLimit: number;
  badgeColor: string;
  description: string;
}

interface RuleException {
  label: string;
  text: string;
}

const SURVIVOR_TIERS: TierDefinition[] = [
  {
    level: 0,
    name: 'The Warm Up',
    streakRange: 'Streak 0 to 9',
    perkLimit: 4,
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    description: 'Full 4 perk loadout.',
  },
  {
    level: 1,
    name: 'The Thinning',
    streakRange: 'Streak 10 to 19',
    perkLimit: 3,
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Down to 3 perks.',
  },
  {
    level: 2,
    name: 'The Struggle',
    streakRange: 'Streak 20 to 29',
    perkLimit: 2,
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    description: 'Down to 2 perks.',
  },
  {
    level: 3,
    name: 'The Hardcore',
    streakRange: 'Streak 30 to 39',
    perkLimit: 1,
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    description: 'Just 1 perk.',
  },
  {
    level: 4,
    name: 'The Legend',
    streakRange: 'Streak 40+',
    perkLimit: 0,
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    description: 'No perks. The full perkless trial.',
  },
];

const KILLER_TIERS: TierDefinition[] = [
  {
    level: 0,
    name: 'The Bloodbath',
    streakRange: 'Streak 0 to 9',
    perkLimit: 3,
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    description: 'All 3 of your own perks.',
  },
  {
    level: 1,
    name: 'The Obsession',
    streakRange: 'Streak 10 to 19',
    perkLimit: 2,
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Pick any 2 of your own.',
  },
  {
    level: 2,
    name: 'The Executioner',
    streakRange: 'Streak 20 to 29',
    perkLimit: 1,
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    description: 'Pick any 1 of your own.',
  },
  {
    level: 3,
    name: 'The Entity',
    streakRange: 'Streak 30+',
    perkLimit: 0,
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    description: 'No perks. The full perkless trial.',
  },
];

const KILLER_EXCEPTIONS: RuleException[] = [
  {
    label: 'Game cancelled',
    text: 'someone left while the lobby was loading and the match never started. No reroll, same killer next queue.',
  },
  {
    label: 'Hackers',
    text: 'obvious cheaters void the match. No reroll, replay the same killer.',
  },
  {
    label: 'Crash or server failure',
    text: 'not a loss. No reroll, replay the same killer.',
  },
  {
    label: 'Survivor disconnects',
    text: 'keep playing. The bot match still counts.',
  },
  {
    label: 'No dodging',
    text: 'play whatever lobby you get, no matter the items or prestige levels.',
  },
  {
    label: 'Add-ons and offerings',
    text: 'are always allowed, at every tier.',
  },
];

const SURVIVOR_EXCEPTIONS: RuleException[] = [
  {
    label: 'Early disconnect',
    text: 'a survivor leaves before any generator finishes? The match does not count either way. No reroll, play the same character next time.',
  },
  {
    label: 'Game cancelled',
    text: 'someone left while the lobby was loading and the match never started. No reroll, same character next queue.',
  },
  {
    label: 'Hackers',
    text: 'obvious cheaters on either side void the match. No reroll, replay the same character.',
  },
];

const SURVIVOR_CLARIFICATIONS: RuleException[] = [
  {
    label: 'Rat off',
    text: 'survivors teaming up with the killer to get you out counts as a loss.',
  },
  {
    label: 'A death is a death',
    text: 'dying by any means during a live match counts, whether that is the killer, a hatchet, a sabotage play, or a survivor working against you.',
  },
  {
    label: 'Killer disconnects',
    text: 'if they rage quit after a generator is done, it counts as an escape. If they left from a bug or server issue, it does not count. No reroll, replay the same character.',
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
    ? (dict?.filters?.killer || 'Killer')
    : (dict?.filters?.survivor || 'Survivor');

  return (
    <RulesModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={BookOpen}
      title={
        dict?.streaks?.gauntletRulesTitle
          ? dict.streaks.gauntletRulesTitle.replace('{role}', roleLabel)
          : `The ${roleLabel} Gauntlet Rules`
      }
      subtitle={dict?.streaks?.gauntletRulesSubtitle || 'Progressive challenge rules, tier restrictions, & exception guidelines'}
      iconClassName="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
      footerButtonClassName="bg-amber-500 hover:bg-amber-400 !text-slate-950 shadow-amber-500/20"
      closeButtonText={dict?.modal?.close || 'Got It'}
    >
      <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Trophy className="w-4 h-4" aria-hidden="true" />
          <span>{dict?.streaks?.gauntletConcept || 'Gauntlet Concept'}</span>
        </h3>
        <p className="leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          {dict?.streaks?.beatEveryPrefix || 'Beat every'} {role}{' '}
          {dict?.streaks?.gauntletConceptBody ||
            'you own, one trial at a time. The longer your streak runs, the fewer perks you get to bring, until the final tier has you winning bare.'}
        </p>
        {role === 'killer' && (
          <>
            <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              {dict?.streaks?.youOnlyEverRun || 'You only ever run'} <strong>{dict?.streaks?.yourOwnTeachablePerks || 'your own teachable perks'}</strong>
              {dict?.streaks?.neverAnyoneElseNote ||
                ", never anyone else's. You start with all 3, and lose one at every tier. Once you are below 3, you choose which ones to keep."}
            </p>
            <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              {dict?.streaks?.trialOnlyCountsWinOn || 'A trial only counts as won on'} <strong>{dict?.streaks?.threeKillsOrMore || '3 kills or more'}</strong>. {dict?.streaks?.anythingLessLoss || 'Anything less is a loss.'}
            </p>
          </>
        )}
        {role === 'survivor' && (
          <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            {dict?.streaks?.trialOnlyCountsWinIf || 'A trial only counts as won if you'} <strong>{dict?.streaks?.escape || 'escape'}</strong>{dict?.streaks?.exitGatesOrHatch || ', through the exit gates or the hatch. Anything else is a loss.'}
          </p>
        )}
        <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {role === 'killer'
            ? (dict?.streaks?.killerRosterCapNote || 'The roster stops at the 43 killers, up through The Slasher.')
            : (dict?.streaks?.survivorRosterCapNote || 'The roster stops at the 52 survivors, up through Kwon Tae-young.')}
        </p>
        <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          {dict?.streaks?.every10WinsBanks || 'Every 10 wins banks a'} <strong>{dict?.streaks?.checkpoint || 'checkpoint'}</strong>
          {dict?.streaks?.checkpointFallbackNote ||
            '. Lose after that and you only fall back to your last checkpoint, not all the way to zero, though every'}{' '}
          {role}{' '}
          {dict?.streaks?.checkpointPoolNote ||
            'cleared since then goes back into the pool. Checkpoints and tiers land together, so the perk you lose and the progress you keep happen on the very same win.'}
        </p>
        <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {dict?.streaks?.pickTheseInGame || 'The build shown is just a guide. Pick your actual perks in-game, nothing to confirm here.'}
        </p>
        <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          {dict?.streaks?.rosterLockedNotice || "The roster is locked in for the run you're on. New characters you unlock mid-run won't join until you reset, lose back to zero, or complete it."}
        </p>
        <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          {dict?.streaks?.inactivityLossNotice || 'An in-progress run untouched for 90 days automatically counts as a loss.'}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-500" aria-hidden="true" />
          <span>{dict?.streaks?.progressiveTierRestrictions || 'Progressive Tier Restrictions'}</span>
        </h3>
        <div className="grid grid-cols-1 gap-2.5" role="list">
          {tiers.map((tier) => (
            <div
              key={tier.level}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl gap-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${tier.badgeColor} whitespace-nowrap`}>
                  {dict?.streaks?.tierLabel || 'Tier'} {tier.level}: {tier.name}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  ({tier.streakRange})
                </span>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden lg:block max-w-xs truncate">
                  {tier.description}
                </p>
                <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300 text-xs bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20 whitespace-nowrap">
                  <Lock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
                  <span>
                    {tier.perkLimit === 0
                      ? (dict?.streaks?.perklessTierNote || '0 Perks (Perkless)')
                      : `${tier.perkLimit} ${tier.perkLimit > 1 ? (dict?.streaks?.perksAllowedPlural || 'Perks Allowed') : (dict?.streaks?.perksAllowedSingular || 'Perk Allowed')}`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {role === 'killer' ? (
        <div className="bg-slate-50 dark:bg-slate-950/80 border border-amber-500/20 rounded-xl p-4 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" aria-hidden="true" />
            <span>{dict?.streaks?.exceptionsAndClarifications || 'Exceptions & Clarifications'}</span>
          </h3>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {KILLER_EXCEPTIONS.map((item) => (
              <li key={item.label}>
                <strong>{item.label}:</strong> {item.text}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <div className="bg-slate-50 dark:bg-slate-950/80 border border-amber-500/20 rounded-xl p-4 space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" aria-hidden="true" />
              <span>{dict?.streaks?.exceptions || 'Exceptions'}</span>
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {SURVIVOR_EXCEPTIONS.map((item) => (
                <li key={item.label}>
                  <strong>{item.label}:</strong> {item.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <span>{dict?.streaks?.clarifications || 'Clarifications'}</span>
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {SURVIVOR_CLARIFICATIONS.map((item) => (
                <li key={item.label}>
                  <strong>{item.label}:</strong> {item.text}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </RulesModalShell>
  );
};

```

### src/components/streaks/page-streak/BuildBar.tsx

```tsx
'use client';

import React from 'react';
import type { Dictionary } from '@/locales/types';

interface BuildBarProps {
  selected: string[];
  size: number;
  confirmed: boolean;
  onConfirm: () => void;
  iconByPerk?: Record<string, string>;
  dict?: Dictionary;
}

const DIAMOND_CLIP_PATH = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

export const BuildBar: React.FC<BuildBarProps> = ({
  selected,
  size,
  confirmed,
  onConfirm,
  iconByPerk = {},
  dict,
}) => {
  const slots = Array.from({ length: size }, (_, i) => selected[i] ?? null);

  return (
    <div
      role="region"
      aria-label={dict?.streaks?.yourBuildForMatch || 'Perk Build Selection'}
      className="flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 p-3 shadow-sm"
    >
      {slots.map((name, index) => (
        <div
          key={index}
          className={`flex h-16 min-w-[145px] flex-1 items-center gap-2.5 rounded-lg px-3 text-xs transition-colors ${
            name
              ? 'border border-orange-500/50 bg-orange-500/10 font-semibold text-slate-900 dark:text-slate-100'
              : 'border border-dashed border-slate-300 dark:border-slate-700 font-mono text-slate-400 dark:text-slate-600'
          }`}
        >
          {name && (
            <span
              className="grid h-11 w-11 flex-none place-items-center bg-orange-400/60"
              style={{ clipPath: DIAMOND_CLIP_PATH }}
            >
              <span
                className="grid h-[82%] w-[82%] place-items-center bg-gradient-to-br from-amber-900/80 to-slate-950"
                style={{ clipPath: DIAMOND_CLIP_PATH }}
              >
                {iconByPerk[name] && (
                  <img
                    src={iconByPerk[name]}
                    alt={name}
                    className="h-[96%] w-[96%] object-contain"
                  />
                )}
              </span>
            </span>
          )}
          <span>{name ?? `${dict?.swf?.slot || 'Slot'} ${index + 1}`}</span>
        </div>
      ))}

      <button
        type="button"
        onClick={onConfirm}
        disabled={selected.length !== size || confirmed}
        className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-xs font-extrabold text-white transition-opacity disabled:opacity-40 shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      >
        {confirmed
          ? (dict?.streaks?.buildLocked || 'Build locked')
          : (dict?.streaks?.confirmBuild || 'Confirm build')}
      </button>
    </div>
  );
};

```

### src/components/streaks/page-streak/KillerRosterGrid.tsx

```tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Skull } from 'lucide-react';
import type { RosterEntry } from '@/types/pageStreak';
import type { Dictionary } from '@/locales/types';
import { staticUrl } from '@/utils/staticUrl';

interface KillerRosterGridProps {
  locale: string;
  roster: RosterEntry[];
  dict?: Dictionary;
}

const KillerPortrait: React.FC<{ name: string; src?: string; done: boolean }> = ({
  name,
  src,
  done,
}) => {
  const [imgError, setImgError] = useState<boolean>(false);

  return (
    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80">
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Skull
          className={`h-7 w-7 ${
            done
              ? 'text-emerald-500/80 dark:text-emerald-400/70'
              : 'text-slate-400 dark:text-slate-600'
          }`}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export const KillerRosterGrid: React.FC<KillerRosterGridProps> = ({
  locale,
  roster,
  dict,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" role="list">
      {roster.map((entry) => {
        const done = entry.status === 'completed';
        const active = entry.status === 'in_progress';
        const pct =
          entry.page_count > 0
            ? Math.round(((entry.current_page - 1) / entry.page_count) * 100)
            : 0;

        return (
          <Link
            key={entry.killer}
            href={`/${locale}/streaks/killer/page-streak/${encodeURIComponent(entry.killer)}`}
            className={`relative flex flex-col gap-2 rounded-xl border p-3 transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
              done
                ? 'border-emerald-500/40 bg-emerald-500/[0.07] hover:border-emerald-400/60 ps-complete-pulse'
                : active
                ? 'border-orange-500/45 bg-orange-500/[0.07] hover:border-orange-400/70'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700 dark:hover:bg-slate-900/80'
            }`}
          >
            {done && (
              <span
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 dark:bg-emerald-400 text-white dark:text-slate-950 shadow-sm"
                aria-label={dict?.streaks?.completed || 'completed'}
              >
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              </span>
            )}
            <KillerPortrait
              name={entry.killer}
              src={staticUrl(entry.avatar_local_path)}
              done={done}
            />
            <div className="text-center text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {entry.killer}
            </div>
            {active && (
              <div
                className="h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${entry.killer} progress: ${pct}%`}
              >
                <div
                  className="h-full rounded-full bg-orange-500 dark:bg-orange-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
            <div
              className={`text-center font-mono text-[10px] font-semibold ${
                done
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : active
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {done
                ? (dict?.streaks?.completed || 'completed')
                : active
                ? `${dict?.streaks?.pageLabel || 'page'} ${entry.current_page} ${dict?.streaks?.ofLabel || 'of'} ${entry.page_count}`
                : (dict?.streaks?.notStarted || 'not started')}
            </div>
          </Link>
        );
      })}
    </div>
  );
};

```

### src/components/streaks/page-streak/RunHeader.tsx

```tsx
'use client';

import React, { useState } from 'react';
import { RotateCcw, Skull, Flame, Trophy, BookOpen, BarChart2 } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { PageStreakRun } from '@/types/pageStreak';
import { FreezeBadge } from '../FreezeBadge';

interface RunHeaderProps {
  run: PageStreakRun;
  avatarSrc?: string;
  onOpenReset: () => void;
  onOpenRules: () => void;
  onOpenStats: () => void;
  dict?: Dictionary;
}

export const RunHeader: React.FC<RunHeaderProps> = ({
  run,
  avatarSrc,
  onOpenReset,
  onOpenRules,
  onOpenStats,
  dict,
}) => {
  const [imgError, setImgError] = useState<boolean>(false);
  const cleared = run.status === 'completed' ? run.page_count : run.current_page - 1;
  const pct = run.page_count > 0 ? Math.round((cleared / run.page_count) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          {avatarSrc && !imgError ? (
            <img
              src={avatarSrc}
              alt={run.killer}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <Skull className="h-7 w-7 text-slate-400 dark:text-slate-600" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold tracking-wide text-slate-900 dark:text-slate-100">
            {run.killer}
          </h2>
          <div className="mt-1 flex flex-wrap gap-4 font-mono text-[11px] text-slate-500">
            <span>
              {dict?.streaks?.attempt || 'attempt'}{' '}
              <b className="text-slate-800 dark:text-slate-200">{run.attempt}</b>
            </span>
            {run.pool_frozen && (
              <span>
                {dict?.streaks?.layoutFrozen || 'layout frozen'}{' '}
                <b className="text-slate-800 dark:text-slate-200">
                  {new Date(run.snapshot_at).toLocaleDateString()}
                </b>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <FreezeBadge frozen={run.pool_frozen} dict={dict} />
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-orange-500/30 text-orange-600 dark:text-orange-400 shadow-sm">
            <Flame className="w-5 h-5 text-orange-500 fill-orange-500/20" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold leading-none">
                {dict?.stats?.current || 'Current'}
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5 font-mono">
                {cleared}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 shadow-sm">
            <Trophy className="w-5 h-5 text-yellow-500 dark:text-yellow-400" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold leading-none">
                {dict?.stats?.best || 'Best'}
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5 font-mono">
                {run.best_page}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-orange-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-orange-400 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-colors shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            title={dict?.streaks?.rules || 'Rules'}
            aria-label={dict?.streaks?.rules || 'Rules'}
          >
            <BookOpen className="w-4 h-4 text-orange-500 dark:text-orange-400" aria-hidden="true" />
            <span className="hidden sm:inline">{dict?.streaks?.rules || 'Rules'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenStats}
            className="flex items-center justify-center p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            title={dict?.streaks?.stats || 'Statistics'}
            aria-label={dict?.streaks?.stats || 'Statistics'}
          >
            <BarChart2 className="w-5 h-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onOpenReset}
            className="flex items-center justify-center p-2.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/60 dark:text-slate-200 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            title={dict?.streaks?.resetRun || 'Reset this streak'}
            aria-label={dict?.streaks?.resetRun || 'Reset this streak'}
          >
            <RotateCcw className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-wider text-slate-500">
          <span>
            {run.status === 'completed'
              ? (dict?.streaks?.allPagesCleared || 'All pages cleared')
              : `${dict?.streaks?.pageLabel || 'Page'} ${run.current_page} ${dict?.streaks?.ofLabel || 'of'} ${run.page_count}`}
          </span>
          <span className="tabular-nums font-semibold">{pct}{dict?.streaks?.percentSign || '%'}</span>
        </div>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${dict?.stats?.progress || 'Progress'}: ${pct}%`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

```

### src/components/ChaosWheelModal.tsx

```tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Skull, Sparkles, X, Check } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { ChaosMutator } from '@/types/chaos';
import { CHAOS_MUTATORS } from '@/constants/chaosMutators';

export { CHAOS_MUTATORS };
export type { ChaosMutator };

interface ChaosWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMutator: (mutator: ChaosMutator) => void;
  activeMutator: ChaosMutator | null;
  dict?: Dictionary;
}

export const ChaosWheelModal: React.FC<ChaosWheelModalProps> = ({
  isOpen,
  onClose,
  onSelectMutator,
  activeMutator,
  dict,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const angleRef = useRef<number>(0);

  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wonMutator, setWonMutator] = useState<ChaosMutator | null>(activeMutator);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 24;

    ctx.clearRect(0, 0, size, size);

    const total = CHAOS_MUTATORS.length;
    const sliceAngle = (2 * Math.PI) / total;

    for (let i = 0; i < total; i++) {
      const startAngle = angleRef.current + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const m = CHAOS_MUTATORS[i];

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      const grad = ctx.createRadialGradient(center, center, 10, center, center, radius);
      if (m.type === 'curse') {
        grad.addColorStop(0, '#31102f');
        grad.addColorStop(1, i % 2 === 0 ? '#1e081e' : '#140414');
      } else {
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(1, '#022c22');
      }

      ctx.fillStyle = grad;
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = m.type === 'curse' ? '#9333ea' : '#10b981';
      ctx.stroke();

      ctx.save();
      ctx.translate(center, center);
      const midAngle = startAngle + sliceAngle / 2;
      ctx.rotate(midAngle);

      const normalizedAngle = ((midAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const isLeft = normalizedAngle > Math.PI / 2 && normalizedAngle < (3 * Math.PI) / 2;

      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#f8fafc';

      if (isLeft) {
        ctx.rotate(Math.PI);
        ctx.textAlign = 'left';
        ctx.fillText(`${m.icon} ${m.name}`, -(radius - 35), 4);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(`${m.icon} ${m.name}`, radius - 35, 4);
      }

      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(center, center, 42, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CHAOS', center, center - 4);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 9px system-ui, sans-serif';
    ctx.fillText('WHEEL', center, center + 10);

    ctx.beginPath();
    ctx.moveTo(center - 16, 4);
    ctx.lineTo(center + 16, 4);
    ctx.lineTo(center, 34);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (isOpen) {
      drawWheel();
    }
  }, [isOpen, drawWheel]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const spinChaosWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWonMutator(null);

    const total = CHAOS_MUTATORS.length;
    const sliceAngle = (2 * Math.PI) / total;
    const winningIdx = Math.floor(Math.random() * total);

    const targetAngle = (3 * Math.PI) / 2 - winningIdx * sliceAngle - sliceAngle / 2;
    const startAngle = angleRef.current;
    const fullSpins = 6 * 2 * Math.PI;
    const finalAngle = startAngle + fullSpins + (targetAngle - (startAngle % (2 * Math.PI)));

    const startTime = performance.now();
    const duration = 3000;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 4);

      angleRef.current = startAngle + (finalAngle - startAngle) * easeOut;
      drawWheel();

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        angleRef.current = finalAngle % (2 * Math.PI);
        drawWheel();
        setIsSpinning(false);
        const won = CHAOS_MUTATORS[winningIdx];
        setWonMutator(won);
        onSelectMutator(won);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chaos-modal-title"
      aria-describedby="chaos-modal-desc"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md cursor-pointer animate-in fade-in duration-200 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl border border-purple-500/30 bg-white dark:bg-slate-900 p-6 shadow-2xl text-slate-900 dark:text-slate-100 cursor-default animate-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={dict?.modal?.close || 'Close modal'}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 dark:bg-purple-900/50 border border-purple-500/30 text-purple-600 dark:text-purple-300 shadow-sm" aria-hidden="true">
            <Skull className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h2 id="chaos-modal-title" className="text-lg font-black tracking-wide text-slate-900 dark:text-white">
              {dict?.generator?.chaosWheelTitle || 'Chaos Wheel of Curses'}
            </h2>
            <p id="chaos-modal-desc" className="text-xs text-slate-600 dark:text-slate-400">
              {dict?.generator?.chaosWheelDesc || 'Spin to apply a single trial Curse or Buff to your 4 perk loadout.'}
            </p>
          </div>
        </div>

        <div className="relative flex flex-col items-center justify-center my-4">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            aria-label={dict?.generator?.chaosWheelTitle || 'Chaos Wheel of Curses Canvas'}
            className="h-[300px] w-[300px] sm:h-[360px] sm:w-[360px] drop-shadow-[0_0_25px_rgba(147,51,234,0.3)]"
          />

          <button
            type="button"
            onClick={spinChaosWheel}
            disabled={isSpinning}
            className={`mt-4 flex items-center gap-2 rounded-2xl px-6 py-3 font-extrabold text-sm shadow-lg transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
              isSpinning
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 via-rose-600 to-amber-600 text-white hover:brightness-110 active:scale-95 shadow-purple-900/40'
            }`}
          >
            <Sparkles className={`h-4 w-4 ${isSpinning ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>
              {isSpinning
                ? (dict?.generator?.spinningCurses || 'Spinning Chaos Curses...')
                : (dict?.generator?.spinChaosWheel || 'Spin Chaos Wheel!')}
            </span>
          </button>
        </div>

        {wonMutator && (
          <div
            aria-live="polite"
            className={`mt-4 rounded-2xl border p-4 backdrop-blur-sm transition-all shadow-sm ${wonMutator.badgeBg} ${wonMutator.borderColor}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl" aria-hidden="true">
                  {wonMutator.icon}
                </span>
                <div>
                  <h3 className={`text-sm font-extrabold ${wonMutator.textColor}`}>
                    {wonMutator.name}
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                    {wonMutator.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{dict?.smashOrPass?.active || 'Active'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-2.5 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            {dict?.modal?.done || dict?.generator?.done || 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};

```