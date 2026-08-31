'use client';
// frontend/src/components/streaks/chaos/ChaosRulesModal.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { BookOpen, AlertTriangle, Trophy, Flame, Snowflake, Clock } from 'lucide-react';
import { RulesModalShell, RulesModalNotices, RulesModalListSection } from '../RulesModalShell';

export interface ChaosRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict?: Dictionary;
}

const DIFFICULTY_ROWS = [
  {
    labelKey: 'chaosEasyLabel', defaultLabel: 'Easy',
    textKey: 'chaosEasyDesc', defaultText: 'A checkpoint banks every 5 wins.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  {
    labelKey: 'chaosMediumLabel', defaultLabel: 'Medium',
    textKey: 'chaosMediumDesc', defaultText: 'A checkpoint banks every 10 wins.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  {
    labelKey: 'chaosHellLabel', defaultLabel: 'Hell',
    textKey: 'chaosHellDesc', defaultText: 'No checkpoints.',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
] as const;

export const ChaosRulesModal: React.FC<ChaosRulesModalProps> = ({ isOpen, onClose, dict }) => (
  <RulesModalShell
    isOpen={isOpen}
    onClose={onClose}
    icon={BookOpen}
    title={dict?.streaks?.chaosRulesTitle || 'Chaos Streak Rules'}
    iconClassName="bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400"
    footerButtonClassName="bg-violet-600 hover:bg-violet-500 shadow-violet-500/20"
    footerButtonLabel={dict?.streaks?.gotItLetsPlay || "Got It, Let's Play!"}
  >
    <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2 flex items-center gap-2">
        <Trophy className="w-4 h-4" />
        {dict?.streaks?.chaosConcept || 'Chaos Concept'}
      </h3>
      <p className="leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        {dict?.streaks?.chaosConceptShort ||
          'Pull the lever for 4 random perks plus 2 add-on rarities. Pick a killer to run the build, then play the trial.'}
      </p>
    </div>

    <div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
        {dict?.streaks?.howItWorks || 'How it works'}
      </h3>
      <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed list-disc pl-4 marker:text-violet-500">
        <li>{dict?.streaks?.chaosWinCondition || 'Win = 3 kills or more.'}</li>
        <li>{dict?.streaks?.chaosNoRepeatRule || "Perks don't repeat until the whole pool has been drawn."}</li>
        <li>{dict?.streaks?.chaosAddonRule || 'Add-ons must match the 2 drawn rarities.'}</li>
        <li>{dict?.streaks?.chaosCheckpointRule || 'A checkpoint saves your progress, so a loss falls back to your last checkpoint instead of zero.'}</li>
        <li>{dict?.streaks?.chaosCompletionRule || 'Clear the pool with every killer to complete the run.'}</li>
      </ul>
    </div>

    <div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
        <Flame className="w-4 h-4 text-violet-500" />
        {dict?.streaks?.difficultyAndCheckpoints || 'Difficulty'}
      </h3>
      <div className="grid grid-cols-1 gap-2.5">
        {DIFFICULTY_ROWS.map((row) => (
          <div
            key={row.labelKey}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl gap-2 shadow-sm"
          >
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${row.badgeColor} whitespace-nowrap w-fit`}>
              {dict?.streaks?.[row.labelKey] || row.defaultLabel}
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-300">{dict?.streaks?.[row.textKey] || row.defaultText}</p>
          </div>
        ))}
      </div>
    </div>

    <RulesModalListSection
      icon={AlertTriangle}
      title={dict?.streaks?.exceptions || 'Exceptions'}
      intro={dict?.streaks?.voidMatchNotice || 'These void the match. Replay it.'}
      headerColorClassName="text-violet-600 dark:text-violet-400"
      boxClassName="border-violet-500/20"
      items={[
        {
          label: dict?.streaks?.excGameCancelledLabel || 'Game cancelled',
          text: dict?.streaks?.excGameCancelledText || 'Someone leaves the lobby before it finishes loading and the match never starts.',
        },
        {
          label: dict?.streaks?.excHackersLabel || 'Hackers',
          text: dict?.streaks?.excHackersText || 'Obvious cheaters are in the match.',
        },
        {
          label: dict?.streaks?.excCrashLabel || 'Crash or server failure',
          text: dict?.streaks?.excCrashText || 'The game or server crashes mid-match.',
        },
      ]}
    />

    <RulesModalListSection
      icon={AlertTriangle}
      title={dict?.streaks?.clarifications || 'Clarifications'}
      headerColorClassName="text-violet-600 dark:text-violet-400"
      boxClassName="border-slate-200 dark:border-slate-800/80"
      items={[
        {
          label: dict?.streaks?.excSurvDcLabel || 'Survivor disconnects',
          text: dict?.streaks?.excSurvDcText || 'Keep playing. The bot match still counts.',
        },
        {
          label: dict?.streaks?.excNoDodgingLabel || 'No dodging',
          text: dict?.streaks?.excNoDodgingText || 'Play whatever lobby you get.',
        },
      ]}
    />

    <RulesModalNotices
      accentClassName="border-violet-500/20 bg-violet-500/5 text-violet-800 dark:text-violet-300"
      notices={[
        {
          icon: Snowflake,
          text: dict?.streaks?.runFreezeNotice ||
            'Your run freezes. New unlocks join after your next reset, loss to zero, or completion.',
        },
        {
          icon: Clock,
          text: dict?.streaks?.inactivityLossNotice || 'An in-progress run untouched for 90 days automatically counts as a loss.',
        },
      ]}
    />
  </RulesModalShell>
);
