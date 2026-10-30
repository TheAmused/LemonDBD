'use client';
// frontend/src/components/common/NsfwContentGate.tsx
import { Button } from '@/components/common/Button';
import { IconTile } from '@/components/common/IconTile';
import { MatureIcon } from '@/components/icons/DbdIcons';

interface NsfwContentGateProps {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** Together with `onBack`, adds a way out for a viewer who does not want to see the content. */
  backLabel?: string;
  onBack?: () => void;
}

/** Stands in for a tier list or a minigame flagged NSFW until the viewer confirms. */
export function NsfwContentGate({ title, description, confirmLabel, onConfirm, backLabel, onBack }: NsfwContentGateProps) {
  return (
    <div
      data-testid="nsfw-content-gate"
      className="relative z-10 flex min-h-105 w-full items-center justify-center px-4 py-10"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-card border-2 border-accent-red/60 bg-bg-primary p-6 text-center sm:p-8">
        <IconTile tone="red" size="lg">
          <MatureIcon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
        </IconTile>
        <h2 className="text-base font-black text-text-primary sm:text-lg">{title}</h2>
        <p className="type-body-fluid text-text-muted">{description}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {backLabel && onBack && (
            <Button variant="secondary" size="md" onClick={onBack} data-testid="nsfw-content-gate-back">
              {backLabel}
            </Button>
          )}
          <Button variant="primary" size="md" onClick={onConfirm} data-testid="nsfw-content-gate-confirm">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
