// frontend/src/components/minigames/guessers/SolvedOverlay.tsx
// The dimmed veil with the answer on it that covers a guesser's picture once the round is solved.
import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SolvedOverlayProps {
  answer: string;
  large?: boolean;
}

export function SolvedOverlay({ answer, large = false }: SolvedOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/40 backdrop-blur-xs">
      <div
        className={cn(
          'flex items-center gap-2 rounded-card border border-accent-green/60 bg-accent-green font-bold text-text-inverted shadow-xl',
          large ? 'px-6 py-2.5 text-lg' : 'px-4 py-2 text-base'
        )}
      >
        <Check className={large ? 'h-5 w-5' : 'h-4 w-4'} />
        <span>{answer}</span>
      </div>
    </div>
  );
}
