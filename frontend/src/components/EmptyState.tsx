'use client';
// frontend/src/components/EmptyState.tsx

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateAction {
  label: React.ReactNode;
  onClick: () => void;
  className?: string;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  variant?: 'solid' | 'dashed';
  headingClassName?: string;
  subtitleClassName?: string;
  iconClassName?: string;
  action?: EmptyStateAction;
  className?: string;
}

const VARIANT_WRAPPER_CLASSNAME: Record<'solid' | 'dashed', string> = {
  solid:
    'mt-4 sm:mt-6 mb-auto rounded-3xl bg-bg-surface p-8 sm:p-12 text-center backdrop-blur-sm shadow-sm w-full border border-border-color',
  dashed:
    'my-8 sm:my-12 rounded-3xl border border-dashed border-border-color bg-bg-surface/40 p-8 sm:p-12 text-center backdrop-blur-sm shadow-sm',
};

const DEFAULT_ACTION_CLASSNAME =
  'mt-4 inline-flex items-center gap-2 rounded-xl bg-accent-red/20 px-4 py-2 text-xs font-bold text-accent-red hover:bg-accent-red/30 transition-colors cursor-pointer shadow-sm border border-accent-red/40';

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  variant = 'dashed',
  headingClassName = 'text-lg font-extrabold text-text-primary',
  subtitleClassName = 'mt-1 text-xs text-text-muted max-w-sm mx-auto',
  iconClassName = 'mx-auto h-12 w-12 text-text-muted mb-3',
  action,
  className,
}: EmptyStateProps) {
  return (
    <section aria-live="polite" className={className || VARIANT_WRAPPER_CLASSNAME[variant]}>
      <Icon className={iconClassName} aria-hidden="true" />
      <h3 className={headingClassName}>{title}</h3>
      {subtitle && <p className={subtitleClassName}>{subtitle}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={action.className || DEFAULT_ACTION_CLASSNAME}
        >
          {action.label}
        </button>
      )}
    </section>
  );
}
