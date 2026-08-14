'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  VolumeX,
  Keyboard,
  Compass,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  matchVoiceQuery,
  getVariantsForMap,
  MapSource,
  MatchResult,
} from '@/utils/mapVoiceMatcher';

export interface VoiceCommandBannerProps {
  locale?: string;
  currentSource: 'all' | 'hens333' | 'samoelcolt';
  onSourceChange: (source: 'all' | 'hens333' | 'samoelcolt') => void;
  onSelectMap: (mapName: string, mapId?: string, source?: string) => void;
  onAction?: (action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close') => void;
  availableMaps?: Array<{ id: string; name: string; realm?: string; source?: string }>;
  className?: string;
}

export type VoiceStatusState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'matched'
  | 'nomatch'
  | 'error';

// ─── Web Audio API Shared Context & Synthesizers ──────────────────────────────

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioCtx();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

function playMicStartSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Dual-tone high-tech activation beep (Tone 1: 540Hz -> 760Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(540, now);
    osc1.frequency.exponentialRampToValueAtTime(760, now + 0.1);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Tone 2: 880Hz high chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.05);
    gain2.gain.setValueAtTime(0.1, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.16);
  } catch {
    // Gracefully ignore audio errors (e.g. autoplay policies)
  }
}

function playMatchSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Ascending melodic chime (C5, E5, G5, C6)
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.055;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  } catch {
    // Gracefully ignore audio errors
  }
}

// ─── Quick Prompt Chips ───────────────────────────────────────────────────────

const QUICK_COMMAND_PROMPTS = [
  { label: "Azarov's", query: "Azarov's Resting Place", type: 'map' },
  { label: 'RPD East', query: 'RPD East Wing', type: 'variant' },
  { label: 'Badham 2', query: 'Preschool II', type: 'variant' },
  { label: 'Dead Dawg', query: 'Dead Dawg Saloon', type: 'map' },
  { label: 'The Game', query: 'The Game', type: 'map' },
  { label: 'Switch to Samoel', query: 'Switch to Samoel', type: 'source' },
  { label: 'Switch to Hens', query: 'Switch to Hens', type: 'source' },
  { label: 'Zoom In', query: 'Zoom In', type: 'action' },
  { label: 'Fullscreen', query: 'Fullscreen', type: 'action' },
];

