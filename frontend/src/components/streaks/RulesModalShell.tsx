// frontend/src/components/streaks/RulesModalShell.tsx
'use client';

import React, { useEffect } from 'react';
import { X, LucideIcon } from 'lucide-react';

export interface RulesModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  icon: LucideIcon;
  title: string;
  subtitle: string;
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
export const RulesModalShell: React.FC<RulesModalShellProps> = ({
  isOpen,
  onClose,
  icon: Icon,
  title,
  subtitle,
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
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight capitalize">
                {title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
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
