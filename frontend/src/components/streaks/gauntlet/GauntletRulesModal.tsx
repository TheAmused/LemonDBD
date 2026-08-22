// frontend/src/components/streaks/gauntlet/GauntletRulesModal.tsx
'use client';

import React from 'react';
import { Role } from '@/types/gauntletStreak';
import { BookOpen, AlertTriangle, Flame, Trophy, Lock } from 'lucide-react';
import { RulesModalShell } from '../RulesModalShell';

export interface GauntletRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
}

const SURVIVOR_TIERS = [
  { level: 0, name: 'The Warm Up', streakRange: 'Streak 0 to 9', perkLimit: 4, badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', description: 'Full 4 perk loadout.' },
  { level: 1, name: 'The Thinning', streakRange: 'Streak 10 to 19', perkLimit: 3, badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30', description: 'Down to 3 perks.' },
  { level: 2, name: 'The Struggle', streakRange: 'Streak 20 to 29', perkLimit: 2, badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30', description: 'Down to 2 perks.' },
  { level: 3, name: 'The Hardcore', streakRange: 'Streak 30 to 39', perkLimit: 1, badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30', description: 'Just 1 perk.' },
  { level: 4, name: 'The Legend', streakRange: 'Streak 40+', perkLimit: 0, badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30', description: 'No perks. The full perkless trial.' },
];

const KILLER_TIERS = [
  { level: 0, name: 'The Bloodbath', streakRange: 'Streak 0 to 9', perkLimit: 3, badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', description: "All 3 of your own perks." },
  { level: 1, name: 'The Obsession', streakRange: 'Streak 10 to 19', perkLimit: 2, badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30', description: "Pick any 2 of your own." },
  { level: 2, name: 'The Executioner', streakRange: 'Streak 20 to 29', perkLimit: 1, badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30', description: "Pick any 1 of your own." },
  { level: 3, name: 'The Entity', streakRange: 'Streak 30+', perkLimit: 0, badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30', description: 'No perks. The full perkless trial.' },
];

const KILLER_EXCEPTIONS: { label: string; text: React.ReactNode }[] = [
  { label: 'Game cancelled', text: 'someone left while the lobby was loading and the match never started. No reroll, same killer next queue.' },
  { label: 'Hackers', text: 'obvious cheaters void the match. No reroll, replay the same killer.' },
  { label: 'Crash or server failure', text: 'not a loss. No reroll, replay the same killer.' },
  { label: 'Survivor disconnects', text: 'keep playing. The bot match still counts.' },
  { label: 'No dodging', text: 'play whatever lobby you get, no matter the items or prestige levels.' },
  { label: 'Add-ons and offerings', text: 'are always allowed, at every tier.' },
];

const SURVIVOR_EXCEPTIONS: { label: string; text: React.ReactNode }[] = [
  { label: 'Early disconnect', text: 'a survivor leaves before any generator finishes? The match does not count either way. No reroll, play the same character next time.' },
  { label: 'Game cancelled', text: 'someone left while the lobby was loading and the match never started. No reroll, same character next queue.' },
  { label: 'Hackers', text: 'obvious cheaters on either side void the match. No reroll, replay the same character.' },
];

const SURVIVOR_CLARIFICATIONS: { label: string; text: React.ReactNode }[] = [
  { label: 'Rat off', text: 'survivors teaming up with the killer to get you out counts as a loss.' },
  { label: 'A death is a death', text: 'dying by any means during a live match counts, whether that is the killer, a hatchet, a sabotage play, or a survivor working against you.' },
  { label: 'Killer disconnects', text: 'if they rage quit after a generator is done, it counts as an escape. If they left from a bug or server issue, it does not count. No reroll, replay the same character.' },
];

export const GauntletRulesModal: React.FC<GauntletRulesModalProps> = ({ isOpen, onClose, role }) => {
  const tiers = role === 'killer' ? KILLER_TIERS : SURVIVOR_TIERS;

  return (
    <RulesModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={BookOpen}
      title={`The ${role} Gauntlet Rules`}
      subtitle="Progressive challenge rules, tier restrictions, & exception guidelines"
      iconClassName="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
      footerButtonClassName="bg-amber-500 hover:bg-amber-400 !text-slate-950 shadow-amber-500/20"
    >
      <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          Gauntlet Concept
        </h3>
        <p className="leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          Beat every {role} you own, one trial at a time. The longer your streak runs, the fewer perks
          you get to bring, until the final tier has you winning bare.
        </p>
        {role === 'killer' && (
          <>
            <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              You only ever run <strong>your own teachable perks</strong>, never anyone else&apos;s. You
              start with all 3, and lose one at every tier. Once you are below 3, you choose which ones
              to keep.
            </p>
            <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              A trial only counts as won on <strong>3 kills or more</strong>. Anything less is a loss.
            </p>
          </>
        )}
        {role === 'survivor' && (
          <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            A trial only counts as won if you <strong>escape</strong>, through the exit gates or the
            hatch. Anything else is a loss.
          </p>
        )}
        <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {role === 'killer'
            ? 'The roster stops at the 43 killers, up through The Slasher.'
            : 'The roster stops at the 52 survivors, up through Kwon Tae-young.'}
        </p>
        <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          Every 10 wins banks a <strong>checkpoint</strong>. Lose after that and you only fall back to
          your last checkpoint, not all the way to zero, though every {role} cleared since then goes
          back into the pool. Checkpoints and tiers land together, so the perk you lose and the progress
          you keep happen on the very same win.
        </p>
        <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          The build shown is just a guide. Pick your actual perks in-game, nothing to confirm here.
        </p>
        <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          The roster is locked in for the run you're on. New characters you unlock mid-run won't join until you reset, lose back to zero, or complete it.
        </p>
        <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          An in-progress run untouched for 90 days automatically counts as a loss.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-500" />
          Progressive Tier Restrictions
        </h3>
        <div className="grid grid-cols-1 gap-2.5">
          {tiers.map((tier) => (
            <div
              key={tier.level}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl gap-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${tier.badgeColor} whitespace-nowrap`}>
                  Tier {tier.level}: {tier.name}
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
                  <Lock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>
                    {tier.perkLimit === 0 ? '0 Perks (Perkless)' : `${tier.perkLimit} Perk${tier.perkLimit > 1 ? 's' : ''} Allowed`}
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
            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            Exceptions & Clarifications
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
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              Exceptions
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
              <AlertTriangle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Clarifications
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
