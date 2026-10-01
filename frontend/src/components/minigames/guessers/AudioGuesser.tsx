// frontend/src/components/minigames/guessers/AudioGuesser.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Volume2, VolumeX, Play, Pause, Activity, Check, X, Disc3 } from 'lucide-react';
import type { GuessRecord, RoundConfig, CatalogCharacter } from '@/types/minigame';
import type { Dictionary } from '@/locales/types';
import { soundEngine } from '@/utils/minigames/MinigameSoundEngine';
import { staticUrl } from '@/utils/api';

import { tip } from '@/components/common/Tooltip';
interface AudioGuesserProps {
  roundConfig: RoundConfig;
  characters: CatalogCharacter[];
  guesses: GuessRecord[];
  isSolved: boolean;
  dict: Dictionary;
  children?: React.ReactNode;
}

export const AudioGuesser: React.FC<AudioGuesserProps> = ({
  roundConfig,
  characters,
  guesses,
  isSolved,
  dict,
  children,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthTimerRef = useRef<NodeJS.Timeout | null>(null);
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

  // Real audio stream endpoint from LemonDBD API
  const audioSrc = useMemo(() => {
    if (roundConfig.custom_data?.audio_endpoint) {
      return roundConfig.custom_data.audio_endpoint as string;
    }
    if (!targetChar) return null;
    return `/api/v1/minigames/audio/terror_radius/${targetChar.id}`;
  }, [roundConfig.custom_data, targetChar]);

  // Progressive clues unlocked per wrong attempt
  const attempts = guesses.length;
  const speedClue = attempts >= 1 && targetChar ? `Movement Speed: ${targetChar.movement_speed || (targetChar.speed ? `${targetChar.speed} m/s` : '')}` : null;
  const terrorClue = attempts >= 2 && targetChar ? `Terror Radius: ${targetChar.terror_radius || (targetChar.terror_radius_meters ? `${targetChar.terror_radius_meters}m` : '')}` : null;
  const heightClue = attempts >= 3 && targetChar ? `Height: ${targetChar.height || ''}` : null;

  // Cleanup on unmount or round switch
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (synthTimerRef.current) {
        clearTimeout(synthTimerRef.current);
      }
      soundEngine.stopAll();
      setIsPlaying(false);
    };
  }, [roundConfig.round_number]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      if (audioRef.current && !useFallback) {
        audioRef.current.pause();
      }
      if (synthTimerRef.current) {
        clearTimeout(synthTimerRef.current);
      }
      soundEngine.stopAll();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);

    if (useFallback || !audioSrc) {
      // Play synthetic heartbeat fallback
      const dist = attempts === 0 ? 32 : attempts === 1 ? 16 : attempts === 2 ? 8 : 0;
      soundEngine.playHeartbeat(dist, 6);
      synthTimerRef.current = setTimeout(() => {
        setIsPlaying(false);
      }, 6000);
      return;
    }

    if (audioRef.current) {
      audioRef.current
        .play()
        .catch((err) => {
          console.warn('[AudioGuesser] HTML5 audio play failed, falling back to Web Audio synth:', err);
          setUseFallback(true);
          soundEngine.playHeartbeat(32, 6);
          synthTimerRef.current = setTimeout(() => setIsPlaying(false), 6000);
        });
    }
  }, [isPlaying, useFallback, audioSrc, attempts]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (audioRef.current) {
      audioRef.current.muted = next;
    }
    soundEngine.setMuted(next);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 0;
    setCurrentTime(cur);
    setDuration(dur);
    setAudioProgress(dur > 0 ? (cur / dur) * 100 : 0);
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec <= 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const rawAvatarUrl = targetChar?.avatar_url || '';
  const avatarUrl = staticUrl(rawAvatarUrl) || rawAvatarUrl;

  return (
    <div className="w-full flex flex-col items-center my-6">
      {/* Hidden real HTML5 audio player */}
      {audioSrc && !useFallback && (
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onError={() => {
            console.warn('[AudioGuesser] Audio source error, switching to synthetic fallback.');
            setUseFallback(true);
          }}
        />
      )}

      {/* Audio Player Clue Card */}
      <div className="w-full max-w-lg p-6 rounded-2xl bg-bg-surface border border-border-color shadow-2xl flex flex-col items-center gap-4 relative overflow-hidden">
        {/* Header Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent-red/10 border border-accent-red/30 text-accent-red text-xs font-bold uppercase tracking-wider">
          <Disc3 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin' : ''}`} />
          <span>{dict.minigames.audio.themeBadge}</span>
        </div>

        {/* Ambient Waveform Visualization */}
        <div className="flex items-end justify-center gap-1.5 h-16 w-full max-w-xs py-2">
          {[35, 70, 50, 85, 55, 95, 65, 80, 45, 90, 60, 75, 40, 65].map((h, i) => (
            <div
              key={`bar-${i}`}
              className={`w-2 rounded-full transition-all duration-150 ${
                isPlaying
                  ? 'bg-accent-red animate-pulse'
                  : 'bg-border-color/60'
              }`}
              style={{
                height: isPlaying ? `${Math.max(18, (h * (i % 2 === 0 ? 0.9 : 1.15)) % 100)}%` : '18%',
                animationDelay: `${i * 60}ms`,
              }}
            />
          ))}
        </div>

        {/* Playback Controls & Timeline */}
        <div className="w-full max-w-sm flex flex-col gap-2">
          {duration > 0 && !useFallback && (
            <div className="flex items-center justify-between text-2xs font-mono text-text-muted px-1">
              <span>{formatSeconds(currentTime)}</span>
              <div className="flex-1 mx-3 h-1 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-red transition-all duration-150"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
              <span>{formatSeconds(duration)}</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm tracking-wide shadow-lg transition-all transform active:scale-95 ${
                isPlaying
                  ? 'bg-bg-elevated text-text-primary border border-border-color hover:bg-bg-surface'
                  : 'bg-accent-red text-text-inverted hover:bg-accent-red-hover shadow-accent-red/30'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>{dict.minigames.audio.pauseMusic}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>{dict.minigames.audio.listenTheme}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              {...tip(isMuted ? dict.minigames.audio.unmute : dict.minigames.audio.mute)} aria-label={isMuted ? dict.minigames.audio.unmute : dict.minigames.audio.mute}
              className="p-2.5 rounded-xl bg-bg-elevated border border-border-color text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-accent-red" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Progressive Clues Section */}
        {(speedClue || terrorClue || heightClue) && (
          <div className="w-full flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-border-color">
            {speedClue && (
              <span className="px-3 py-1 rounded-lg bg-bg-elevated border border-border-subtle text-xs font-medium text-text-secondary">
                {speedClue}
              </span>
            )}
            {terrorClue && (
              <span className="px-3 py-1 rounded-lg bg-bg-elevated border border-border-subtle text-xs font-medium text-text-secondary">
                {terrorClue}
              </span>
            )}
            {heightClue && (
              <span className="px-3 py-1 rounded-lg bg-bg-elevated border border-border-subtle text-xs font-medium text-text-secondary">
                {heightClue}
              </span>
            )}
          </div>
        )}

        {/* Solved Victory Reveal */}
        {isSolved && targetChar && (
          <div className="mt-2 px-4 py-2 rounded-xl bg-accent-green text-text-inverted font-bold text-sm flex items-center gap-3 shadow-lg">
            {avatarUrl && (
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-border-color">
                <Image src={avatarUrl} alt={targetChar.name} fill className="object-cover" />
              </div>
            )}
            <Check className="w-4 h-4" />
            <span>{targetChar.name}</span>
          </div>
        )}
      </div>

      {/* Input & Action Controls Slot */}
      {children && <div className="w-full max-w-lg my-3">{children}</div>}

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
                    ? 'bg-accent-green text-text-inverted border-accent-green shadow-md'
                    : 'bg-accent-red/20 text-accent-red border-accent-red/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-text-muted">#{idx + 1}</span>
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
