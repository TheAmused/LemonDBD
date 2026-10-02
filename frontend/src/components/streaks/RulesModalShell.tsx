// frontend/src/components/streaks/RulesModalShell.tsx
'use client';

import type { Dictionary } from '@/locales/types';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Modal, type ModalTone } from '@/components/common/Modal';

export interface RulesModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  icon: LucideIcon;
  title: string;
  /** Tailwind classes for the header icon chip, e.g. "bg-accent-red/10 border-accent-red/20 text-accent-red". */
  iconClassName?: string;
  children: React.ReactNode;
  dict?: Dictionary;
}

/**
 * Shared chrome for every streak mode's Rules modal (Gauntlet/Chaos/History/
 * Page Streak): the shared <Modal> with icon + title and a scrolling body.
 * Each mode only supplies its own body
 * content as children plus a couple of color classes, instead of
 * re-declaring this same header/footer/backdrop markup four times.
 */
/** Maps the legacy icon-chip colour classes onto a Modal tone. */
export const toneFromIconClass = (cls?: string): ModalTone => {
  if (!cls) return 'default';
  if (cls.includes('accent-green')) return 'success';
  if (cls.includes('accent-amber')) return 'warning';
  if (cls.includes('cyan') || cls.includes('blue')) return 'info';
  return 'default';
};

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
    <ul className="space-y-2 type-body-fluid text-text-secondary">
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
  children,
  dict,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="3xl"
      layer="top"
      tone={toneFromIconClass(iconClassName)}
      icon={<Icon className="h-5 w-5" aria-hidden="true" />}
      title={<span className="capitalize">{title}</span>}
      closeButtonAriaLabel={dict?.modal?.close || 'Close'}
      bodyClassName="space-y-6 p-5 text-sm text-text-secondary sm:p-6"
    >
      {children}
    </Modal>
  );
};
