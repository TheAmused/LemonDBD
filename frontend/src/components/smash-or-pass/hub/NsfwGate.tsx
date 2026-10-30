'use client';
// frontend/src/components/smash-or-pass/hub/NsfwGate.tsx
import { Button } from '@/components/common/Button';
import { useDictionary } from '@/context/DictionaryContext';
import { MatureIcon } from '@/components/icons/DbdIcons';

/** Stands in for the card stack on an NSFW roster until the viewer confirms. */
export function NsfwGate({ onConfirm }: { onConfirm: () => void }) {
  const dict = useDictionary();
  return (
    <div
      data-testid="nsfw-content-gate"
      className="relative flex flex-col items-center justify-center min-h-115 sm:min-h-130 pointer-events-auto select-none"
    >
      <div className="w-viewport-md max-w-85 sm:max-w-95 md:max-w-105 aspect-[9/14] sm:aspect-[9/15] rounded-card bg-bg-primary border-2 border-accent-red/60 flex flex-col items-center justify-center p-6 sm:p-8 space-y-4 text-center backdrop-blur-2xl">
        <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-card bg-accent-red/15 border border-accent-red/40 text-accent-red">
          <MatureIcon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
        </div>
        <h3 className="text-base sm:text-lg font-black text-text-primary">{dict.smashOrPass.nsfw.title}</h3>
        <p className="text-xs sm:text-sm text-text-muted">{dict.smashOrPass.nsfw.description}</p>
        <Button
          variant="primary"
          size="md"
          onClick={onConfirm}
          data-testid="nsfw-content-gate-confirm"
          className="mt-2"
        >
          {dict.smashOrPass.nsfw.confirm}
        </Button>
      </div>
    </div>
  );
}
