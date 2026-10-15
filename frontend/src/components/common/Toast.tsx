// frontend/src/components/common/Toast.tsx
// A notice pinned to the top right corner ("draft restored", "saved"). One look and one position, so
// every toast in the app appears in the same place. The caller decides when it is shown.
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Surface } from '@/components/common/Surface';
import { cn } from '@/utils/cn';

export type ToastTone = 'amber' | 'red' | 'green';

const TONES: Record<ToastTone, { border: string; text: string }> = {
  amber: { border: 'border-accent-amber/40', text: 'text-accent-amber' },
  red: { border: 'border-accent-red/40', text: 'text-accent-red' },
  green: { border: 'border-accent-green/40', text: 'text-accent-green' },
};

export interface ToastProps {
  tone?: ToastTone;
  /** Leading icon; it takes the tone colour. */
  icon?: React.ReactNode;
  message: React.ReactNode;
  /** Buttons after the message (e.g. "Start over"). */
  actions?: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
}

export function Toast({ tone = 'amber', icon, message, actions, onDismiss, dismissLabel }: ToastProps) {
  const t = TONES[tone];
  return (
    <Surface
      role="status"
      aria-live="polite"
      padding="none"
      className={cn(
        'fixed top-5 right-5 z-50 flex w-[calc(100vw-2.5rem)] max-w-md items-center gap-3 bg-bg-surface/95 p-3 text-xs font-semibold text-text-primary shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300 sm:w-auto sm:text-sm 2xl:p-4 2xl:text-base',
        t.border
      )}
    >
      {icon && <span className={cn('flex shrink-0 items-center', t.text)}>{icon}</span>}
      <span className={cn('flex-1', t.text)}>{message}</span>
      {actions}
      {onDismiss && (
        <Button variant="ghost" size="sm" icon onClick={onDismiss} aria-label={dismissLabel}>
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </Surface>
  );
}
