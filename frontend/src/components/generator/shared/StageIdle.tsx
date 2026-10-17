// frontend/src/components/generator/shared/StageIdle.tsx
'use client';
// The pieces every generator mode shares on its resting screen: a centred column, the flavour line
// above the action and the picture (lever, crate, tarot deck) you click to start.
import React from 'react';
import { cn } from '@/utils/cn';

export const StageIdleColumn: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('flex flex-col items-center justify-center gap-3 sm:gap-6 xl:gap-8 2xl:gap-10 py-2 sm:py-6 wide:py-8', className)}>
    {children}
  </div>
);

export const StagePrompt: React.FC<{ live?: boolean; className?: string; children: React.ReactNode }> = ({ live, className, children }) => (
  <p
    aria-live={live ? 'polite' : undefined}
    className={cn('max-w-lg xl:max-w-2xl 2xl:max-w-3xl wide:max-w-4xl text-center text-xs sm:text-base xl:text-lg wide:text-xl font-semibold text-text-secondary', className)}
  >
    {children}
  </p>
);

export const StageProp: React.FC<{ src: string }> = ({ src }) => (
  <img
    src={src}
    alt=""
    className="h-28 w-28 sm:h-36 sm:w-36 xl:h-48 xl:w-48 2xl:h-60 2xl:w-60 wide:h-72 wide:w-72 object-contain drop-shadow-2xl select-none pointer-events-none group-hover:drop-shadow-glow-amber-md transition-all duration-300"
    draggable={false}
  />
);