export function VoiceCommandBanner({
  locale = 'en',
  currentSource,
  onSourceChange,
  onSelectMap,
  onAction,
  availableMaps,
  className = '',
}: VoiceCommandBannerProps) {
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatusState>('idle');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [matchedResult, setMatchedResult] = useState<MatchResult | null>(null);
  const [disambiguationVariants, setDisambiguationVariants] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const liveTranscriptRef = useRef<string>('');
  const pendingMatchRef = useRef<MatchResult | null>(null);

  // Keep references to latest callbacks and props
  const propsRef = useRef({
    currentSource,
    onSourceChange,
    onSelectMap,
    onAction,
    availableMaps,
    soundEnabled,
  });

  useEffect(() => {
    propsRef.current = {
      currentSource,
      onSourceChange,
      onSelectMap,
      onAction,
      availableMaps,
      soundEnabled,
    };
  }, [currentSource, onSourceChange, onSelectMap, onAction, availableMaps, soundEnabled]);

  // Check Web Speech API browser support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRec =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) {
        setIsSupported(false);
      }
    }
  }, []);

  // Clear timers, remove recognition listeners, and abort speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch {}
      }
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  // ─── Execute Match Result Helper ────────────────────────────────────────────

  const executeMatch = useCallback(
    (result: MatchResult) => {
      setMatchedResult(result);
      pendingMatchRef.current = null;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      const { onSourceChange, onAction, onSelectMap, soundEnabled } = propsRef.current;

      if (result.action === 'switch_source' && result.actionPayload) {
        setVoiceStatus('matched');
        if (soundEnabled) playMatchSuccessSound();
        onSourceChange(result.actionPayload as MapSource);
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          setVoiceStatus('idle');
        }, 2200);
        return;
      }

      if (result.action && ['zoom_in', 'zoom_out', 'fullscreen', 'close'].includes(result.action)) {
        setVoiceStatus('matched');
        if (soundEnabled) playMatchSuccessSound();
        onAction?.(result.action as 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close');
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          setVoiceStatus('idle');
        }, 2200);
        return;
      }

      if (result.matchedMapName) {
        setVoiceStatus('matched');
        if (result.availableVariants && result.availableVariants.length > 0) {
          setDisambiguationVariants(result.availableVariants);
        }
        if (soundEnabled) playMatchSuccessSound();
        onSelectMap(result.matchedMapName, result.matchedMapId, result.source);

        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          setVoiceStatus('idle');
        }, 3000);
      }
    },
    []
  );

  // ─── Manual Command Trigger (Chips & Pills) ─────────────────────────────────

  const handleExecuteCommand = useCallback(
    (query: string) => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      liveTranscriptRef.current = query;
      setLiveTranscript(query);
      setErrorMessage('');

      const result = matchVoiceQuery(
        query,
        propsRef.current.currentSource,
        propsRef.current.availableMaps
      );

      if (result) {
        executeMatch(result);
      } else {
        setVoiceStatus('nomatch');
        resetTimerRef.current = setTimeout(() => {
          setVoiceStatus('idle');
        }, 2000);
      }
    },
    [executeMatch]
  );

  // ─── Start / Stop Speech Recognition ────────────────────────────────────────

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setVoiceStatus('idle');
  }, []);

  const startListening = useCallback(() => {
    if (isListeningRef.current || voiceStatus === 'listening') {
      stopListening();
      return;
    }

    if (typeof window === 'undefined') return;
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceStatus('error');
      setErrorMessage('Web Speech API is not supported in this browser.');
      return;
    }

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    pendingMatchRef.current = null;

    try {
      const recognition = new SpeechRec();
      recognitionRef.current = recognition;

      recognition.lang = locale === 'tr' ? 'tr-TR' : 'en-US';
      recognition.interimResults = true;
      recognition.maxAlternatives = 5;
      recognition.continuous = false;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setVoiceStatus('listening');
        liveTranscriptRef.current = '';
        setLiveTranscript('');
        setMatchedResult(null);
        setErrorMessage('');
        pendingMatchRef.current = null;
        if (propsRef.current.soundEnabled) {
          playMicStartSound();
        }
      };

      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';
        const alternatives: string[] = [];
        let hasFinalResult = false;

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalText += res[0].transcript + ' ';
            hasFinalResult = true;
          } else {
            interimText += res[0].transcript + ' ';
          }
          for (let j = 0; j < res.length; j++) {
            alternatives.push(res[j].transcript);
          }
        }

        const combinedTranscript = (finalText + interimText).trim();
        liveTranscriptRef.current = combinedTranscript;
        setLiveTranscript(combinedTranscript);

        // Find best match candidate
        let bestMatch = matchVoiceQuery(
          combinedTranscript,
          propsRef.current.currentSource,
          propsRef.current.availableMaps
        );

        if (!bestMatch) {
          for (const alt of alternatives) {
            const altMatch = matchVoiceQuery(
              alt,
              propsRef.current.currentSource,
              propsRef.current.availableMaps
            );
            if (altMatch) {
              bestMatch = altMatch;
              break;
            }
          }
        }

        pendingMatchRef.current = bestMatch;
        setMatchedResult(bestMatch);

        // If the speech engine marked the utterance as FINAL, execute immediately
        if (hasFinalResult && bestMatch) {
          isListeningRef.current = false;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          try {
            recognition.stop();
          } catch {}
          executeMatch(bestMatch);
          return;
        }

        // For INTERIM results: do NOT cut off speech while the user is actively talking!
        // Instead, use a gentle silence debounce (1500ms) in case the browser delays isFinal.
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        if (bestMatch) {
          silenceTimerRef.current = setTimeout(() => {
            if (isListeningRef.current && pendingMatchRef.current) {
              isListeningRef.current = false;
              try {
                recognition.stop();
              } catch {}
              executeMatch(pendingMatchRef.current);
            }
          }, 1500);
        }
      };

      recognition.onerror = (event: any) => {
        isListeningRef.current = false;
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceStatus('error');
          setErrorMessage(
            'Microphone access blocked. Please allow microphone permissions in your browser address bar.'
          );
        } else if (event.error === 'no-speech') {
          setVoiceStatus('nomatch');
          resetTimerRef.current = setTimeout(() => {
            setVoiceStatus('idle');
          }, 2400);
        } else {
          setVoiceStatus('idle');
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        // When speech recognition ends naturally, execute any pending match
        const matchToExecute =
          pendingMatchRef.current ||
          matchVoiceQuery(
            liveTranscriptRef.current,
            propsRef.current.currentSource,
            propsRef.current.availableMaps
          );

        if (matchToExecute) {
          executeMatch(matchToExecute);
        } else {
          setVoiceStatus((prev) => {
            if (prev === 'listening') {
              return liveTranscriptRef.current ? 'nomatch' : 'idle';
            }
            return prev;
          });
          if (liveTranscriptRef.current) {
            resetTimerRef.current = setTimeout(() => {
              setVoiceStatus('idle');
            }, 2400);
          }
        }
      };

      recognition.start();
    } catch (err: any) {
      isListeningRef.current = false;
      setVoiceStatus('error');
      setErrorMessage(err?.message || 'Failed to initialize voice recognition.');
    }
  }, [voiceStatus, stopListening, locale, executeMatch]);

  // ─── Global Keyboard Hotkey: Press 'V' to Toggle Mic ───────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'textbox');

      if (!isInput && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        if (isListeningRef.current || voiceStatus === 'listening') {
          stopListening();
        } else {
          startListening();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startListening, stopListening, voiceStatus]);

  // ─── Status HUD Configurations ──────────────────────────────────────────────

  const statusConfig = {
    idle: {
      badge: 'IDLE • READY',
      badgeClass: 'bg-slate-800/80 border-slate-700 text-slate-300',
      dotClass: 'bg-cyan-400',
      icon: Mic,
      buttonColor:
        'bg-gradient-to-br from-cyan-600 via-cyan-700 to-blue-800 text-white shadow-cyan-900/40 ring-cyan-500/30 hover:from-cyan-500 hover:to-blue-700',
    },
    listening: {
      badge: 'LISTENING • SPEAK NOW',
      badgeClass: 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse',
      dotClass: 'bg-rose-500 animate-ping',
      icon: Volume2,
      buttonColor:
        'bg-gradient-to-br from-rose-500 via-red-600 to-rose-800 text-white shadow-red-900/60 ring-red-500/60 hover:from-rose-400 hover:to-red-700',
    },
    processing: {
      badge: 'PROCESSING...',
      badgeClass: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
      dotClass: 'bg-amber-400 animate-pulse',
      icon: RefreshCw,
      buttonColor:
        'bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800 text-white shadow-amber-900/50 ring-amber-500/40',
    },
    matched: {
      badge: 'MATCHED • EXECUTING',
      badgeClass: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
      dotClass: 'bg-emerald-400',
      icon: CheckCircle2,
      buttonColor:
        'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 text-white shadow-emerald-900/50 ring-emerald-500/50',
    },
    nomatch: {
      badge: 'NO MATCH • TRY AGAIN',
      badgeClass: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
      dotClass: 'bg-amber-400',
      icon: MicOff,
      buttonColor:
        'bg-gradient-to-br from-amber-600 via-stone-700 to-slate-800 text-white shadow-amber-900/30 ring-amber-500/30',
    },
    error: {
      badge: 'MIC BLOCKED • CHECK PERMISSION',
      badgeClass: 'bg-red-500/20 border-red-500/50 text-red-300',
      dotClass: 'bg-red-500',
      icon: AlertCircle,
      buttonColor:
        'bg-gradient-to-br from-red-700 via-red-800 to-slate-900 text-white shadow-red-900/40 ring-red-500/40',
    },
  };

  const currentCfg = statusConfig[voiceStatus];
  const StatusIcon = currentCfg.icon;

  if (!isSupported) {
    return (
      <div
        className={`relative overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/90 p-5 text-sm text-slate-400 backdrop-blur-md ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-200">Voice Navigation Unsupported</h4>
            <p className="text-xs text-slate-400">
              Your current browser does not support the Web Speech API. Please switch to Google
              Chrome, Microsoft Edge, or Safari for voice navigation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-slate-900/85 p-5 sm:p-6 backdrop-blur-xl shadow-2xl shadow-cyan-950/40 transition-all duration-300 ${className}`}
    >
      {/* Decorative ambient background glows */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* ─── TOP BAR: Status HUD Badge & Provider Source Segmented Toggle ─── */}
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        {/* Left: HUD Status Badge & Sound Toggle */}
        <div className="flex items-center gap-3">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold tracking-wide transition-all ${currentCfg.badgeClass}`}
          >
            <span className={`h-2 w-2 rounded-full ${currentCfg.dotClass}`} />
            <span>{currentCfg.badge}</span>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? 'Mute voice feedback sound' : 'Enable voice feedback sound'}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/50 text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
          </button>
        </div>

        {/* Right: Provider Source Segmented Toggle */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-950/70 p-1">
          <span className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Source:
          </span>
          <button
            type="button"
            onClick={() => onSourceChange('hens333')}
            aria-pressed={currentSource === 'hens333'}
            className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all ${
              currentSource === 'hens333'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/50 border border-cyan-400/30 font-bold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            Hens333 (12-Clock)
          </button>

          <button
            type="button"
            onClick={() => onSourceChange('samoelcolt')}
            aria-pressed={currentSource === 'samoelcolt'}
            className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all ${
              currentSource === 'samoelcolt'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/50 border border-purple-400/30 font-bold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            SamoelColt (Isometric)
          </button>

          <button
            type="button"
            onClick={() => onSourceChange('all')}
            aria-pressed={currentSource === 'all'}
            className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all ${
              currentSource === 'all'
                ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-md border border-slate-600 font-bold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            All Sources
          </button>
        </div>
      </div>

      {/* ─── CENTER HERO AREA: Waveform Visualizer, Glowing Mic Button & Live Transcription ─── */}
      <div className="relative z-10 my-6 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left Side Equalizer Waveform */}
        <div className="hidden sm:flex items-center gap-1.5 h-12 px-2">
          {[14, 24, 18, 32, 20, 38, 26, 16].map((h, i) => (
            <span
              key={`left-wave-${i}`}
              style={{
                height:
                  voiceStatus === 'listening'
                    ? `${h}px`
                    : voiceStatus === 'matched'
                    ? '28px'
                    : '6px',
                animation:
                  voiceStatus === 'listening'
                    ? `pulse ${(0.5 + (i % 4) * 0.15).toFixed(2)}s ease-in-out infinite alternate`
                    : 'none',
              }}
              className={`w-1 rounded-full transition-all duration-200 ${
                voiceStatus === 'listening'
                  ? 'bg-gradient-to-t from-cyan-500 to-emerald-400'
                  : voiceStatus === 'matched'
                  ? 'bg-emerald-400'
                  : 'bg-slate-700/60'
              }`}
            />
          ))}
        </div>

        {/* Center: Glowing Circular Mic Toggle Button */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative flex items-center justify-center">
            {/* Outer animated ping rings when listening */}
            {voiceStatus === 'listening' && (
              <>
                <span className="absolute h-24 w-24 animate-ping rounded-full bg-rose-500/20" />
                <span className="absolute h-28 w-28 animate-ping rounded-full bg-rose-500/10 [animation-delay:200ms]" />
              </>
            )}

            {/* Glowing border ring */}
            <span
              className={`absolute h-20 w-20 rounded-full ring-4 transition-all duration-300 ${
                voiceStatus === 'listening'
                  ? 'ring-rose-500/50 animate-pulse'
                  : voiceStatus === 'matched'
                  ? 'ring-emerald-500/50'
                  : voiceStatus === 'nomatch'
                  ? 'ring-amber-500/40'
                  : voiceStatus === 'error'
                  ? 'ring-red-500/50'
                  : 'ring-cyan-500/30'
              }`}
            />

            <button
              id="voice-command-mic-btn"
              type="button"
              onClick={voiceStatus === 'listening' ? stopListening : startListening}
              aria-label={currentCfg.badge}
              aria-pressed={voiceStatus === 'listening'}
              className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full shadow-2xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 cursor-pointer active:scale-95 hover:scale-105 ${currentCfg.buttonColor}`}
            >
              <StatusIcon
                className={`h-7 w-7 ${voiceStatus === 'listening' ? 'animate-bounce' : ''}`}
              />
            </button>
          </div>

          {/* Keyboard shortcut hint */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">
              V
            </kbd>
            <span>or click to {voiceStatus === 'listening' ? 'stop' : 'speak'}</span>
          </div>
        </div>

        {/* Right Side Equalizer Waveform */}
        <div className="hidden sm:flex items-center gap-1.5 h-12 px-2">
          {[16, 26, 38, 20, 32, 18, 24, 14].map((h, i) => (
            <span
              key={`right-wave-${i}`}
              style={{
                height:
                  voiceStatus === 'listening'
                    ? `${h}px`
                    : voiceStatus === 'matched'
                    ? '28px'
                    : '6px',
                animation:
                  voiceStatus === 'listening'
                    ? `pulse ${(0.5 + ((i + 2) % 4) * 0.15).toFixed(2)}s ease-in-out infinite alternate`
                    : 'none',
              }}
              className={`w-1 rounded-full transition-all duration-200 ${
                voiceStatus === 'listening'
                  ? 'bg-gradient-to-t from-cyan-500 to-emerald-400'
                  : voiceStatus === 'matched'
                  ? 'bg-emerald-400'
                  : 'bg-slate-700/60'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ─── REAL-TIME LIVE TRANSCRIPTION DISPLAY ─── */}
      <div
        role="status"
        aria-live="polite"
        className="relative z-10 rounded-2xl border border-slate-800 bg-slate-950/75 p-4 text-center shadow-inner"
      >
        {voiceStatus === 'listening' && (
          <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-semibold text-rose-400">Listening to your voice...</span>
            </div>
            <div className="text-base font-semibold text-slate-100 min-h-[28px] flex items-center justify-center">
              {liveTranscript ? (
                <span>
                  &ldquo;{liveTranscript}&rdquo;
                  <span className="inline-block h-4 w-1.5 bg-cyan-400 ml-1 animate-pulse" />
                </span>
              ) : (
                <span className="italic text-slate-500">
                  Say a DBD map name, source, or action command...
                </span>
              )}
            </div>
          </div>
        )}

        {voiceStatus === 'matched' && matchedResult && (
          <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                {matchedResult.action === 'switch_source'
                  ? 'Provider Source Switched'
                  : matchedResult.action && matchedResult.action !== 'navigate'
                  ? 'Navigation Action Executed'
                  : 'Map Match Identified'}
              </span>
            </div>

            <div className="text-base font-extrabold text-white flex items-center gap-2">
              {matchedResult.matchedMapName ? (
                <span className="rounded-xl bg-emerald-500/20 px-3 py-1 text-emerald-300 border border-emerald-500/40">
                  {matchedResult.matchedMapName}
                </span>
              ) : matchedResult.action === 'switch_source' ? (
                <span className="rounded-xl bg-cyan-500/20 px-3 py-1 text-cyan-300 border border-cyan-500/40">
                  Switched to: {matchedResult.actionPayload}
                </span>
              ) : (
                <span className="rounded-xl bg-purple-500/20 px-3 py-1 text-purple-300 border border-purple-500/40">
                  Action: {matchedResult.action}
                </span>
              )}

              {matchedResult.confidence && (
                <span className="text-xs font-normal text-emerald-400/80">
                  ({Math.round(matchedResult.confidence * 100)}% match)
                </span>
              )}
            </div>
          </div>
        )}

        {voiceStatus === 'nomatch' && (
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <span>Could not match voice query &ldquo;{liveTranscript || 'speech'}&rdquo;</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Try saying canonical map names like &ldquo;Dead Dawg&rdquo;, &ldquo;RPD East&rdquo;,
              &ldquo;Coal Tower 2&rdquo;, or &ldquo;Switch to Samoel&rdquo;.
            </p>
          </div>
        )}

        {voiceStatus === 'error' && (
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage || 'Microphone error'}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Please ensure your browser has permission to access your microphone.
            </p>
          </div>
        )}

        {voiceStatus === 'idle' && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-slate-400">
            <Compass className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>
              Speak any map name (e.g. &ldquo;Dead Dawg&rdquo;, &ldquo;RPD East&rdquo;), provider (&ldquo;Switch to Samoel&rdquo;), or action (&ldquo;Zoom In&rdquo;, &ldquo;Fullscreen&rdquo;)
            </span>
          </div>
        )}
      </div>

      {/* ─── DYNAMIC VARIANT DISAMBIGUATION PILLS ─── */}
      {disambiguationVariants.length > 0 && (
        <div className="relative z-10 mt-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-3.5 backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              <span>Map Variants Detected — Click or speak variant:</span>
            </div>
            <button
              type="button"
              onClick={() => setDisambiguationVariants([])}
              className="text-slate-500 hover:text-slate-300"
              title="Dismiss variants"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {disambiguationVariants.map((variant) => (
              <button
                key={variant}
                type="button"
                onClick={() => handleExecuteCommand(variant)}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-900/40 px-3 py-1 text-xs font-medium text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-800/60 hover:text-white active:scale-95"
              >
                <span>{variant}</span>
                <ArrowRight className="h-3 w-3 text-cyan-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── BOTTOM INTERACTIVE BAR: Quick Spoken Command Prompt Chips ─── */}
      <div className="relative z-10 mt-4 flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
          Try Saying:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {QUICK_COMMAND_PROMPTS.map((prompt) => (
            <button
              key={prompt.label}
              type="button"
              onClick={() => handleExecuteCommand(prompt.query)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition active:scale-95 ${
                prompt.type === 'variant'
                  ? 'border-cyan-600/50 bg-cyan-950/40 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/60'
                  : prompt.type === 'source'
                  ? 'border-purple-600/50 bg-purple-950/40 text-purple-300 hover:border-purple-400 hover:bg-purple-900/60'
                  : prompt.type === 'action'
                  ? 'border-emerald-600/50 bg-emerald-950/40 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-900/60'
                  : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500 hover:bg-slate-700/80 hover:text-white'
              }`}
            >
              &ldquo;{prompt.label}&rdquo;
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VoiceCommandBanner;
