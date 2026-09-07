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
        'relative z-0 overflow-hidden bg-white/80 dark:bg-[#0c0e14]/95 border-b border-border-color p-4 sm:p-6 transition-colors duration-300',
        className
      )}
    >
      {/* Survivor-only Atmospheric Top Mist -- the killer variant was a red
          glow and was removed in favor of the particle field above. */}
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

      {/* A small floor so the stage never looks collapsed when totally
          empty -- the real anti-jank fix is each mode reserving its own
          footprint (e.g. an empty-slot grid before rolling) so it doesn't
          change size when results appear. A single large height forced on
          every mode regardless of what it's showing just left a lot of
          dead background under short content instead. */}
      {(topLeft || topRight) && (
        <div className="relative z-20 mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">{topLeft}</div>
          <div className="flex flex-wrap items-center gap-1.5">{topRight}</div>
        </div>
      )}

      {/* One consistent height for every mode -- this is what actually kills
          the "stutter": before, each mode (Wheel/Slot/Crate/...) sized its
          own content and the box would visibly jump in height switching
          between them (and on role switch, since key={role} remounts the
          active mode). Now the box itself never resizes; only what's drawn
          inside it changes.

          The floor is a fixed-px scale (not a raw vh figure) capped by a
          dvh-based ceiling: a bare min-h-[62vh]-style value grows without
          limit on short/landscape mobile screens, which is exactly what
          pushed a mode's own CTA button off the bottom of the viewport and
          forced a page-level scroll to reach it. `max-h` + `overflow-y-auto`
          means that if a mode's content is ever still taller than the
          available viewport (a very short window, aggressive OS zoom, etc.)
          the scrollbar shows up *inside this box*, not on the page -- the
          mode's tabs/toolbar above it and the surrounding page chrome stay
          put either way. */}
      <div className="relative z-10 flex h-full min-h-[380px] max-h-[min(calc(100dvh-9rem),620px)] flex-col items-center justify-center overflow-y-auto sm:min-h-[440px] sm:max-h-[min(calc(100dvh-10rem),660px)] lg:min-h-[520px] lg:max-h-[min(calc(100dvh-11rem),700px)]">
        {children}
      </div>
    </div>
  );
};
