// frontend/src/components/common/Alert.tsx
// The one inline error box ("could not save", "could not send"): red tint, warning icon, optional dismiss.
// Field-level errors under an input belong to FieldLabel in Field.tsx instead.
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
