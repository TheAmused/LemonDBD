// frontend/src/components/common/Alert.tsx
// The one inline error box (Alert) and the error panel that stands in for a page body (ErrorNotice).
// Errors under a single input belong to FormField in Field.tsx.
import React from 'react';
import { TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { cn } from '@/utils/cn';

export interface AlertProps {
  children: React.ReactNode;
  /** Shows a close button; the caller hides the alert. Needs `dismissLabel`. */
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}

export function Alert({ children, onDismiss, dismissLabel, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-card border border-accent-red/40 bg-accent-red/10 p-3 type-strong text-accent-red',
        className
      )}
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{children}</span>
      {onDismiss && (
        <Button type="button" variant="ghost" size="sm" icon className="-my-1 shrink-0" onClick={onDismiss} aria-label={dismissLabel}>
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

export interface ErrorNoticeProps {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** The centred error panel that replaces a page body whose data failed to load (title plus the reason). */
export function ErrorNotice({ title, children, className }: ErrorNoticeProps) {
  return (
    <div
      role="alert"
      className={cn('mx-auto my-12 max-w-md rounded-card border border-accent-red/30 bg-accent-red/10 p-8 text-center', className)}
    >
      <h2 className="mb-2 text-lg font-bold text-accent-red">{title}</h2>
      <p className="text-xs text-text-muted">{children}</p>
    </div>
  );
}
