// frontend/src/components/streaks/RulesModalShell.tsx
'use client';

import React, { useEffect } from 'react';
import { X, LucideIcon } from 'lucide-react';

export interface RulesModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  icon: LucideIcon;
  title: string;
  /** Tailwind classes for the header icon chip, e.g. "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400". */
  iconClassName: string;
  /** Tailwind classes for the footer button, e.g. "bg-amber-600 hover:bg-amber-500". */
  footerButtonClassName: string;
  footerButtonLabel?: string;
  children: React.ReactNode;
}

/**
 * Shared chrome for every streak mode's Rules modal (Gauntlet/Chaos/History/
 * Page Streak): backdrop, header with icon + title + close button, scrolling
 * body, and footer confirm button. Each mode only supplies its own body
 * content as children plus a couple of color classes, instead of
 * re-declaring this same header/footer/backdrop markup four times.
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
  <div className={`bg-slate-50 dark:bg-slate-950/80 border rounded-xl p-4 space-y-3 shadow-sm ${boxClassName}`}>
    <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${headerColorClassName}`}>
      <Icon className="w-4 h-4" aria-hidden="true" />
      <span>{title}</span>
    </h3>
    {intro && <p className="text-xs text-slate-500 dark:text-slate-400">{intro}</p>}
    <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
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
  icon: Icon,
  title,
  iconClassName,
  footerButtonClassName,
  footerButtonLabel = "Got It, Let's Play!",
  children,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 border rounded-xl ${iconClassName}`}>
              <Icon className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight capitalize">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 dark:text-slate-300">
          {children}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className={`px-5 py-2.5 text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-md ${footerButtonClassName}`}
          >
            {footerButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
