'use client';
// frontend/src/components/common/EmptyState.tsx

import React from 'react';
type EmptyStateIcon = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;

export type EmptyStateVariant = 'solid' | 'dashed' | 'compact' | 'inline';

interface EmptyStateAction {
  label: React.ReactNode;
  onClick: () => void;
  className?: string;
}

interface EmptyStateProps {
  icon?: EmptyStateIcon;
  title: string;
  subtitle?: string;
  /** solid/dashed: full-page panels. compact: small dashed box inside a card or list. inline: plain muted text, no box. */
  variant?: EmptyStateVariant;
  headingClassName?: string;
  subtitleClassName?: string;
  iconClassName?: string;
  action?: EmptyStateAction;
  className?: string;
}

const VARIANT_WRAPPER_CLASSNAME: Record<EmptyStateVariant, string> = {
  compact:
    'rounded-2xl border border-dashed border-border-color bg-bg-surface/40 p-6 sm:p-8 text-center',
  inline: 'py-12 text-center',
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
  headingClassName,
  subtitleClassName = 'mt-1 text-xs text-text-muted max-w-sm mx-auto',
  iconClassName,
  action,
  className,
}: EmptyStateProps) {
  const compact = variant === 'compact' || variant === 'inline';
  const resolvedIconClassName =
    iconClassName ?? (compact ? 'mx-auto h-8 w-8 text-text-muted mb-2 opacity-60' : 'mx-auto h-12 w-12 text-text-muted mb-3');
  return (
    <section aria-live="polite" className={className || VARIANT_WRAPPER_CLASSNAME[variant]}>
      {Icon && <Icon className={resolvedIconClassName} aria-hidden="true" />}
      <h3 className={headingClassName ?? (compact ? 'text-sm font-bold text-text-primary' : 'text-lg font-extrabold text-text-primary')}>{title}</h3>
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
