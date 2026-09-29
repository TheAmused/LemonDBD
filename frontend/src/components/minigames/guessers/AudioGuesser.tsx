// frontend/src/components/minigames/guessers/AudioGuesser.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Volume2, VolumeX, Play, Square, Activity, Check, X, ShieldAlert } from 'lucide-react';
import type { GuessRecord, RoundConfig, CatalogCharacter } from '@/types/minigame';
import type { Dictionary } from '@/locales/types';
import { soundEngine } from '@/utils/minigames/MinigameSoundEngine';

interface AudioGuesserProps {
  roundConfig: RoundConfig;
  characters: CatalogCharacter[];
  guesses: GuessRecord[];
  isSolved: boolean;
  dict: Dictionary;
}

export const AudioGuesser: React.FC<AudioGuesserProps> = ({
  roundConfig,
  characters,
  guesses,
  isSolved,
  dict,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const t = dict.minigames;
  const mode = roundConfig.mode;

  const targetChar = useMemo(() => {
    if (roundConfig.target_type) {
      const match = characters.find(
        (c) =>
          c.id === roundConfig.target_id &&
          c.role?.toLowerCase() === roundConfig.target_type?.toLowerCase()
      );
      if (match) return match;
    }
    return characters.find((c) => c.id === roundConfig.target_id);
  }, [characters, roundConfig.target_id, roundConfig.target_type]);

  // Current distance for terror radius
  const currentDistance = useMemo(() => {
    const attempts = guesses.length;
    if (attempts === 0) return 32;
    if (attempts === 1) return 16;
    if (attempts === 2) return 8;
    return 0; // Chase
  }, [guesses.length]);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Clean up sounds and timers when unmounting or switching rounds
  useEffect(() => {
    return () => {
      clearTimer();
      soundEngine.stopAll();
      setIsPlaying(false);
    };
  }, [roundConfig.round_number, clearTimer]);

  const handlePlayAudio = useCallback(() => {
    if (isPlaying) {
      clearTimer();
      soundEngine.stopAll();
      setIsPlaying(false);
      return;
    }

    clearTimer();
    setIsPlaying(true);

    if (mode === 'terror_radius') {
      soundEngine.playHeartbeat(currentDistance, 6);
      timeoutRef.current = setTimeout(() => setIsPlaying(false), 6000);
    } else if (mode === 'hook_scream') {
      const charName = (targetChar?.name || '').toLowerCase();
      let screamType: 'steve' | 'elodie' | 'doctor' | 'general' = 'general';
      if (charName.includes('steve')) screamType = 'steve';
      else if (charName.includes('élodie') || charName.includes('elodie')) screamType = 'elodie';
      else if (charName.includes('doctor') || charName.includes('herman')) screamType = 'doctor';

      soundEngine.playScreamSound(screamType);
      timeoutRef.current = setTimeout(() => setIsPlaying(false), 2000);
    } else {
      // General voice line or alert chime
      soundEngine.playHeartbeat(16, 4);
      timeoutRef.current = setTimeout(() => setIsPlaying(false), 4000);
    }
  }, [isPlaying, mode, currentDistance, targetChar, clearTimer]);


  return (
    <div className="w-full flex flex-col items-center my-6">
      {/* Audio Stage Card */}
      <div className="w-full max-w-lg p-6 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl flex flex-col items-center gap-4 relative overflow-hidden">

        {/* Distance clue — only shown AFTER first wrong guess */}
        {mode === 'terror_radius' && guesses.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent-red/10 border border-accent-red/30 text-accent-red text-xs font-bold uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>
              {currentDistance > 0 ? `Heartbeat at ${currentDistance}m` : 'Chase Speed (0m)'}
            </span>
          </div>
        )}

        {/* First-time instruction */}
        {guesses.length === 0 && (
          <p className="text-xs text-zinc-500 text-center max-w-xs">
            Listen to the synthesized heartbeat — each wrong guess brings the Killer closer.
            Identify which Killer it belongs to.
          </p>
        )}

        {/* Waveform Visualization Bars */}
        <div className="flex items-end justify-center gap-1.5 h-16 w-full max-w-xs py-2">
          {[40, 75, 55, 90, 60, 100, 70, 85, 45, 95, 65, 80, 50, 70].map((h, i) => (
            <div
              key={`bar-${i}`}
              className={`w-2 rounded-full transition-all duration-200 ${
                isPlaying
                  ? 'bg-accent-red animate-pulse'
                  : 'bg-zinc-700/60'
              }`}
              style={{
                height: isPlaying ? `${Math.max(15, (h * (i % 2 === 0 ? 0.9 : 1.1)) % 100)}%` : '20%',
                animationDelay: `${i * 70}ms`,
              }}
            />
          ))}
        </div>

        {/* Play / Stop Button */}
        <button
          type="button"
          onClick={handlePlayAudio}
          className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg transition-all transform active:scale-95 ${
            isPlaying
              ? 'bg-zinc-800 text-zinc-200 border border-zinc-600 hover:bg-zinc-700'
              : 'bg-accent-red text-white hover:bg-accent-red/90 shadow-accent-red/30'
          }`}
        >
          {isPlaying ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Audio</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>{t.audio.playSample}</span>
            </>
          )}
        </button>

        {isSolved && targetChar && (
          <div className="mt-2 px-4 py-1.5 rounded-lg bg-emerald-600/90 text-white font-bold text-sm flex items-center gap-2 shadow-md">
            <Check className="w-4 h-4" />
            <span>{targetChar.name}</span>
          </div>
        )}
      </div>

      {/* Prior Guesses List */}
      {guesses.length > 0 && (
        <div className="w-full max-w-lg mt-6 space-y-2">
          {guesses.map((g, idx) => {
            const isCorrect = g.evaluation.is_correct;
            return (
              <div
                key={`audio-g-${idx}`}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
                  isCorrect
                    ? 'bg-emerald-600/90 text-white border-emerald-400 shadow-md'
                    : 'bg-red-950/70 text-red-200 border-red-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-zinc-400">#{idx + 1}</span>
                  <span>{g.guess.name}</span>
                </div>
                {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 opacity-60" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
