// frontend/src/components/streaks/chaos/ChaosRulesModal.tsx
'use client';

import React from 'react';
import { BookOpen, AlertTriangle, Trophy, Dices } from 'lucide-react';
import { RulesModalShell } from '../RulesModalShell';

export interface ChaosRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict?: any;
}

const DIFFICULTY_ROWS = [
  { label: 'Easy', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', text: 'A checkpoint banks every 5 wins.' },
  { label: 'Medium', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30', text: 'A checkpoint banks every 10 wins.' },
  { label: 'Hell', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30', text: 'No checkpoints. One loss resets everything.' },
];

export const ChaosRulesModal: React.FC<ChaosRulesModalProps> = ({ isOpen, onClose, dict }) => (
  <RulesModalShell
    isOpen={isOpen}
    onClose={onClose}
    icon={BookOpen}
    title={dict?.streaks?.chaosRulesTitle || 'Chaos Streak Rules'}
    subtitle={dict?.streaks?.chaosRulesSubtitle || 'How the draw, the pick, and the checkpoints work'}
    iconClassName="bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400"
    footerButtonClassName="bg-violet-600 hover:bg-violet-500 shadow-violet-500/20"
  >
    <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2 flex items-center gap-2">
        <Dices className="w-4 h-4" />
        {dict?.streaks?.chaosConcept || 'Chaos Concept'}
      </h3>
      <p className="leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        {dict?.streaks?.chaosConceptDesc || 'Pull the lever to draw 4 random perks from every unlocked killer perk you own, plus 2 addon rarity requirements. Nothing repeats until the whole pool has been drawn once. Then you pick which of your remaining killers plays the round, accept the pick, and play the trial with that build as your guide.'}
      </p>
      <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        <strong>{dict?.streaks?.threeKillsOrMoreWin || 'A round only counts as won on 3 kills or more.'}</strong> {dict?.streaks?.anythingLessLoss || 'Anything less is a loss.'}
      </p>
      <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        {dict?.streaks?.chaosAddonRequirement || 'You must play the killer with addons matching the 2 drawn rarities.'}
      </p>
      <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        {dict?.streaks?.chaosWinRun || 'Win with every killer you own on this difficulty and the run is complete.'}
      </p>
      <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        {dict?.streaks?.poolLockedNotice || "The pool is locked in for the run you're on. New killers or perks you unlock mid-run won't join until you reset, lose back to zero, or complete it."}
      </p>
      <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        {dict?.streaks?.inactivityLossNotice || 'An in-progress run untouched for 90 days automatically counts as a loss.'}
      </p>
    </div>

    <div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-violet-500" />
        {dict?.streaks?.difficultyAndCheckpoints || 'Difficulty & Checkpoints'}
      </h3>
      <div className="grid grid-cols-1 gap-2.5">
        {DIFFICULTY_ROWS.map((row) => (
          <div
            key={row.label}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl gap-2 shadow-sm"
          >
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${row.badgeColor} whitespace-nowrap w-fit`}>
              {row.label}
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-300">{row.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 leading-relaxed text-xs sm:text-sm text-slate-500 dark:text-slate-400">
        {dict?.streaks?.difficultyCheckpointsDesc || 'Losing after a checkpoint only falls back to that checkpoint, not to zero, though every killer cleared since then goes back into the pool.'}
      </p>
    </div>

    <div className="bg-slate-50 dark:bg-slate-950/80 border border-violet-500/20 rounded-xl p-4 space-y-2 shadow-sm">
      <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-violet-500 dark:text-violet-400" />
        {dict?.streaks?.exceptionsAndClarifications || 'Exceptions & Clarifications'}
      </h3>
      <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <li>
          <strong>{dict?.streaks?.gameCancelled || 'Game cancelled:'}</strong> {dict?.streaks?.gameCancelledDesc || 'someone left while the lobby was loading and the match never started. No reroll, replay the same build.'}
        </li>
        <li>
          <strong>{dict?.streaks?.hackers || 'Hackers:'}</strong> {dict?.streaks?.hackersDesc || 'obvious cheaters void the match. No reroll, replay the same build.'}
        </li>
        <li>
          <strong>{dict?.streaks?.crashServerFailure || 'Crash or server failure:'}</strong> {dict?.streaks?.crashServerFailureDesc || 'not a loss. No reroll, replay the same build.'}
        </li>
        <li>
          <strong>{dict?.streaks?.noDodging || 'No dodging:'}</strong> {dict?.streaks?.noDodgingDesc || 'play whatever lobby you get, no matter the items.'}
        </li>
      </ul>
    </div>
  </RulesModalShell>
);
