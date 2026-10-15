'use client';
// frontend/src/components/streaks/ChallengePanel.tsx

import React, { useState } from 'react';
import { BarChart2, BookOpen, ChevronDown, History, RotateCcw, Clapperboard } from 'lucide-react';
import { CELEBRATION_CARD_CLASSES, CELEBRATION_LABEL_CLASSES, CelebrationBadge } from './CelebrationBadge';
import { useDictionary } from "@/context/DictionaryContext";
import { useChallengeAnimations } from './useChallengeAnimations';

import { Button } from '@/components/common/Button';
import { Collapsible } from '@/components/common/Collapsible';
import { cn } from '@/utils/cn';
import { Surface } from '@/components/common/Surface';
interface ChallengePanelProps {
  /** Stats and actions strip, rendered as the top section of the card. */
  header: React.ReactNode;
  /** Optional progress strip between the header and the main panel. */
  progress?: React.ReactNode;
  children: React.ReactNode;
}

/** One card holding a challenge's header strip and its main panel. No backdrop filter or
 * transform here: it would trap the fixed StreakActionBar rendered inside the card. */
export const ChallengePanel: React.FC<ChallengePanelProps> = ({ header, progress, children }) => (
  <Surface as="section" padding="none" className="mb-6 w-full overflow-hidden shadow-sm">
    <div className="border-b border-border-color bg-bg-elevated/40 px-3 py-3 sm:px-4">{header}</div>
    {progress && <div className="border-b border-border-color px-3 pt-3 pb-1 sm:px-6 sm:pt-5 sm:pb-4">{progress}</div>}
    <div className="p-3 sm:p-4">{children}</div>
  </Surface>
);

interface ChallengeHeaderLayoutProps {
  stats: React.ReactNode;
  actions: React.ReactNode;
}

/** Splits the header strip into a stats zone and an actions zone. */
export const ChallengeHeaderLayout: React.FC<ChallengeHeaderLayoutProps> = ({ stats, actions }) => (
  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-2 sm:flex sm:flex-wrap sm:justify-between sm:gap-x-4 sm:gap-y-3">
    <div className="contents sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">{stats}</div>
    <div className="contents sm:ml-auto sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-2.5">{actions}</div>
  </div>
);

const MODE_DOT_TONES = {
  green: 'bg-accent-green',
  amber: 'bg-accent-amber',
  red: 'bg-accent-red',
} as const;

interface ModeSelectButtonProps {
  label: string;
  /** Colors the dot: green easy, amber medium, red hell. */
  tone: keyof typeof MODE_DOT_TONES;
  /** Opens the difficulty or mode picker. Without it the button shows the value and does nothing. */
  onClick?: () => void;
  title: string;
}

/** The current difficulty or mode, doubling as the control that changes it. */
export const ModeSelectButton: React.FC<ModeSelectButtonProps> = ({ label, tone, onClick, title }) => {
  const content = (
    <>
      <span className={`h-2.5 w-2.5 rounded-full ${MODE_DOT_TONES[tone]}`} aria-hidden="true" />
      <span className="type-label-sm max-w-[9rem] truncate text-text-primary">{label}</span>
      {onClick && <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden="true" />}
    </>
  );

  return onClick ? (
    <Button variant="secondary" onClick={onClick} aria-label={`${title}: ${label}`} className="h-11 min-w-0 gap-2 px-3">
      {content}
    </Button>
  ) : (
    <Surface tone="elevated" radius="control" padding="none" className="flex h-11 min-w-0 items-center justify-center gap-2 px-3 shadow-sm">
      {content}
    </Surface>
  );
};

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  className?: string;
  iconClassName?: string;
  valueClassName?: string;
}

/** One header stat: icon, small label over a large value. */
export const StatTile: React.FC<StatTileProps> = ({
  icon,
  label,
  value,
  className = '',
  iconClassName = '',
  valueClassName = '',
}) => (
  <Surface
    tone="elevated"
    radius="control"
    padding="none"
    className={`flex h-11 min-w-0 flex-1 items-center justify-center gap-2.5 px-2.5 text-text-secondary shadow-sm transition-colors duration-500 sm:flex-none sm:justify-start lg:px-3 ${className}`}
  >
    <span className={`flex transition-colors duration-500 ${iconClassName}`}>{icon}</span>
    <div className="flex flex-col">
      <span className="text-tiny font-bold uppercase leading-none tracking-wider text-text-muted max-lg:sr-only">{label}</span>
      <span className={`mt-0.5 text-lg font-black leading-none text-text-primary transition-colors duration-500 ${valueClassName}`}>
        {value}
      </span>
    </div>
  </Surface>
);

interface HeaderButtonProps {
  onClick: () => void;
  title: string;
  icon?: React.ReactNode;
  /** With a label the button reads as text; without one it is a square icon button. */
  label?: string;
  danger?: boolean;
  className?: string;
}

/**
 * Header action button shared by every challenge: a secondary Button as tall as the stat tiles beside
 * it. Icon-only buttons share the row (flex-1 on phones) and become squares from sm up.
 */
