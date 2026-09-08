// frontend/src/components/generator/shared/StageFrame.tsx
'use client';

import React from 'react';
import { RoleCategory } from '@/types/perks';
import { cn } from '@/utils/cn';

interface StageFrameProps {
  role: RoleCategory;
  children: React.ReactNode;
  className?: string;
  /** Floats bare (no banner/background of its own) over the stage's
   * top-left corner -- the role toggle + mode tabs now live here instead
   * of in a separate toolbar bar above the stage. */
  topLeft?: React.ReactNode;
  /** Floats bare over the stage's top-right corner -- the no-repeat/blind/
   * chaos/sound/reset icon buttons. */
  topRight?: React.ReactNode;
}

export const StageFrame: React.FC<StageFrameProps> = ({ role, children, className, topLeft, topRight }) => {
  const isSurvivor = role === 'Survivor';

  return (
    <div
      className={cn(
        'relative z-10 overflow-hidden border-b border-border-color p-2 sm:p-5 lg:p-6 transition-colors duration-300',
        className
      )}
    >
      {/* Survivor-only Atmospheric Top Mist */}
      {isSurvivor && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-500 dbd-ambient-mist--survivor"
        />
      )}

      {/* Cinematic Edge Vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 dbd-cinematic-vignette"
      />

      {(topLeft || topRight) && (
        <div className="relative z-20 mb-3 sm:mb-4 flex flex-col items-center justify-center gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full xl:w-auto shrink-0 order-1 xl:order-2">
            {topRight}
          </div>
          <div className="w-full xl:w-auto min-w-0 order-2 xl:order-1 flex justify-center xl:justify-start">
            {topLeft}
          </div>
        </div>
      )}

      <div className="relative z-10 flex h-full min-h-[320px] flex-col items-center justify-center sm:min-h-[440px] lg:min-h-[520px]">
        {children}
      </div>
    </div>
  );
};
