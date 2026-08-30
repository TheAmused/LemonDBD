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
}

async function registerEngine(engine: Engine): Promise<void> {
  await loadSlim(engine);
}

export const StageFrame: React.FC<StageFrameProps> = ({ role, children, className }) => {
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
        'dbd-fog-overlay relative overflow-hidden rounded-3xl bg-slate-950/40 p-4 sm:p-6',
        className
      )}
    >
      <ParticlesProvider init={registerEngine}>
        <Particles
          id="generator-stage-particles"
          options={particleOptions}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />
      </ParticlesProvider>
      <div className="relative z-10">{children}</div>
    </div>
  );
};
