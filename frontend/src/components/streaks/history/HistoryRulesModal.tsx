'use client';
// frontend/src/components/streaks/history/HistoryRulesModal.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { BookOpen, Trophy, Flame, AlertTriangle, Snowflake, Clock } from 'lucide-react';
import { RulesModalShell, RulesModalNotices, RulesModalListSection } from '../RulesModalShell';

export interface HistoryRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict?: Dictionary;
}

export const HistoryRulesModal: React.FC<HistoryRulesModalProps> = ({ isOpen, onClose, dict }) => (
  <RulesModalShell
    isOpen={isOpen}
    onClose={onClose}
    icon={BookOpen}
    title={dict?.streaks?.historyRulesTitle || 'History Streak Rules'}
    iconClassName="bg-bg-elevated border-border-color text-text-secondary"
    footerButtonClassName="bg-accent-red hover:bg-accent-red-hover"
    footerButtonLabel={dict?.streaks?.gotItLetsPlay || "Got It, Let's Play!"}
    dict={dict}
  >
    <div className="bg-bg-elevated border border-border-color rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
        <Trophy className="w-4 h-4" />
        {dict?.streaks?.historyConceptLabel || 'History Concept'}
      </h3>
      <p className="leading-relaxed text-xs sm:text-sm text-text-secondary">
        {dict?.streaks?.historyConceptShort ||
          'Killers are grouped into rows of 5, sorted by release order. Clear a row to unlock the next.'}
      </p>
    </div>

    <div>
      <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3">
        {dict?.streaks?.howItWorks || 'How it works'}
      </h3>
      <ul className="space-y-2 text-xs sm:text-sm text-text-secondary leading-relaxed list-disc pl-4 marker:text-text-muted">
        <li>{dict?.streaks?.historyWinCondition || 'Win = 3 kills or more. Anything less breaks the streak.'}</li>
        <li>{dict?.streaks?.historyStartingPerksNote || 'You start with every General perk unlocked.'}</li>
        <li>{dict?.streaks?.historyPerkUnlockRule || 'Beating a killer adds their teachables to your pool.'}</li>
        <li>{dict?.streaks?.historyCheckpointRule || 'A checkpoint saves your progress, so a loss falls back to your last checkpoint instead of zero.'}</li>
      </ul>
      <p className="mt-3 leading-relaxed text-xs sm:text-sm text-text-muted italic">
        {dict?.streaks?.historyConceptHint || 'For the full experience try to play killers in order from the oldest to newest. 🙂'}
      </p>
    </div>

    <div>
      <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
        <Flame className="w-4 h-4 text-accent-red" />
        {dict?.streaks?.difficultyAndCheckpoints || 'Difficulty'}
      </h3>
      <div className="grid grid-cols-1 gap-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-bg-elevated border border-border-color rounded-xl gap-2 shadow-sm">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-accent-amber/20 text-accent-amber border-accent-amber/30 whitespace-nowrap w-fit">
            {dict?.streaks?.mediumMode || 'Medium'}
          </span>
          <p className="text-xs text-text-secondary sm:text-right sm:max-w-xs">
            {dict?.streaks?.mediumModeDesc || 'Checkpoint every row.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-bg-elevated border border-border-color rounded-xl gap-2 shadow-sm">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-accent-red/20 text-accent-red border-accent-red/30 whitespace-nowrap w-fit">
            {dict?.streaks?.hellMode || 'Hell'}
          </span>
          <p className="text-xs text-text-secondary sm:text-right sm:max-w-xs">
            {dict?.streaks?.hellModeDesc || 'No checkpoints.'}
          </p>
        </div>
      </div>
    </div>

    <RulesModalListSection
      icon={AlertTriangle}
      title={dict?.streaks?.exceptions || 'Exceptions'}
      intro={dict?.streaks?.voidMatchNotice || 'These void the match. Replay it.'}
      headerColorClassName="text-text-secondary"
      boxClassName="border-border-color"
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
      headerColorClassName="text-text-secondary"
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
      accentClassName="border-border-color bg-bg-elevated text-text-secondary"
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
