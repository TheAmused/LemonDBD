// frontend/src/components/maps/voice/VoiceWaveform.tsx

import React from 'react';
import type { VoiceStatusState } from './voiceTypes';

interface VoiceWaveformProps {
  heights: number[];
  /** Prefix of each bar's React key. */
  keyPrefix: string;
  /** Shifts which bars share an animation speed, so the two sides don't pulse in step. */
  phaseOffset: number;
  /** Bar colour while the status is anything other than `matched`. */
  idleBarClass: string;
  voiceStatus: VoiceStatusState;
  audioLevel: number;
}

/** One side of the decorative equaliser that flanks the mic button. */
export function VoiceWaveform({ heights, keyPrefix, phaseOffset, idleBarClass, voiceStatus, audioLevel }: VoiceWaveformProps) {
  return (
    <div className="hidden sm:flex items-center gap-1.5 h-16 px-1" aria-hidden="true">
      {heights.map((h, i) => {
        const dynamicHeight =
          voiceStatus === 'listening'
            ? Math.max(8, Math.min(54, Math.round(h * (0.6 + (audioLevel / 100) * 1.2))))
            : voiceStatus === 'matched'
              ? 24
              : h;
        return (
          <span
            key={`${keyPrefix}-${i}`}
            style={{
              height: `${dynamicHeight}px`,
              animation:
                voiceStatus === 'listening'
                  ? `pulse ${(0.4 + ((i + phaseOffset) % 4) * 0.12).toFixed(2)}s ease-in-out infinite alternate`
                  : 'none',
            }}
            className={`w-1.5 rounded-full transition-all duration-150 ${
              voiceStatus === 'matched' ? 'bg-accent-green' : idleBarClass
            }`}
          />
        );
      })}
    </div>
  );
}
