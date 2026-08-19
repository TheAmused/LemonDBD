// frontend/src/components/streaks/gauntlet/GauntletFireBackground.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine, ISourceOptions } from '@tsparticles/engine';
import lottie, { AnimationItem } from 'lottie-web';
import flameData from './gauntletFlame.json';

export interface GauntletFireBackgroundProps {
  /** 0-based tier_level from the run's tier_info. Clamped to the 4 stages below. */
  tierLevel: number;
}

interface FlameSpot {
  x: number;
  size: number;
}

interface FireStage {
  /** How far up the viewport the glow reaches, as a CSS ellipse height percentage. */
  glowReach: string;
  glowColor: string;
  glowSize: string;
  flames: FlameSpot[];
  particleCount: number;
  particleColors: string[];
  sizeMin: number;
  sizeMax: number;
  opacityMin: number;
  opacityMax: number;
  speed: number;
}

// Nothing at tier 0, a first flame at tier 1, more and bigger through tier 3.
// Numbers are a starting point, tune them once this is seen live on the page.
const STAGES: FireStage[] = [
  {
    glowReach: '0%',
    glowColor: 'rgba(0,0,0,0)',
    glowSize: '0%',
    flames: [],
    particleCount: 0,
    particleColors: [],
    sizeMin: 0, sizeMax: 0, opacityMin: 0, opacityMax: 0, speed: 0,
  },
  {
    glowReach: '55%',
    glowColor: 'rgba(242,125,12,0.32)',
    glowSize: '110%',
    flames: [{ x: 38, size: 130 }, { x: 62, size: 130 }],
    particleCount: 45,
    particleColors: ['#fdcf58', '#f27d0c'],
    sizeMin: 0.8, sizeMax: 2, opacityMin: 0.2, opacityMax: 0.5, speed: 1.4,
  },
  {
    glowReach: '68%',
    glowColor: 'rgba(178,32,9,0.44)',
    glowSize: '150%',
    flames: [
      { x: 22, size: 140 }, { x: 36, size: 170 }, { x: 50, size: 190 },
      { x: 64, size: 170 }, { x: 78, size: 140 },
    ],
    particleCount: 110,
    particleColors: ['#fdcf58', '#f27d0c', '#c41414'],
    sizeMin: 1.2, sizeMax: 2.8, opacityMin: 0.25, opacityMax: 0.6, speed: 2.6,
  },
  {
    glowReach: '85%',
    glowColor: 'rgba(148,9,9,0.65)',
    glowSize: '200%',
    flames: [
      { x: 18, size: 150 }, { x: 27, size: 200 }, { x: 36, size: 160 },
      { x: 45, size: 220 }, { x: 55, size: 220 }, { x: 64, size: 160 },
      { x: 73, size: 200 }, { x: 82, size: 150 },
    ],
    particleCount: 220,
    particleColors: ['#fdcf58', '#757676', '#f27d0c', '#c41414', '#f07f13'],
    sizeMin: 1.4, sizeMax: 3.4, opacityMin: 0.22, opacityMax: 0.7, speed: 4.2,
  },
];

async function registerEngine(engine: Engine): Promise<void> {
  await loadSlim(engine);
}

/**
 * One flame instance. Owns its own lottie-web player rather than going through
 * a React wrapper, so mount/unmount and cleanup are explicit and predictable.
 */
const FlameSpot: React.FC<{ spot: FlameSpot }> = ({ spot }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: flameData,
      rendererSettings: { preserveAspectRatio: 'xMidYMax meet' },
    });
    // Stagger playback so a row of flames never breathes in lockstep.
    anim.goToAndPlay(Math.floor(Math.random() * anim.totalFrames), true);
    animRef.current = anim;
    return () => anim.destroy();
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-0 -translate-x-1/2"
      style={{ left: `${spot.x}%`, width: spot.size, height: spot.size }}
    />
  );
};

export const GauntletFireBackground: React.FC<GauntletFireBackgroundProps> = ({ tierLevel }) => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const stageIndex = Math.max(0, Math.min(STAGES.length - 1, tierLevel));
  const stage = STAGES[stageIndex];

  const particleOptions: ISourceOptions = useMemo(
    () => ({
      fpsLimit: 60,
      detectRetina: true,
      fullScreen: { enable: false },
      particles: {
        number: { value: stage.particleCount, density: { enable: true, width: 1600, height: 900 } },
        color: { value: stage.particleColors },
        shape: { type: 'circle' },
        opacity: {
          value: { min: stage.opacityMin, max: stage.opacityMax },
          animation: { enable: !reduceMotion, speed: 2.5, sync: false, startValue: 'random' },
        },
        size: {
          value: { min: stage.sizeMin, max: stage.sizeMax },
          animation: { enable: !reduceMotion, speed: 3, sync: false, startValue: 'random' },
        },
        move: {
          enable: !reduceMotion,
          speed: stage.speed,
          direction: 'top',
          random: true,
          straight: false,
          outModes: { default: 'out', bottom: 'none' },
        },
      },
      interactivity: { events: { onHover: { enable: false }, onClick: { enable: false }, resize: true } },
      background: { color: 'transparent' },
    }),
    [stage, reduceMotion]
  );

  if (stageIndex === 0) return null;

  return (
    // Pinned behind the whole page, not any single card, so it reads as the
    // trial's mood rather than something competing with what the player is
    // reading. Never above content, only ever behind it.
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 transition-[opacity,background] duration-700"
        style={{
          background: `radial-gradient(ellipse ${stage.glowSize} ${stage.glowReach} at 50% 100%, ${stage.glowColor}, transparent 75%)`,
        }}
      />

      {!reduceMotion && stage.flames.map((spot, i) => <FlameSpot key={i} spot={spot} />)}

      <ParticlesProvider init={registerEngine}>
        <Particles
          id="gauntlet-fire-particles"
          options={particleOptions}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      </ParticlesProvider>
    </div>
  );
};
