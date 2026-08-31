'use client';
// frontend/src/components/streaks/page-streak/PageStreakRulesModal.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { BookOpen, Trophy, AlertTriangle, Snowflake, Clock } from 'lucide-react';
import { RulesModalShell, RulesModalNotices, RulesModalListSection } from '../RulesModalShell';

export interface PageStreakRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict?: Dictionary;
}

export const PageStreakRulesModal: React.FC<PageStreakRulesModalProps> = ({ isOpen, onClose, dict }) => (
  <RulesModalShell
    isOpen={isOpen}
    onClose={onClose}
    icon={BookOpen}
    title={dict?.streaks?.pageStreakRulesTitle || 'Page Streak Rules'}
    iconClassName="bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400"
    footerButtonClassName="bg-orange-600 hover:bg-orange-500"
    footerButtonLabel={dict?.streaks?.gotItLetsPlay || "Got It, Let's Play!"}
  >
    <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-2">
        <Trophy className="w-4 h-4" aria-hidden="true" />
        <span>{dict?.streaks?.pageStreakConceptLabel || 'Page Streak Concept'}</span>
      </h3>
      <p className="leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        {dict?.streaks?.pageStreakConceptShort || 'Pick a killer, then build a loadout from your perks, split across pages.'}
      </p>
    </div>

    <div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
        {dict?.streaks?.howItWorks || 'How it works'}
      </h3>
      <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed list-disc pl-4 marker:text-orange-500">
        <li>{dict?.streaks?.pageStreakKillWinCondition || 'Win = 3 kills or more.'}</li>
        <li>{dict?.streaks?.pageStreakWinCondition || 'Win a page to move to the next.'}</li>
        <li>{dict?.streaks?.pageStreakLossCondition || 'Lose and start over from page 1.'}</li>
      </ul>
    </div>

    <RulesModalListSection
      icon={AlertTriangle}
      title={dict?.streaks?.exceptions || 'Exceptions'}
      intro={dict?.streaks?.voidMatchNotice || 'These void the match. Replay it.'}
      headerColorClassName="text-orange-600 dark:text-orange-400"
      boxClassName="border-orange-500/20"
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
      headerColorClassName="text-orange-600 dark:text-orange-400"
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
        {
          label: dict?.streaks?.excAddonsAllowedLabel || 'Add-ons and offerings',
          text: dict?.streaks?.excAddonsAllowedText || 'All available.',
        },
      ]}
    />

    <RulesModalNotices
      accentClassName="border-orange-500/20 bg-orange-500/5 text-orange-800 dark:text-orange-300"
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