export const HeaderButton: React.FC<HeaderButtonProps> = ({ onClick, title, icon, label, danger = false, className = '' }) => (
  <Button
    variant="secondary"
    onClick={onClick}
    aria-label={title}
    className={cn(
      'h-11 justify-center',
      label ? 'gap-1.5 px-3' : 'px-2 sm:w-10 sm:px-0 lg:w-11',
      danger && 'hover:bg-accent-red/10 hover:text-accent-red',
      className
    )}
  >
    {icon}
    {label && <span>{label}</span>}
  </Button>
);

/** Clapperboard button that turns the draw animations on or off; struck through while they are off. */
const DrawAnimationButton: React.FC = () => {
  const dict = useDictionary();
  const [enabled, setEnabled] = useChallengeAnimations();
  return (
    <HeaderButton
      onClick={() => setEnabled(!enabled)}
      title={dict.streaks.drawAnimations}
      icon={
        <span className="relative flex">
          <Clapperboard className={`h-5 w-5 ${enabled ? '' : 'opacity-50'}`} aria-hidden="true" />
          {!enabled && (
            <span
              className="absolute left-1/2 top-1/2 h-0.5 w-6 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-accent-red"
              aria-hidden="true"
            />
          )}
        </span>
      }
    />
  );
};

/** The foldable button row: on phones its buttons share one full-width row; from sm up it dissolves
 * (`contents`) so every action sits in the header's wrapping row. */
const ACTION_GROUP_CLASSES = 'flex gap-1.5 sm:contents [&>*]:min-w-0 [&>*]:flex-1 sm:[&>*]:flex-none';

interface StandardHeaderActionsProps {
  onOpenRules: () => void;
  onOpenStats: () => void;
  onOpenHistory: () => void;
  onOpenAbandon: () => void;
  /** The mode or difficulty picker, placed first, before Rules. */
  modeSelect?: React.ReactNode;
  /** Other mode-specific buttons (perk pool), placed between the picker and Rules. */
  extra?: React.ReactNode;
  /** Adds the draw animation button, for challenges that draw something at random. */
  hasDrawAnimations?: boolean;
}

/** The action row every challenge header shares, so they cannot drift apart. */
export const StandardHeaderActions: React.FC<StandardHeaderActionsProps> = ({ onOpenRules, onOpenStats, onOpenHistory, onOpenAbandon, modeSelect, extra, hasDrawAnimations = false }) => {
  const dict = useDictionary();
  const [open, setOpen] = useState(false);
  return (
  <>
    <div className="flex min-w-0 shrink-0 sm:contents">{modeSelect}</div>
    <Collapsible open={open} onlyBelow="sm" className="max-sm:col-span-full basis-full" contentClassName={ACTION_GROUP_CLASSES}>
    {extra}
    {hasDrawAnimations && <DrawAnimationButton />}
    <HeaderButton
      onClick={onOpenRules}
      title={dict.streaks.rules}
      icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}
    />
    <HeaderButton
      onClick={onOpenStats}
      title={dict.streaks.stats}
      icon={<BarChart2 className="h-5 w-5" aria-hidden="true" />}
    />
    <HeaderButton
      onClick={onOpenHistory}
      title={dict.streaks.pastWins}
      icon={<History className="h-5 w-5" aria-hidden="true" />}
    />
    <HeaderButton
      danger
      onClick={onOpenAbandon}
      title={dict.streaks.abandonRun}
      icon={<RotateCcw className="h-5 w-5" aria-hidden="true" />}
    />
    </Collapsible>
    <Button
      variant="ghost"
      size="xs"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      aria-label={dict.streaks.moreActions}
      className="relative col-span-full h-5 w-full p-0 before:absolute before:-inset-y-3 before:inset-x-0 before:content-[''] sm:hidden"
    >
      <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
    </Button>
  </>
);
};

/** Error strip shown above a challenge board. */
export const ChallengeErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="mb-6 flex items-center justify-between rounded-card border border-accent-red/40 bg-accent-red/15 p-4 text-sm text-accent-red shadow-xs"
    role="alert"
  >
    <span>{message}</span>
  </div>
);

interface ChallengeVictoryCardProps {
  title: string;
  /** Optional line under the title, e.g. the killer the streak was won on. */
  subtitle?: string;
  onRestart: () => void;
  busy: boolean;
}

/** The win screen every challenge shows once its run is completed. */
export const ChallengeVictoryCard: React.FC<ChallengeVictoryCardProps> = ({ title, subtitle, onRestart, busy }) => {
  const dict = useDictionary();
  return (
  <div className={`${CELEBRATION_CARD_CLASSES} px-6 py-10`}>
    <CelebrationBadge />
    <p className={`mt-6 ${CELEBRATION_LABEL_CLASSES}`}>{dict.streaks.victoryCongrats}</p>
    <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">{title}</h2>
    {subtitle && <p className="mt-1 type-card-title text-text-secondary">{subtitle}</p>}
    <Button
      type="button"
      onClick={onRestart}
      disabled={busy}
      variant="amber" size="lg" className="mt-6"
    >
      {dict.streaks.startNewRun}
    </Button>
  </div>
);
};
