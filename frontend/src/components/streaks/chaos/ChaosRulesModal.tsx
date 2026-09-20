'use client';
// frontend/src/components/streaks/chaos/ChaosRulesModal.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { BookOpen, AlertTriangle, Flame, Snowflake, Clock } from 'lucide-react';
import { RulesModalShell, RulesModalNotices, RulesModalListSection } from '../RulesModalShell';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';

export interface ChaosRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict?: Dictionary;
}

const DIFFICULTY_ROWS = [
  {
    labelKey: 'chaosEasyLabel', defaultLabel: 'Easy',
    textKey: 'chaosEasyDesc', defaultText: 'A checkpoint banks every 5 wins.',
    badgeColor: 'bg-accent-green/20 text-accent-green border-accent-green/30',
  },
  {
    labelKey: 'chaosMediumLabel', defaultLabel: 'Medium',
    textKey: 'chaosMediumDesc', defaultText: 'A checkpoint banks every 10 wins.',
    badgeColor: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
  },
  {
    labelKey: 'chaosHellLabel', defaultLabel: 'Hell',
    textKey: 'chaosHellDesc', defaultText: 'No checkpoints.',
    badgeColor: 'bg-accent-red/20 text-accent-red border-accent-red/30',
  },
] as const;

export const ChaosRulesModal: React.FC<ChaosRulesModalProps> = ({ isOpen, onClose, dict }) => (
  <RulesModalShell
    isOpen={isOpen}
    onClose={onClose}
    icon={BookOpen}
    title={dict?.streaks?.chaosRulesTitle || 'Chaos Streak Rules'}
    iconClassName="bg-accent-red/10 border-accent-red/20 text-accent-red"
    footerButtonClassName="bg-accent-red hover:bg-accent-red-hover"
    footerButtonLabel={dict?.streaks?.gotItLetsPlay || "Got It, Let's Play!"}
    dict={dict}
  >
    <div className="bg-bg-elevated border border-border-color rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-accent-red uppercase tracking-wider mb-2 flex items-center gap-2">
        <AdeptBadgeIcon className="w-4 h-4" />
        {dict?.streaks?.chaosConcept || 'Chaos Concept'}
      </h3>
      <p className="leading-relaxed text-xs sm:text-sm text-text-secondary">
        {dict?.streaks?.chaosConceptShort ||
          'Pull the lever for 4 random perks plus 2 add-on rarities. Pick a killer to run the build, then play the trial.'}
      </p>
    </div>

    <div>
      <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3">
        {dict?.streaks?.howItWorks || 'How it works'}
      </h3>
      <ul className="space-y-2 text-xs sm:text-sm text-text-secondary leading-relaxed list-disc pl-4 marker:text-accent-red">
        <li>{dict?.streaks?.chaosWinCondition || 'Win = 3 kills or more.'}</li>
        <li>{dict?.streaks?.chaosNoRepeatRule || "Perks don't repeat until the whole pool has been drawn."}</li>
        <li>{dict?.streaks?.chaosAddonRule || 'Add-ons must match the 2 drawn rarities.'}</li>
        <li>{dict?.streaks?.chaosCheckpointRule || 'A checkpoint saves your progress, so a loss falls back to your last checkpoint instead of zero.'}</li>
        <li>{dict?.streaks?.chaosCompletionRule || 'Clear the pool with every killer to complete the run.'}</li>
      </ul>
    </div>

    <div>
      <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
        <Flame className="w-4 h-4 text-accent-red" />
        {dict?.streaks?.difficultyAndCheckpoints || 'Difficulty'}
      </h3>
      <div className="grid grid-cols-1 gap-2.5">
        {DIFFICULTY_ROWS.map((row) => (
          <div
            key={row.labelKey}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-bg-elevated border border-border-color rounded-xl gap-2 shadow-sm"
          >
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${row.badgeColor} whitespace-nowrap w-fit`}>
              {dict?.streaks?.[row.labelKey] || row.defaultLabel}
            </span>
            <p className="text-xs text-text-secondary">{dict?.streaks?.[row.textKey] || row.defaultText}</p>
          </div>
        ))}
      </div>
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
