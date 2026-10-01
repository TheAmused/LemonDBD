// frontend/src/components/streaks/ChallengePanel.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { BarChart2, ChevronDown, History, RotateCcw } from 'lucide-react';
import { CELEBRATION_CARD_CLASSES, CELEBRATION_LABEL_CLASSES, CelebrationBadge } from './CelebrationBadge';

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
  <section className="mb-6 w-full overflow-hidden rounded-2xl border border-border-color bg-bg-surface shadow-sm">
    <div className="border-b border-border-color bg-bg-elevated/40 px-3 py-3 sm:px-4">{header}</div>
    {progress && <div className="border-b border-border-color px-4 pt-5 pb-4 sm:px-6">{progress}</div>}
    <div className="p-3 sm:p-4">{children}</div>
  </section>
);

interface ChallengeHeaderLayoutProps {
  stats: React.ReactNode;
  actions: React.ReactNode;
}

/** Splits the header strip into a stats zone and an actions zone. */
export const ChallengeHeaderLayout: React.FC<ChallengeHeaderLayoutProps> = ({ stats, actions }) => (
  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">{stats}</div>
    <div className="flex flex-wrap items-center justify-center gap-2.5 lg:justify-end">{actions}</div>
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
      <span className="text-xs font-black uppercase tracking-wider text-text-primary">{label}</span>
      {onClick && <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden="true" />}
    </>
  );
  const shell = 'flex items-center gap-2 rounded-xl border border-border-color bg-bg-elevated px-3 py-2.5 shadow-sm';

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={`${title}: ${label}`}
      className={`${shell} cursor-pointer transition-colors hover:bg-bg-elevated/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red`}
    >
      {content}
    </button>
  ) : (
    <div className={shell} title={title}>
      {content}
    </div>
  );
};

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

/** One header stat: icon, small label over a large value. */
export const StatTile: React.FC<StatTileProps> = ({ icon, label, value }) => (
  <div className="flex items-center gap-2.5 rounded-xl border border-border-color bg-bg-elevated px-3.5 py-2 text-text-secondary shadow-sm">
    {icon}
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase leading-none tracking-wider text-text-muted">{label}</span>
      <span className="mt-0.5 font-mono text-lg font-black leading-none text-text-primary">{value}</span>
    </div>
  </div>
);

interface HeaderButtonProps {
  onClick: () => void;
  title: string;
  icon?: React.ReactNode;
  /** With a label the button reads as text (hidden below sm); without one it is a square icon button. */
  label?: string;
  danger?: boolean;
}

/** Header action button shared by every challenge. */
export const HeaderButton: React.FC<HeaderButtonProps> = ({ onClick, title, icon, label, danger = false }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`flex items-center rounded-xl border border-border-color bg-bg-elevated text-text-secondary shadow-sm transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red ${
      danger ? 'hover:bg-accent-red/10 hover:text-accent-red' : 'hover:bg-bg-elevated/70 hover:text-text-primary'
    } ${label ? 'gap-1.5 px-3 py-2.5 text-xs font-bold' : 'justify-center p-2.5'}`}
  >
    {icon}
    {label && <span className="hidden sm:inline">{label}</span>}
  </button>
);

interface StandardHeaderActionsProps {
  onOpenRules: () => void;
  onOpenStats: () => void;
  onOpenHistory: () => void;
  onOpenReset: () => void;
  /** Mode-specific buttons (change mode, perk pool), placed right after Rules. */
  extra?: React.ReactNode;
  dict?: Dictionary;
}

/** The action row every challenge header shares, so they cannot drift apart. */
export const StandardHeaderActions: React.FC<StandardHeaderActionsProps> = ({
  onOpenRules,
  onOpenStats,
  onOpenHistory,
  onOpenReset,
  extra,
  dict,
}) => (
  <>
    <HeaderButton
      onClick={onOpenRules}
      title={dict?.streaks?.rules || 'Rules'}
      label={dict?.streaks?.rules || 'Rules'}
    />
    {extra}
    <HeaderButton
      onClick={onOpenStats}
      title={dict?.streaks?.stats || 'Statistics'}
      icon={<BarChart2 className="h-5 w-5" aria-hidden="true" />}
    />
    <HeaderButton
      onClick={onOpenHistory}
      title={dict?.streaks?.pastWins || 'Win History'}
      icon={<History className="h-5 w-5" aria-hidden="true" />}
    />
    <HeaderButton
      danger
      onClick={onOpenReset}
      title={dict?.streaks?.resetRun || 'Reset this run'}
      icon={<RotateCcw className="h-5 w-5" aria-hidden="true" />}
    />
  </>
);

/** Error strip shown above a challenge board. */
export const ChallengeErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="mb-6 flex items-center justify-between rounded-xl border border-accent-red/40 bg-accent-red/15 p-4 text-sm text-accent-red shadow-xs"
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
  dict?: Dictionary;
}

/** The win screen every challenge shows once its run is completed. */
export const ChallengeVictoryCard: React.FC<ChallengeVictoryCardProps> = ({ title, subtitle, onRestart, busy, dict }) => (
  <div className={`${CELEBRATION_CARD_CLASSES} px-6 py-10`}>
    <CelebrationBadge />
    <p className={`mt-6 ${CELEBRATION_LABEL_CLASSES}`}>{dict?.streaks?.victoryCongrats || 'Congratulations'}</p>
    <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">{title}</h2>
    {subtitle && <p className="mt-1 text-sm font-semibold text-text-secondary">{subtitle}</p>}
    <button
      type="button"
      onClick={onRestart}
      disabled={busy}
      className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-amber px-6 py-3 text-sm font-extrabold text-text-inverted shadow-xs transition-colors hover:bg-accent-amber-hover disabled:opacity-50 cursor-pointer"
    >
      {dict?.streaks?.startNewRun || 'Start a new run'}
    </button>
  </div>
);
