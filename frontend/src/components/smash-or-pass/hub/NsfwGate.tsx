'use client';
// frontend/src/components/smash-or-pass/hub/NsfwGate.tsx
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useDictionary } from '@/context/DictionaryContext';

/** Stands in for the card stack on an NSFW roster until the viewer confirms. */
export function NsfwGate({ onConfirm }: { onConfirm: () => void }) {
  const dict = useDictionary();
  return (
    <div
      data-testid="nsfw-content-gate"
      className="relative flex flex-col items-center justify-center min-h-[460px] sm:min-h-[520px] pointer-events-auto select-none"
    >
      <div className="w-[88vw] max-w-[340px] sm:max-w-[380px] md:max-w-[420px] aspect-[9/14] sm:aspect-[9/15] rounded-[32px] sm:rounded-[36px] bg-bg-primary border-2 border-accent-red/60 flex flex-col items-center justify-center p-6 sm:p-8 space-y-4 text-center backdrop-blur-2xl">
        <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-accent-red/15 border border-accent-red/40 text-accent-red">
          <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
        </div>
        <h3 className="text-base sm:text-lg font-black text-text-primary">{dict.smashOrPass.nsfw.title}</h3>
        <p className="text-xs sm:text-sm text-text-muted">{dict.smashOrPass.nsfw.description}</p>
        <Button
          variant="primary"
          size="md"
          onClick={onConfirm}
          data-testid="nsfw-content-gate-confirm"
          className="mt-2 rounded-2xl"
        >
          {dict.smashOrPass.nsfw.confirm}
        </Button>
      </div>
    </div>
  );
}
