'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine, ISourceOptions } from '@tsparticles/engine';
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

async function registerEngine(engine: Engine): Promise<void> {
  await loadSlim(engine);
}

export const StageFrame: React.FC<StageFrameProps> = ({ role, children, className, topLeft, topRight }) => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const isSurvivor = role === 'Survivor';
  const particleColor = isSurvivor ? '#10b981' : '#f43f5e';

  const particleOptions: ISourceOptions = useMemo(
    () => ({
      fpsLimit: 60,
      detectRetina: true,
      fullScreen: { enable: false },
      particles: {
        number: { value: reduceMotion ? 0 : 28, density: { enable: true, width: 800, height: 800 } },
        color: { value: particleColor },
        shape: { type: 'circle' },
        opacity: { value: { min: 0.05, max: 0.25 } },
        size: { value: { min: 1, max: 2.5 } },
        move: {
          enable: !reduceMotion,
          speed: 0.6,
          direction: 'none',
          random: true,
          straight: false,
          outModes: { default: 'out' },
        },
      },
      interactivity: { events: { onHover: { enable: false }, onClick: { enable: false }, resize: true } },
      background: { color: 'transparent' },
    }),
    [particleColor, reduceMotion]
  );

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl bg-slate-950/40 p-4 sm:p-6',
        className
      )}
    >
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <ParticlesProvider init={registerEngine}>
          <Particles
            id="generator-stage-particles"
            options={particleOptions}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          />
        </ParticlesProvider>
      </div>

      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0',
          reduceMotion ? 'dbd-heartbeat-vignette--static' : 'dbd-heartbeat-vignette'
        )}
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

      {/* One consistent, viewport-driven height for every mode -- this is what
          actually kills the "stutter": before, each mode (Wheel/Slot/Crate/...) sized
          its own content and the box would visibly jump in height switching between
          them (and on role switch, since key={role} remounts the active mode). Now
          the box itself never resizes; only what's drawn inside it changes. It also
          uses the real available screen instead of a small 240px floor, so there's
          no dead space on desktop or mobile. */}
      <div className="relative z-10 flex h-full min-h-[62vh] sm:min-h-[66vh] lg:min-h-[72vh] flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
};
