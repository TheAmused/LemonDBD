'use client';
// frontend/src/components/streaks/page-streak/PageStreakRulesModal.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { BookOpen, AlertTriangle, Snowflake, Clock } from 'lucide-react';
import { RulesModalShell, RulesModalNotices, RulesModalListSection } from '../RulesModalShell';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';

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
    iconClassName="bg-accent-red/10 border-accent-red/20 text-accent-red"
    footerButtonClassName="bg-accent-red hover:bg-accent-red-hover"
    footerButtonLabel={dict?.streaks?.gotItLetsPlay || "Got It, Let's Play!"}
    dict={dict}
  >
    <div className="bg-bg-elevated border border-border-color rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-accent-red uppercase tracking-wider mb-2 flex items-center gap-2">
        <AdeptBadgeIcon className="w-4 h-4" aria-hidden="true" />
        <span>{dict?.streaks?.pageStreakConceptLabel || 'Page Streak Concept'}</span>
      </h3>
      <p className="leading-relaxed text-xs sm:text-sm text-text-secondary">
        {dict?.streaks?.pageStreakConceptShort || 'Pick a killer, then build a loadout from your perks, split across pages.'}
      </p>
    </div>

    <div>
      <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3">
        {dict?.streaks?.howItWorks || 'How it works'}
      </h3>
      <ul className="space-y-2 text-xs sm:text-sm text-text-secondary leading-relaxed list-disc pl-4 marker:text-accent-red">
        <li>{dict?.streaks?.pageStreakKillWinCondition || 'Win = 3 kills or more.'}</li>
        <li>{dict?.streaks?.pageStreakWinCondition || 'Win a page to move to the next.'}</li>
        <li>{dict?.streaks?.pageStreakLossCondition || 'Lose and start over from page 1.'}</li>
      </ul>
    </div>

    <RulesModalListSection
      icon={AlertTriangle}
      title={dict?.streaks?.exceptions || 'Exceptions'}
      intro={dict?.streaks?.voidMatchNotice || 'These void the match. Replay it.'}
      headerColorClassName="text-accent-red"
      boxClassName="border-accent-red/20"
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
      headerColorClassName="text-accent-red"
      boxClassName="border-border-color"
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
      accentClassName="border-accent-amber/20 bg-accent-amber/5 text-accent-amber"
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
