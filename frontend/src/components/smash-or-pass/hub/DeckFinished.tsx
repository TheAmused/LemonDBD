'use client';
// frontend/src/components/smash-or-pass/hub/DeckFinished.tsx
import React from 'react';
import { Heart, RotateCcw } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Surface } from '@/components/common/Surface';
import { EmptyState } from '@/components/common/EmptyState';
import { useDictionary } from '@/context/DictionaryContext';

interface DeckFinishedProps {
  sessionSmashes: number;
  sessionPasses: number;
  onOpenPersona: () => void;
  onReset: () => void;
}

/** What the arena shows once every candidate has been voted on. */
export function DeckFinished({ sessionSmashes, sessionPasses, onOpenPersona, onReset }: DeckFinishedProps) {
  const dict = useDictionary();
  return (
    <EmptyState
      variant="solid"
      icon={Heart}
      iconClassName="h-8 w-8 fill-accent-red animate-bounce mx-auto"
      title={dict.smashOrPass.empty.title}
      subtitle={dict.smashOrPass.empty.subtitle}
      headingClassName="text-xl font-black text-text-primary"
      subtitleClassName="text-xs text-text-muted"
      className="max-w-md w-full rounded-3xl border border-accent-red/30 bg-bg-surface p-8 text-center space-y-5 shadow-xl dark:shadow-2xl backdrop-blur-md pointer-events-auto"
    >
      {/* Session Stats Summary */}
      <div className="grid grid-cols-2 gap-3 py-2">
        <Surface tone="elevated" radius="2xl" padding="none" className="p-4">
          <span className="type-label-sm text-accent-red">{dict.smashOrPass.smash}</span>
          <p className="text-2xl font-black text-text-primary">{sessionSmashes}</p>
        </Surface>
        <Surface tone="elevated" radius="2xl" padding="none" className="p-4">
          <span className="type-label-sm text-text-muted">{dict.smashOrPass.pass}</span>
          <p className="text-2xl font-black text-text-primary">{sessionPasses}</p>
        </Surface>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button variant="primary" size="md" onClick={onOpenPersona} className="flex-1 rounded-2xl">
          <span>{dict.smashOrPass.hud.archetype}</span>
        </Button>

        <Button variant="secondary" size="md" onClick={onReset} className="flex-1 rounded-2xl">
          <RotateCcw className="h-4 w-4 text-text-muted" />
          <span>{dict.smashOrPass.empty.resetAction}</span>
        </Button>
      </div>
    </EmptyState>
  );
}
