'use client';
// frontend/src/components/streaks/StreakHeader.tsx
import { Button } from '@/components/common/Button';
import { tip } from '@/components/common/Tooltip';
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { BarChart2, History, RotateCcw } from 'lucide-react';
import { FreezeBadge } from './FreezeBadge';

export interface StreakHeaderStat {
  key: string;
  label: string;
  value: React.ReactNode;
  /** Only shown in the roomy variant; the compact variant is label + value inline. */
  icon?: React.ReactNode;
}

export interface StreakHeaderAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export interface StreakHeaderProps {
  /** `roomy` is the tall board header (Chaos); `compact` the slim one (Gauntlet). */
  variant: 'roomy' | 'compact';
  imageSrc: string;
  /** Contents of the <h1>, e.g. a difficulty icon + "Easy Chaos Streak". */
  title: React.ReactNode;
  /** Small pill next to the title (compact variant), e.g. the lemon mode label. */
  titleBadge?: string;
  poolFrozen?: boolean;
  stats: StreakHeaderStat[];
  /** Text buttons shown before the icon-only Stats / Past Wins / Reset buttons. */
  actions: StreakHeaderAction[];
  onOpenStats: () => void;
  onOpenHistory: () => void;
  onOpenReset: () => void;
  dict?: Dictionary;
}

const STAT_BOX = 'rounded-xl bg-bg-elevated border border-border-color text-text-secondary shadow-sm';

const VARIANT = {
  roomy: {
    wrapper: 'p-4 sm:p-6 mb-6',
    row: 'gap-4',
    titleWrap: 'gap-3',
    image: 'h-11 w-11',
    h1: 'text-2xl sm:text-3xl flex items-center gap-2 justify-center sm:justify-start',
    controls: 'gap-3',
  },
  compact: {
    wrapper: 'p-3 sm:p-4 mb-4',
    row: 'gap-3',
    titleWrap: 'gap-2.5 justify-center sm:justify-start shrink-0',
    image: 'h-8 w-8 shrink-0',
    h1: 'text-xl sm:text-2xl whitespace-nowrap',
    controls: 'gap-2.5',
  },
} as const;

/**
 * Shared board header for the Chaos and Gauntlet streak modes: title row,
 * current/best/checkpoint counters, labelled action buttons, and the
 * Stats / Past Wins / Reset icon buttons. The two used to be near-identical
 * copies differing only in density and a few extra buttons.
 */
export const StreakHeader: React.FC<StreakHeaderProps> = ({
  variant,
  imageSrc,
  title,
  titleBadge,
  poolFrozen = false,
  stats,
  actions,
  onOpenStats,
  onOpenHistory,
  onOpenReset,
  dict,
}) => {
  const v = VARIANT[variant];
  const roomy = variant === 'roomy';
  const iconButtons = [
    { key: 'stats', label: dict?.streaks?.stats || 'Statistics', icon: <BarChart2 className="w-5 h-5" />, onClick: onOpenStats },
    { key: 'history', label: dict?.streaks?.pastWins || 'Past Wins', icon: <History className="w-5 h-5" />, onClick: onOpenHistory },
    { key: 'reset', label: dict?.streaks?.resetRun || 'Reset this run', icon: <RotateCcw className="w-5 h-5" />, onClick: onOpenReset },
  ];

  return (
    <div className={`w-full bg-bg-surface/90 border border-border-color rounded-2xl backdrop-blur-md shadow-sm ${v.wrapper}`}>
      <div className={`flex flex-col md:flex-row items-center justify-between ${v.row}`}>
        <div className={`flex items-center ${v.titleWrap}`}>
          <img src={imageSrc} alt="" className={`hidden sm:block object-contain ${v.image}`} />
          <h1 className={`font-extrabold text-text-primary tracking-tight ${v.h1}`}>{title}</h1>
          {titleBadge && (
            <span className="rounded-full border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-0.5 type-label-2xs text-accent-amber">
              {titleBadge}
            </span>
          )}
        </div>
        <div className={`flex flex-wrap items-center justify-center w-full md:w-auto ${v.controls}`}>
          <FreezeBadge frozen={poolFrozen} compact={!roomy} dict={dict} />
          {stats.map((stat) =>
            roomy ? (
              <div key={stat.key} className={`flex items-center gap-2.5 px-3.5 py-2 ${STAT_BOX}`}>
                {stat.icon}
                <div className="flex flex-col">
                  <span className="text-tiny uppercase tracking-wider text-text-muted font-bold leading-none">
                    {stat.label}
                  </span>
                  <span className="text-lg font-black text-text-primary leading-none mt-0.5">
                    {stat.value}
                  </span>
                </div>
              </div>
            ) : (
              <div key={stat.key} className={`flex items-center gap-1.5 px-3 py-2 ${STAT_BOX}`}>
                <span className="type-label-2xs text-text-muted">{stat.label}</span>
                <span className="type-card-title text-text-primary">{stat.value}</span>
              </div>
            )
          )}

          {actions.map((action) => (
            <Button
              key={action.key}
              variant="secondary"
              size="md"
              onClick={action.onClick}
              {...tip(action.label, undefined, 'action')}
              aria-label={action.label}
            >
              {action.icon}
              <span className="hidden sm:inline">{action.label}</span>
            </Button>
          ))}

          {iconButtons.map((btn) => (
            <Button
              key={btn.key}
              variant="secondary"
              size="md"
              icon
              onClick={btn.onClick}
              {...tip(btn.label, undefined, 'action')}
              aria-label={btn.label}
            >
              {btn.icon}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
