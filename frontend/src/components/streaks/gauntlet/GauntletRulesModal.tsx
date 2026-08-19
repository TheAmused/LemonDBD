// frontend/src/components/streaks/gauntlet/GauntletRulesModal.tsx
'use client';

import React, { useEffect } from 'react';
import { Role } from '@/types/gauntletStreak';
import { X, BookOpen, Shield, AlertTriangle, Flame, Trophy, Lock } from 'lucide-react';

export interface GauntletRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
}

const SURVIVOR_TIERS = [
  { level: 0, name: 'The Warm Up', streakRange: 'Streak 0 - 2', perkLimit: 4, badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', description: 'Standard 4-perk loadout. Build initial momentum with full setup flexibility.' },
  { level: 1, name: 'The Thinning', streakRange: 'Streak 3 - 5', perkLimit: 3, badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30', description: 'First perk slot locked. 3 perks available to test adaptability.' },
  { level: 2, name: 'The Struggle', streakRange: 'Streak 6 - 8', perkLimit: 2, badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30', description: '2 perk slots locked. Half loadout capacity remaining.' },
  { level: 3, name: 'The Hardcore', streakRange: 'Streak 9 - 11', perkLimit: 1, badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30', description: '3 perk slots locked. Only 1 perk allowed per match.' },
  { level: 4, name: 'The Legend', streakRange: 'Streak 12+', perkLimit: 0, badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30', description: 'All 4 perk slots locked. The ultimate perkless trial of skill.' },
];

const KILLER_TIERS = [
  { level: 0, name: 'The Warm Up', streakRange: 'Streak 0 - 2', perkLimit: 4, badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', description: 'Standard 4-perk loadout. Build initial momentum with full setup flexibility.' },
  { level: 1, name: 'The Restriction', streakRange: 'Streak 3 - 5', perkLimit: 3, badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30', description: 'First perk slot locked. 3 perks available to test adaptability.' },
  { level: 2, name: 'The Deprivation', streakRange: 'Streak 6 - 8', perkLimit: 2, badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30', description: '2 perk slots locked. Half loadout capacity remaining.' },
  { level: 3, name: 'The Barebones', streakRange: 'Streak 9 - 11', perkLimit: 1, badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30', description: '3 perk slots locked. Only 1 perk allowed per match.' },
  { level: 4, name: "The Entity's Chosen", streakRange: 'Streak 12+', perkLimit: 0, badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30', description: 'All 4 perk slots locked. The ultimate perkless trial of skill.' },
];

export const GauntletRulesModal: React.FC<GauntletRulesModalProps> = ({ isOpen, onClose, role }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const tiers = role === 'killer' ? KILLER_TIERS : SURVIVOR_TIERS;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight capitalize">
                The {role} Gauntlet Rules
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Progressive challenge rules, tier restrictions, & exception guidelines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 dark:text-slate-300">
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Gauntlet Concept
            </h3>
            <p className="leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              The {role} Gauntlet tests your mastery across the characters you own under escalating difficulty.
              As your win streak grows, perk slots are progressively restricted. Reaching Tier 4 requires winning
              trials with zero perks equipped!
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

          <div className="bg-slate-50 dark:bg-slate-950/80 border border-amber-500/20 rounded-xl p-4 space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              Match Invalidation Exceptions
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-700 dark:text-amber-200">DC Before 5 Gens:</strong> If a teammate or Killer disconnects before 5 generators are completed, click <strong>"DC &lt; 5 Gens"</strong> to invalidate the match. Your streak and character roster remain intact, and a fresh loadout will be re-rolled for the same target character.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-700 dark:text-amber-200">Game Cancelled:</strong> If a player disconnects during the loading screen and the match is cancelled, click <strong>"Game Cancelled"</strong> to re-roll for the same target character without penalty.
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all cursor-pointer shadow-md shadow-amber-500/20"
          >
            Got It, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
