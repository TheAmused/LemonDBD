'use client';
// frontend/src/components/landing/FogHeartbeatBackground.tsx

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Ember {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
}

/**
 * Purely decorative, pointer-events-none backdrop for the landing page:
 * drifting fog banks, rising embers, and a slow "terror radius" heartbeat
 * vignette pulse -- all driven by framer-motion so it stays perf-friendly
 * (a handful of animated divs, no canvas/particle engine).
 */
export const FogHeartbeatBackground: React.FC = () => {
  const embers = useMemo<Ember[]>(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 3,
        duration: 9 + Math.random() * 10,
        delay: Math.random() * 8,
        drift: (Math.random() - 0.5) * 60,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Heartbeat vignette -- slow pulse of the red terror-radius glow */}
      <motion.div
        className="absolute inset-0 landing-heartbeat-vignette"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Drifting fog banks */}
      <motion.div
        className="absolute -left-1/4 top-1/3 h-[36rem] w-[36rem] rounded-full bg-text-muted/10 blur-[100px]"
        animate={{ x: ['0%', '18%', '0%'], y: ['0%', '-6%', '0%'] }}
        transition={{ duration: 34, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-1/4 top-1/2 h-[40rem] w-[40rem] rounded-full bg-accent-red/10 blur-[110px]"
        animate={{ x: ['0%', '-14%', '0%'], y: ['0%', '8%', '0%'] }}
        transition={{ duration: 40, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute left-1/3 -bottom-1/4 h-[30rem] w-[30rem] rounded-full bg-accent-amber/10 blur-[100px]"
        animate={{ x: ['0%', '10%', '0%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />

      {/* Rising embers, like ash from a sacrificed generator */}
      {embers.map((ember) => (
        <motion.span
          key={ember.id}
          className="absolute -bottom-[2%] rounded-full bg-accent-amber/70 landing-ember-glow"
          style={{
            left: `${ember.left}%`,
            width: ember.size,
            height: ember.size,
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 0.9, 0],
            y: ['0vh', '-70vh'],
            x: [0, ember.drift],
          }}
          transition={{
            duration: ember.duration,
            delay: ember.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {/* Static fog overlay texture for depth */}
      <div className="absolute inset-0 landing-static-fog" />
    </div>
  );
};
