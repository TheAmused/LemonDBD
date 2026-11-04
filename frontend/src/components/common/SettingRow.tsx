// frontend/src/components/common/SettingRow.tsx
import type { ComponentType, ReactNode } from 'react';

interface SettingRowProps {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  title: string;
  /** Optional explanation under the title; without it the row is a single compact line. */
  description?: string;
  children: ReactNode;
}

/**
 * One setting: icon, name (and an explanation when given) on the left, its control on the right
 * (wrapping below when narrow). Without a description the row is one inline line.
 */
export function SettingRow({ icon: Icon, title, description, children }: SettingRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 basis-60 space-y-1">
        <div className="flex items-center gap-2">
          <Icon className="icon-md text-accent-red" aria-hidden="true" />
          <span className="type-strong-fluid text-text-primary">{title}</span>
        </div>
        {description ? <p className="type-body-fluid text-text-secondary">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
