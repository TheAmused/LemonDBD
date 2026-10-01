// frontend/src/components/streaks/RulesModalShell.tsx
'use client';

import type { Dictionary } from '@/locales/types';

import React, { useEffect } from 'react';
import { X, AlertTriangle, Clock, Snowflake, LucideIcon } from 'lucide-react';

export interface RulesModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  dict?: Dictionary;
}

/**
 * Shared chrome for every streak mode's Rules modal (Gauntlet/Chaos/History/
 * Page Streak): backdrop, header with title + close button, scrolling
 * and body. Each mode only supplies its own body
 * content as children plus a couple of color classes, instead of
 * re-declaring this same header/backdrop markup four times.
 */
export interface RulesModalNotice {
  icon: LucideIcon;
  text: string;
}

/** Compact, mode-colored footer rows for housekeeping facts (pool/roster freeze,
 * the 90-day inactivity auto-loss) -- kept out of the concept text up top so the
 * rules read as rules, not caveats, and grouped at the bottom where every mode
 * puts them the same way. */
export const RulesModalNotices: React.FC<{ notices: RulesModalNotice[]; accentClassName: string }> = ({
  notices,
  accentClassName,
}) => (
  <div className="space-y-2">
    {notices.map(({ icon: Icon, text }, i) => (
      <div
        key={i}
        className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${accentClassName}`}
      >
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <span>{text}</span>
      </div>
    ))}
  </div>
);

export interface RuleListEntry {
  label: string;
  text: string;
}

/** A titled box of label:text rules (Exceptions/Clarifications) shared across
 * every streak mode's Rules modal, so the same list markup isn't re-declared
 * per file. */
export const RulesModalListSection: React.FC<{
  icon: LucideIcon;
  title: string;
  intro?: string;
  items: RuleListEntry[];
  headerColorClassName: string;
  boxClassName: string;
}> = ({ icon: Icon, title, intro, items, headerColorClassName, boxClassName }) => (
  <div className={`bg-bg-elevated border rounded-xl p-4 space-y-3 shadow-sm ${boxClassName}`}>
    <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${headerColorClassName}`}>
      <Icon className="w-4 h-4" aria-hidden="true" />
      <span>{title}</span>
    </h3>
    {intro && <p className="text-xs text-text-secondary">{intro}</p>}
    <ul className="space-y-2 text-xs sm:text-sm text-text-secondary leading-relaxed">
      {items.map((item, i) => (
        <li key={i}>
          <strong>{item.label}: </strong>
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  </div>
);

export const RulesModalShell: React.FC<RulesModalShellProps> = ({
  isOpen,
  onClose,
  title,
  children,
  dict,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/70 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div
        className="relative w-full max-w-3xl bg-bg-surface border border-border-color rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border-color bg-bg-elevated">
          <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight capitalize">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label={dict?.modal?.close || 'Close'}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-text-secondary">
          {children}
        </div>
      </div>
    </div>
  );
};

/** The "concept" box at the top of every Rules modal. */
export const RulesModalConcept: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-bg-elevated border border-border-color rounded-xl p-4 shadow-sm">
    <h3 className="text-sm font-bold text-accent-red uppercase tracking-wider mb-2">{title}</h3>
    <p className="leading-relaxed text-xs sm:text-sm text-text-secondary">{children}</p>
  </div>
);

/** The bulleted "How it works" list, with an optional italic hint underneath. */
export const RulesModalHowItWorks: React.FC<{ title: string; items: React.ReactNode[]; hint?: string }> = ({
  title,
  items,
  hint,
}) => (
  <div>
    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3">{title}</h3>
    <ul className="space-y-2 text-xs sm:text-sm text-text-secondary leading-relaxed list-disc pl-4 marker:text-accent-red">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
    {hint && <p className="mt-3 leading-relaxed text-xs sm:text-sm text-text-muted italic">{hint}</p>}
  </div>
);

export interface RulesModalDifficultyRow {
  label: string;
  text: string;
  /** Tailwind classes for the label badge, e.g. "bg-accent-red/20 text-accent-red border-accent-red/30". */
  badgeClassName: string;
}

/** A titled list of difficulty or mode rows, each a colored badge beside its description. */
export const RulesModalDifficultyList: React.FC<{ title: string; rows: RulesModalDifficultyRow[] }> = ({
  title,
  rows,
}) => (
  <div>
    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3">{title}</h3>
    <div className="grid grid-cols-1 gap-2.5">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-bg-elevated border border-border-color rounded-xl gap-2 shadow-sm"
        >
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${row.badgeClassName} whitespace-nowrap w-fit`}>
            {row.label}
          </span>
          <p className="text-xs text-text-secondary">{row.text}</p>
        </div>
      ))}
    </div>
  </div>
);

interface RulesModalFooterProps {
  dict?: Dictionary;
  /** Override the void-match list (Gauntlet's differs per role). */
  exceptions?: RuleListEntry[];
  /** Override the clarifications list. */
  clarifications?: RuleListEntry[];
  voidNotice?: string;
  /** Chaos draws add-ons for you, so its clarifications leave this one out. */
  addonsClarification?: boolean;
}

/** Exceptions, clarifications and the freeze/inactivity notices, identical across challenges unless overridden. */
export const RulesModalFooter: React.FC<RulesModalFooterProps> = ({
  dict,
  exceptions,
  clarifications,
  voidNotice,
  addonsClarification = true,
}) => {
  const s = dict?.streaks;
  const defaultExceptions: RuleListEntry[] = [
    {
      label: s?.excGameCancelledLabel || 'Game cancelled',
      text: s?.excGameCancelledText || 'Someone leaves the lobby before it finishes loading and the match never starts.',
    },
    { label: s?.excHackersLabel || 'Hackers', text: s?.excHackersText || 'Obvious cheaters are in the match.' },
    { label: s?.excCrashLabel || 'Crash or server failure', text: s?.excCrashText || 'The game or server crashes mid-match.' },
  ];
  const defaultClarifications: RuleListEntry[] = [
    { label: s?.excSurvDcLabel || 'Survivor disconnects', text: s?.excSurvDcText || 'Keep playing. The bot match still counts.' },
    { label: s?.excNoDodgingLabel || 'No dodging', text: s?.excNoDodgingText || 'Play whatever lobby you get.' },
    ...(addonsClarification
      ? [{ label: s?.excAddonsAllowedLabel || 'Add-ons and offerings', text: s?.excAddonsAllowedText || 'All available.' }]
      : []),
  ];

  return (
    <>
      <RulesModalListSection
        icon={AlertTriangle}
        title={s?.exceptions || 'Exceptions'}
        intro={voidNotice || s?.voidMatchNotice || 'These void the match. Replay it.'}
        headerColorClassName="text-accent-red"
        boxClassName="border-accent-red/20"
        items={exceptions ?? defaultExceptions}
      />
      <RulesModalListSection
        icon={AlertTriangle}
        title={s?.clarifications || 'Clarifications'}
        headerColorClassName="text-accent-red"
        boxClassName="border-border-color"
        items={clarifications ?? defaultClarifications}
      />
      <RulesModalNotices
        accentClassName="border-accent-amber/20 bg-accent-amber/5 text-accent-amber"
        notices={[
          {
            icon: Snowflake,
            text: s?.runFreezeNotice || 'Your run freezes. New unlocks join after your next reset, loss to zero, or completion.',
          },
          {
            icon: Clock,
            text: s?.inactivityLossNotice || 'An in-progress run untouched for 90 days automatically counts as a loss.',
          },
        ]}
      />
    </>
  );
};
