'use client';
// frontend/src/components/common/NsfwContentGate.tsx
import { CautionVeilIcon } from '@/components/icons/DbdIcons';
import { Button } from '@/components/common/Button';

interface NsfwContentGateProps {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}

/** Stands in for a tier list or a minigame flagged NSFW until the viewer confirms. */
export function NsfwContentGate({ title, description, confirmLabel, onConfirm }: NsfwContentGateProps) {
  return (
    <div
      data-testid="nsfw-content-gate"
      className="relative z-10 flex min-h-105 w-full items-center justify-center px-4 py-10"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border-2 border-accent-red/60 bg-bg-primary p-6 text-center sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-red/40 bg-accent-red/15 text-accent-red sm:h-16 sm:w-16">
          <CautionVeilIcon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
        </div>
        <h2 className="text-base font-black text-text-primary sm:text-lg">{title}</h2>
        <p className="type-body-fluid text-text-muted">{description}</p>
        <Button
          variant="primary"
          size="md"
          onClick={onConfirm}
          data-testid="nsfw-content-gate-confirm"
          className="mt-2 rounded-2xl"
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
