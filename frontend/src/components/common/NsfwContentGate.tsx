'use client';
// frontend/src/components/common/NsfwContentGate.tsx
import { CautionVeilIcon } from '@/components/icons/DbdIcons';
import { Button } from '@/components/common/Button';
import { IconTile } from '@/components/common/IconTile';

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
      className="relative z-10 flex min-h-[420px] w-full items-center justify-center px-4 py-10"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-card border-2 border-accent-red/60 bg-bg-primary p-6 text-center sm:p-8">
        <IconTile tone="red" size="lg">
          <CautionVeilIcon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
        </IconTile>
        <h2 className="text-base font-black text-text-primary sm:text-lg">{title}</h2>
        <p className="text-xs text-text-muted sm:text-sm">{description}</p>
        <Button
          variant="primary"
          size="md"
          onClick={onConfirm}
          data-testid="nsfw-content-gate-confirm"
          className="mt-2"
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
