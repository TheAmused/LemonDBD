// frontend/src/components/scraper-config/StatusBanner.tsx
import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

/** Inline error (assertive) or success (polite) message for a tab. */
export function StatusBanner({ tone, message }: { tone: 'error' | 'success'; message: string }) {
  if (tone === 'error') {
    return (
      <div role="alert" className="rounded-xl border border-accent-red/30 bg-accent-red/10 p-3 type-strong text-accent-red flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
    );
  }
  return (
    <div role="status" className="rounded-xl border border-accent-green/30 bg-accent-green/10 p-3 type-strong text-accent-green flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
