'use client';
// frontend/src/components/maps/VoiceCommandBanner.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  AlertCircle,
  CheckCircle2,
  VolumeX,
  RefreshCw,
  Cpu,
  Globe,
  Info,
  ArrowRight,
  Lock,
  X,
} from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import {
  matchVoiceQuery,
  getVariantsForMap,
  MapSource,
  MatchResult,
} from '@/utils/mapVoiceMatcher';
import {
  getBrowserCompatibility,
  AudioCaptureSession,
  initClientSpeechModel,
  transcribeClientAudio,
  subscribeModelProgress,
  getModelQuality,
  setModelQuality,
  resolveModelDescriptor,
  VoiceEngineType,
  ModelQuality,
  ModelProgressInfo,
  BrowserCompatibilityInfo,
} from '@/services/clientSpeechModel';
import dynamic from 'next/dynamic';

const VoiceEngineInfoModal = dynamic(
  () => import('./VoiceEngineInfoModal').then((m) => m.VoiceEngineInfoModal),
  { ssr: false }
);

export interface VoiceCommandBannerProps {
  locale?: string;
  currentSource: 'all' | 'hens333' | 'samoelcolt';
  onSourceChange: (source: 'all' | 'hens333' | 'samoelcolt') => void;
  onSelectMap: (mapName: string, mapId?: string, source?: string) => void;
  onAction?: (action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close') => void;
  availableMaps?: Array<{ id: string; name: string; realm?: string; source?: string }>;
  className?: string;
  dict?: Dictionary | any;
  /** False when the banner is kept mounted but hidden (e.g. behind another
   * mode's UI). Disables the "hold V to talk" hotkey and tears down any
   * in-progress mic session -- both would otherwise keep responding while
   * the banner isn't visible. Defaults to true. */
  active?: boolean;
}

/**
 * BCP-47 tag handed to the Web Speech API, per shipped UI locale.
 *
 * This used to be an inline ternary chain covering pl/es/tr/fr/de. Two of those
 * (tr, fr) are not shipped locales, and `ja` - which is - was missing, so every
 * Japanese user got an en-US recognizer and could not be understood at all.
 * Keeping the table next to i18n.locales makes that class of drift visible.
 */
export const SPEECH_LOCALE_TAGS: Record<string, string> = {
  en: 'en-US',
  pl: 'pl-PL',
  es: 'es-ES',
  de: 'de-DE',
  ja: 'ja-JP',
};

export function resolveSpeechLocaleTag(locale?: string): string {
  return SPEECH_LOCALE_TAGS[locale || 'en'] || SPEECH_LOCALE_TAGS.en;
}

export type VoiceStatusState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'matched'
  | 'nomatch'
  | 'error';

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  /** Index of the first result changed by this event. */
  resultIndex?: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

type WindowWithSpeech = Window &
  typeof globalThis & {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitAudioContext?: typeof AudioContext;
  };

/**
 * Runs every recognizer hypothesis through the matcher and returns the strongest
 * result, scored as `matchConfidence * recognizerConfidence`.
 *
 * A hypothesis the recognizer is unsure about that maps exactly onto a map name
 * should beat a confident hypothesis that only fuzzily resembles one - which is
 * why both factors are multiplied rather than either being used alone.
 */
function pickBestMatch(
  candidates: Array<{ transcript: string; confidence: number }>,
  currentSource: MapSource,
  availableMaps: Array<{ id: string; name: string; realm?: string; source?: string }> | undefined,
  locale: string
): MatchResult | null {
  let best: MatchResult | null = null;
  let bestScore = 0;

  const seen = new Set<string>();
  for (const candidate of candidates) {
    const transcript = candidate.transcript?.trim();
    if (!transcript || seen.has(transcript)) continue;
    seen.add(transcript);

    const match = matchVoiceQuery(transcript, currentSource, availableMaps, { locale });
    if (!match) continue;

    const score = match.confidence * candidate.confidence;
    if (score > bestScore) {
      bestScore = score;
      best = match;
    }
  }

  return best;
}

const BROWSER_HINT_STORAGE_KEY = 'lemondbd:voice:browserHintDismissed';

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const win = window as WindowWithSpeech;
    const AudioCtx = win.AudioContext || win.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioCtx();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => { });
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
    // Audio feedback is non-critical
  }
}

function playMatchSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

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
    // Audio feedback is non-critical
  }
}

const HOLD_KEY_HINT_FALLBACK = 'Hold {key} to talk, or tap the mic and say a map name';

/** Splits a "...{key}..." hint string around the `{key}` placeholder and
 * renders the key as a styled <kbd> chip inline, so it reads as part of
 * the sentence rather than a separate control. */
function renderHoldKeyHint(template: string | undefined, key: string): React.ReactNode {
  const text = template || HOLD_KEY_HINT_FALLBACK;
  const [before, after] = text.split('{key}');
  if (after === undefined) {
    return <span className="truncate">{text}</span>;
  }
  return (
    <>
      {before}
      <kbd className="rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-amber-600 dark:text-amber-400 shadow-xs">
        {key}
      </kbd>
      <span className="truncate">{after}</span>
    </>
  );
}

export function VoiceCommandBanner({
  locale = 'en',
  currentSource,
  onSourceChange,
  onSelectMap,
  onAction,
  availableMaps,
  className = '',
  dict,
  active = true,
}: VoiceCommandBannerProps) {
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatusState>('idle');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [matchedResult, setMatchedResult] = useState<MatchResult | null>(null);
  const [disambiguationVariants, setDisambiguationVariants] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const [browserInfo, setBrowserInfo] = useState<BrowserCompatibilityInfo>(() =>
    getBrowserCompatibility()
  );
  const [activeEngine, setActiveEngine] = useState<VoiceEngineType>('web-speech');
  const [modelProgress, setModelProgress] = useState<ModelProgressInfo>({
    status: 'unloaded',
    progress: 0,
  });
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [modelQuality, setModelQualityState] = useState<ModelQuality>(() => getModelQuality());

  /**
   * One-line, dismissible note that the native Web Speech engine recognises map
   * names noticeably better than the local model.
   *
   * Deliberately informational and opt-out: nothing is blocked, the local model
   * stays selected, and once dismissed it does not come back. Shown only when
   * this browser cannot use the native engine at all - telling a Chrome user to
   * install Chrome would be noise.
   */
  const [browserHintDismissed, setBrowserHintDismissed] = useState<boolean>(true);

  useEffect(() => {
    try {
      setBrowserHintDismissed(
        window.localStorage?.getItem(BROWSER_HINT_STORAGE_KEY) === 'dismissed'
      );
    } catch {
      // Storage blocked (private mode, site data off): show the hint, do not persist.
      setBrowserHintDismissed(false);
    }
  }, []);

  const dismissBrowserHint = useCallback(() => {
    setBrowserHintDismissed(true);
    try {
      window.localStorage?.setItem(BROWSER_HINT_STORAGE_KEY, 'dismissed');
    } catch {
      // Non-fatal: the hint simply reappears next session.
    }
  }, []);

  const showBrowserHint =
    !browserHintDismissed && !browserInfo.hasNativeWebSpeech && activeEngine === 'client-model';

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioSessionRef = useRef<AudioCaptureSession | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const liveTranscriptRef = useRef<string>('');
  const pendingMatchRef = useRef<MatchResult | null>(null);
  const isHoldingRef = useRef<boolean>(false);
  const holdStartTimeRef = useRef<number>(0);
  // Read by callbacks that must not re-create themselves when the locale changes.
  const localeRef = useRef<string>(locale);
  const mouseDownListeningStateRef = useRef<boolean>(false);

  const propsRef = useRef({
    currentSource,
    onSourceChange,
    onSelectMap,
    onAction,
    availableMaps,
    soundEnabled,
  });

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

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

  useEffect(() => {
    const compat = getBrowserCompatibility();
    setBrowserInfo(compat);
    setActiveEngine(compat.recommendedEngine);

    const unsubscribe = subscribeModelProgress((info) => {
      setModelProgress(info);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Split out from the compat-detection effect above so a banner that's
  // mounted-but-hidden (see the `active` prop doc) doesn't eagerly download
  // the client speech model before the user has actually switched to voice
  // mode -- it only loads once `active` first turns true.
  useEffect(() => {
    if (active && activeEngine === 'client-model') {
      initClientSpeechModel(locale);
    }
  }, [active, activeEngine, locale, modelQuality]);

  /**
   * Switching accuracy mode drops the cached pipeline in the service, so the new
   * checkpoint has to be fetched. It is started eagerly here rather than lazily on
   * the next utterance so the user sees the download progress bar they just opted
   * into instead of a stall the first time they hold the mic.
   */
  const handleSelectModelQuality = useCallback(
    (quality: ModelQuality) => {
      if (!setModelQuality(quality)) return;
      setModelQualityState(quality);
      if (activeEngine === 'client-model') {
        initClientSpeechModel(localeRef.current);
      }
    },
    [activeEngine]
  );

  const cleanupListening = useCallback(() => {
    isHoldingRef.current = false;
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch { }
    }
    if (audioSessionRef.current) {
      try {
        audioSessionRef.current.stop();
      } catch { }
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
  }, []);

  useEffect(() => cleanupListening, [cleanupListening]);

  // Kept-mounted-but-hidden banners (see the `active` prop doc) must not
  // keep listening once they're no longer the visible mode.
  useEffect(() => {
    if (!active) {
      cleanupListening();
      setVoiceStatus('idle');
    }
  }, [active, cleanupListening]);

  const executeMatch = useCallback((result: MatchResult) => {
    setMatchedResult(result);
    pendingMatchRef.current = null;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    const {
      onSourceChange: triggerSourceChange,
      onAction: triggerAction,
      onSelectMap: triggerSelectMap,
      soundEnabled: isSoundOn,
    } = propsRef.current;

    if (result.action === 'switch_source' && result.actionPayload) {
      setVoiceStatus('matched');
      if (isSoundOn) playMatchSuccessSound();
      triggerSourceChange(result.actionPayload as MapSource);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setVoiceStatus('idle');
      }, 2200);
      return;
    }

    if (result.action && ['zoom_in', 'zoom_out', 'fullscreen', 'close'].includes(result.action)) {
      setVoiceStatus('matched');
      if (isSoundOn) playMatchSuccessSound();
      if (triggerAction) {
        triggerAction(result.action as 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close');
      }
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setVoiceStatus('idle');
      }, 2200);
      return;
    }

    if (result.matchedMapName) {
      setVoiceStatus('matched');
      if (isSoundOn) playMatchSuccessSound();
      triggerSelectMap(result.matchedMapName, result.matchedMapId, result.source);

      // getVariantsForMap keys off the English canonical name. matchedMapName is
      // the localized display name outside /en, so passing that here silently
      // returned no variants and the disambiguation pills never appeared.
      const variants =
        result.availableVariants ||
        getVariantsForMap(result.canonicalName || result.matchedMapName);
      if (variants && variants.length > 1) {
        setDisambiguationVariants(variants);
      } else {
        setDisambiguationVariants([]);
      }

      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setVoiceStatus('idle');
      }, 2400);
      return;
    }

    setVoiceStatus('nomatch');
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setVoiceStatus('idle');
    }, 2200);
  }, []);

  const handleExecuteCommand = useCallback(
    (queryText: string) => {
      liveTranscriptRef.current = queryText;
      setLiveTranscript(queryText);

      const result = matchVoiceQuery(
        queryText,
        propsRef.current.currentSource,
        propsRef.current.availableMaps,
        { locale: localeRef.current }
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

  const stopListeningAndProcess = useCallback(async () => {
    isListeningRef.current = false;
    isHoldingRef.current = false;
    setAudioLevel(0);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    if (activeEngine === 'client-model') {
      if (audioSessionRef.current) {
        setVoiceStatus('processing');
        const audioBuffer = audioSessionRef.current.stop();
        audioSessionRef.current = null;

        if (audioBuffer && audioBuffer.length > 1600) {
          try {
            const transcript = await transcribeClientAudio(audioBuffer, locale);
            const cleanText = (transcript || '').trim();
            liveTranscriptRef.current = cleanText;
            setLiveTranscript(cleanText);

            if (cleanText) {
              const match = matchVoiceQuery(
                cleanText,
                propsRef.current.currentSource,
                propsRef.current.availableMaps,
                { locale }
              );
              if (match) {
                executeMatch(match);
                return;
              }
            }
          } catch (err: unknown) {
            console.error('[VoiceNav] Client-side transcription error:', err);
          }
        }

        setVoiceStatus('nomatch');
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          setVoiceStatus('idle');
        }, 2200);
      }
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e: unknown) {
        console.warn('[VoiceNav] Error stopping recognition in stopListeningAndProcess:', e);
      }
    }

    const currentText = liveTranscriptRef.current.trim();
    if (currentText) {
      const match =
        pendingMatchRef.current ||
        matchVoiceQuery(
          currentText,
          propsRef.current.currentSource,
          propsRef.current.availableMaps,
          { locale }
        );

      if (match) {
        executeMatch(match);
        return;
      } else {
        setVoiceStatus('nomatch');
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          setVoiceStatus('idle');
        }, 2200);
        return;
      }
    }

    setVoiceStatus('idle');
  }, [activeEngine, locale, executeMatch]);

  const startListening = useCallback(
    async (isHold = false) => {
      if (isListeningRef.current) {
        return;
      }

      if (typeof window === 'undefined') return;

      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      pendingMatchRef.current = null;
      isHoldingRef.current = isHold;
      if (isHold) {
        holdStartTimeRef.current = Date.now();
      }

      if (activeEngine === 'client-model') {
        try {
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

          let speechDetected = false;
          audioSessionRef.current = new AudioCaptureSession();
          audioSessionRef.current.setLevelCallback((lvl) => {
            setAudioLevel(lvl);
            if (!isHoldingRef.current && isListeningRef.current) {
              if (lvl > 15) {
                speechDetected = true;
                if (silenceTimerRef.current) {
                  clearTimeout(silenceTimerRef.current);
                  silenceTimerRef.current = null;
                }
              } else if (speechDetected && lvl < 8) {
                if (!silenceTimerRef.current) {
                  silenceTimerRef.current = setTimeout(() => {
                    if (isListeningRef.current) {
                      stopListeningAndProcess();
                    }
                  }, 1200);
                }
              }
            }
          });
          await audioSessionRef.current.start();
        } catch (err: unknown) {
          isListeningRef.current = false;
          isHoldingRef.current = false;
          setVoiceStatus('error');
          const isPermissionErr =
            err instanceof DOMException && err.name === 'NotAllowedError';
          setErrorMessage(
            isPermissionErr
              ? dict?.voice?.micBlocked || ''
              : dict?.voice?.micAccessError || ''
          );
        }
        return;
      }

      const win = window as WindowWithSpeech;
      const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (!SpeechRec) {
        setActiveEngine('client-model');
        initClientSpeechModel(locale);
        return;
      }

      isListeningRef.current = true;

      try {
        const recognition = new SpeechRec();
        recognitionRef.current = recognition;

        recognition.lang = resolveSpeechLocaleTag(locale);
        recognition.interimResults = true;
        recognition.maxAlternatives = 5;
        recognition.continuous = true;

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

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interimText = '';
          let finalText = '';

          // maxAlternatives is 5, but only final results carry more than one
          // hypothesis. Collecting them with their recognizer confidence lets the
          // matcher pick the best *combined* candidate instead of the previous
          // behaviour: take whichever alternative happened to match first, in
          // arbitrary order, and only when the top hypothesis matched nothing.
          const alternatives: Array<{ transcript: string; confidence: number }> = [];

          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              finalText += res[0].transcript + ' ';
              for (let j = 0; j < res.length; j++) {
                const alt = res[j];
                if (!alt?.transcript) continue;
                alternatives.push({
                  transcript: alt.transcript,
                  // Chrome reports confidence only on final results and sometimes
                  // reports 0; fall back to a rank-derived prior so a missing
                  // score never outranks a real one.
                  confidence: typeof alt.confidence === 'number' && alt.confidence > 0
                    ? alt.confidence
                    : Math.max(0.1, 0.9 - j * 0.15),
                });
              }
            } else {
              interimText += res[0].transcript + ' ';
            }
          }

          const combinedTranscript = (finalText + interimText).trim();
          liveTranscriptRef.current = combinedTranscript;
          setLiveTranscript(combinedTranscript);

          const bestMatch = pickBestMatch(
            [{ transcript: combinedTranscript, confidence: 1 }, ...alternatives],
            propsRef.current.currentSource,
            propsRef.current.availableMaps,
            locale
          );

          pendingMatchRef.current = bestMatch;
          setMatchedResult(bestMatch);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          isListeningRef.current = false;
          isHoldingRef.current = false;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

          if (event.error === 'network' || event.error === 'service-not-allowed') {
            setActiveEngine('client-model');
            initClientSpeechModel(locale);
            setVoiceStatus('nomatch');
            setErrorMessage(dict?.voice?.switchedToLocalEngine || '');
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
            resetTimerRef.current = setTimeout(() => {
              setVoiceStatus('idle');
            }, 3000);
          } else if (event.error === 'not-allowed') {
            setVoiceStatus('error');
            setErrorMessage(
              dict?.voice?.micBlocked || ''
            );
          } else if (event.error === 'no-speech') {
            setVoiceStatus('nomatch');
            resetTimerRef.current = setTimeout(() => {
              setVoiceStatus('idle');
            }, 2400);
          } else {
            setVoiceStatus('error');
            setErrorMessage(
              dict?.voice?.speechRecognitionErrorPrefix
                ? `${dict.voice.speechRecognitionErrorPrefix} ${event.error || ''}`
                : event.error || ''
            );
          }
        };

        recognition.onend = () => {
          if (isHoldingRef.current) {
            try {
              recognition.start();
              return;
            } catch (e: unknown) {
              console.warn('[VoiceNav] Auto-restart failed:', e);
              isHoldingRef.current = false;
              isListeningRef.current = false;
            }
          }

          isListeningRef.current = false;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

          const currentText = liveTranscriptRef.current.trim();
          if (currentText) {
            const matchToExecute =
              pendingMatchRef.current ||
              matchVoiceQuery(
                currentText,
                propsRef.current.currentSource,
                propsRef.current.availableMaps,
                { locale }
              );

            if (matchToExecute) {
              executeMatch(matchToExecute);
              return;
            }
          }

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
        };

        recognition.start();
      } catch (err: unknown) {
        isListeningRef.current = false;
        isHoldingRef.current = false;
        setVoiceStatus('error');
        const message = err instanceof Error ? err.message : dict?.voice?.failedToInitialize || '';
        setErrorMessage(message);
      }
    },
    [activeEngine, locale, executeMatch, stopListeningAndProcess, dict]
  );

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'textbox');

      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'v' || e.key === 'V')) {
        if (e.repeat) return;
        e.preventDefault();
        if (!isListeningRef.current) {
          isHoldingRef.current = true;
          holdStartTimeRef.current = Date.now();
          startListening(true);
        } else {
          stopListeningAndProcess();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'textbox');

      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        isHoldingRef.current = false;
        if (isListeningRef.current) {
          stopListeningAndProcess();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [active, startListening, stopListeningAndProcess]);

  const rawVoiceDict = (dict?.voice || {}) as Record<string, string>;

  const statusConfig = {
    idle: {
      badge: rawVoiceDict.idleReady || '',
      badgeClass:
        'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300',
      dotClass: 'bg-emerald-500 dark:bg-emerald-400',
      icon: Mic,
      buttonColor:
        'bg-gradient-to-br from-[#2f6f7d] to-[#16394a] text-white shadow-slate-900/40 ring-slate-500/30 hover:brightness-110',
    },
    listening: {
      badge: rawVoiceDict.listeningSpeakNow || '',
      badgeClass:
        'bg-rose-500/20 border-rose-500/50 text-rose-700 dark:text-rose-300 animate-pulse',
      dotClass: 'bg-rose-500 animate-ping',
      icon: Volume2,
      buttonColor:
        'bg-gradient-to-br from-rose-500 via-red-600 to-rose-800 text-white shadow-red-900/50 ring-red-500/60 hover:from-rose-400 hover:to-red-700',
    },
    processing: {
      badge: rawVoiceDict.processingAudio || '',
      badgeClass:
        'bg-amber-500/20 border-amber-500/50 text-amber-800 dark:text-amber-300',
      dotClass: 'bg-amber-500 animate-pulse',
      icon: RefreshCw,
      buttonColor:
        'bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800 text-white shadow-amber-900/40 ring-amber-500/40',
    },
    matched: {
      badge: rawVoiceDict.matchedExecuting || '',
      badgeClass:
        'bg-emerald-500/20 border-emerald-500/50 text-emerald-800 dark:text-emerald-300',
      dotClass: 'bg-emerald-500',
      icon: CheckCircle2,
      buttonColor:
        'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 text-white shadow-emerald-900/40 ring-emerald-500/50',
    },
    nomatch: {
      badge: rawVoiceDict.noMatchTryAgain || '',
      badgeClass:
        'bg-amber-500/20 border-amber-500/40 text-amber-800 dark:text-amber-300',
      dotClass: 'bg-amber-500',
      icon: MicOff,
      buttonColor:
        'bg-gradient-to-br from-amber-600 via-stone-700 to-slate-800 text-white shadow-amber-900/30 ring-amber-500/30',
    },
    error: {
      badge: rawVoiceDict.micErrorCheckPermission || '',
      badgeClass:
        'bg-red-500/20 border-red-500/50 text-red-800 dark:text-red-300',
      dotClass: 'bg-red-500',
      icon: AlertCircle,
      buttonColor:
        'bg-gradient-to-br from-red-700 via-red-800 to-slate-900 text-white shadow-red-900/30 ring-red-500/40',
    },
  };

  const currentCfg = statusConfig[voiceStatus];
  const StatusIcon = currentCfg.icon;

  const matchPercentText = matchedResult?.confidence
    ? rawVoiceDict.matchPercent
      ? rawVoiceDict.matchPercent.replace('{percent}', String(Math.round(matchedResult.confidence * 100)))
      : `(${Math.round(matchedResult.confidence * 100)}%)`
    : '';

  return (
    <section
      aria-label={dict?.maps?.voiceEngineAria || ''}
      className={`relative flex w-full flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 px-3 sm:px-4 pt-3 sm:pt-4 backdrop-blur-xl shadow-xl dark:shadow-2xl shadow-slate-950/10 dark:shadow-slate-950/40 transition-all duration-300 ${className}`}
    >
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-black tracking-wide font-mono transition-all ${currentCfg.badgeClass}`}
          >
            <span className={`h-2 w-2 rounded-full ${currentCfg.dotClass}`} aria-hidden="true" />
            <span>{currentCfg.badge}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsInfoModalOpen(true)}
            title={
              activeEngine === 'web-speech'
                ? dict?.voice?.webSpeechTooltip || ''
                : dict?.voice?.clientModelTooltip || ''
            }
            aria-label={dict?.voice?.viewEngineInfo || ''}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold font-mono transition-all cursor-pointer shadow-sm hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeEngine === 'web-speech'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
              }`}
          >
            {activeEngine === 'web-speech' ? (
              <Globe className="h-3 w-3 text-amber-500" aria-hidden="true" />
            ) : (
              <Cpu className="h-3 w-3 text-emerald-500" aria-hidden="true" />
            )}
            <span>
              {activeEngine === 'web-speech'
                ? rawVoiceDict.engineNativeBadge || ''
                : rawVoiceDict.engineClientBadge || ''}
            </span>
            <Info className="h-3 w-3 opacity-70 hover:opacity-100" aria-hidden="true" />
          </button>

          {modelProgress.status === 'downloading' && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 animate-pulse font-mono">
              <RefreshCw className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
              <span>{modelProgress.progress}{dict?.maps?.percentSign || '%'}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? dict?.voice?.muteSound || '' : dict?.voice?.enableSound || ''}
            aria-label={soundEnabled ? dict?.voice?.muteSound || '' : dict?.voice?.enableSound || ''}
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 transition hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
          >
            {soundEnabled ? (
              <Volume2 className="h-3 w-3" aria-hidden="true" />
            ) : (
              <VolumeX className="h-3 w-3 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Sits between the status chips and the provider switcher and takes the
            slack in the middle of the header, so it reads as a caption on the
            engine badge it is about rather than as a banner of its own. It is
            the only flex-1 child here, which is what centres it between the two
            fixed-width groups. */}
        {showBrowserHint && (
          <div className="order-last flex w-full min-w-0 flex-1 items-center justify-center gap-1.5 text-center sm:order-none sm:w-auto">
            <Info className="h-3.5 w-3.5 shrink-0 text-cyan-500" aria-hidden="true" />
            <p className="min-w-0 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              {rawVoiceDict.recommendedBrowserHint || ''}{' '}
              <button
                type="button"
                onClick={() => setIsInfoModalOpen(true)}
                className="cursor-pointer font-bold text-cyan-700 underline decoration-dotted underline-offset-2 transition-colors hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300 rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
              >
                {rawVoiceDict.recommendedBrowserHintLink || ''}
              </button>
            </p>
            <button
              type="button"
              onClick={dismissBrowserHint}
              aria-label={rawVoiceDict.dismissHint || ''}
              title={rawVoiceDict.dismissHint || ''}
              className="shrink-0 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label={dict?.maps?.providerAria || ''}
            className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-950/80 p-0.5"
          >
            <span className="px-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              {dict?.maps?.sourceLabel || ''}
            </span>
            <button
              type="button"
              onClick={() => onSourceChange('hens333')}
              aria-pressed={currentSource === 'hens333'}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-extrabold transition-all cursor-pointer font-mono ${currentSource === 'hens333'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm font-black'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
            >
              {dict?.maps?.sourceHensClock || ''}
            </button>

            <button
              type="button"
              disabled
              title={dict?.maps?.lemonDbdSourceLocked || ''}
              aria-disabled="true"
              className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-extrabold font-mono text-slate-400 dark:text-slate-600 cursor-not-allowed"
            >
              <Lock className="h-2.5 w-2.5" aria-hidden="true" />
              {dict?.maps?.sourceLemonDbd || ''}
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 py-3 sm:py-4">
        <div className="flex w-full items-center justify-center gap-3 sm:gap-5">
          <div className="hidden sm:flex items-center gap-1 h-9 px-1" aria-hidden="true">
            {[12, 22, 16, 28, 18, 32, 24, 14].map((h, i) => {
              const dynamicHeight =
                voiceStatus === 'listening'
                  ? Math.max(8, Math.min(36, Math.round(h * (0.6 + (audioLevel / 100) * 1.2))))
                  : voiceStatus === 'matched'
                    ? 24
                    : h;
              return (
                <span
                  key={`left-wave-${i}`}
                  style={{
                    height: `${dynamicHeight}px`,
                    animation:
                      voiceStatus === 'listening'
                        ? `pulse ${(0.4 + (i % 4) * 0.12).toFixed(2)}s ease-in-out infinite alternate`
                        : 'none',
                  }}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    voiceStatus === 'matched' ? 'bg-emerald-400' : 'bg-gradient-to-t from-amber-500 to-emerald-400'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-center">
           <div className="relative inline-flex items-center justify-center">
            {voiceStatus === 'listening' && (
              <>
                <span className="absolute h-16 w-16 animate-ping rounded-full bg-rose-500/20 pointer-events-none" aria-hidden="true" />
                <span className="absolute h-20 w-20 animate-ping rounded-full bg-rose-500/10 [animation-delay:200ms] pointer-events-none" aria-hidden="true" />
              </>
            )}

            <button
              id="voice-command-mic-btn"
              type="button"
              onMouseDown={() => {
                mouseDownListeningStateRef.current =
                  isListeningRef.current || voiceStatus === 'listening';
                isHoldingRef.current = true;
                holdStartTimeRef.current = Date.now();
                if (!isListeningRef.current) {
                  startListening(true);
                }
              }}
              onMouseUp={() => {
                const duration =
                  holdStartTimeRef.current > 0 ? Date.now() - holdStartTimeRef.current : 0;
                isHoldingRef.current = false;
                if (duration > 250 && isListeningRef.current) {
                  stopListeningAndProcess();
                }
              }}
              onMouseLeave={() => {
                if (isHoldingRef.current) {
                  const duration =
                    holdStartTimeRef.current > 0 ? Date.now() - holdStartTimeRef.current : 0;
                  isHoldingRef.current = false;
                  if (duration > 250 && isListeningRef.current) {
                    stopListeningAndProcess();
                  }
                }
              }}
              onClick={() => {
                const isClickFromMouse = holdStartTimeRef.current > 0;
                const duration = isClickFromMouse ? Date.now() - holdStartTimeRef.current : 0;
                holdStartTimeRef.current = 0;

                if (duration > 250) return;

                if (isListeningRef.current || voiceStatus === 'listening') {
                  if (!isClickFromMouse || mouseDownListeningStateRef.current) {
                    stopListeningAndProcess();
                  }
                } else {
                  startListening(false);
                }
              }}
              aria-label={currentCfg.badge || ''}
              aria-pressed={voiceStatus === 'listening'}
              className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl shadow-xl transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/50 cursor-pointer active:scale-95 hover:scale-105 select-none ${currentCfg.buttonColor}`}
            >
              <StatusIcon
                className={`h-5 w-5 ${voiceStatus === 'listening' ? 'animate-bounce' : ''}`}
                aria-hidden="true"
              />
            </button>

           </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 h-9 px-1" aria-hidden="true">
            {[14, 24, 32, 18, 28, 16, 22, 12].map((h, i) => {
              const dynamicHeight =
                voiceStatus === 'listening'
                  ? Math.max(8, Math.min(36, Math.round(h * (0.6 + (audioLevel / 100) * 1.2))))
                  : voiceStatus === 'matched'
                    ? 24
                    : h;
              return (
                <span
                  key={`right-wave-${i}`}
                  style={{
                    height: `${dynamicHeight}px`,
                    animation:
                      voiceStatus === 'listening'
                        ? `pulse ${(0.4 + ((i + 2) % 4) * 0.12).toFixed(2)}s ease-in-out infinite alternate`
                        : 'none',
                  }}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    voiceStatus === 'matched' ? 'bg-emerald-400' : 'bg-gradient-to-t from-amber-500 to-emerald-400'
                  }`}
                />
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-center max-w-[340px]" aria-live="polite">
            {voiceStatus === 'listening' && (
              <div className="flex flex-col text-center items-center">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping shrink-0" aria-hidden="true" />
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 font-mono truncate">
                    {liveTranscript
                      ? `“${liveTranscript}”`
                      : audioLevel > 8
                        ? rawVoiceDict.listeningVoice || ''
                        : rawVoiceDict.speakMapPrompt || ''}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono truncate">
                  {activeEngine === 'client-model'
                    ? rawVoiceDict.localModelListeningDesc || ''
                    : rawVoiceDict.webSpeechListeningDesc || ''}
                </span>
              </div>
            )}

            {voiceStatus === 'processing' && (
              <div className="flex flex-col text-center items-center">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 text-amber-500 animate-spin shrink-0" aria-hidden="true" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 font-mono">
                    {liveTranscript
                      ? `${rawVoiceDict.transcribingPrefix || ''} “${liveTranscript}”`
                      : rawVoiceDict.transcribingVoice || ''}
                  </span>
                </div>
                <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-mono">
                  {rawVoiceDict.localWasmInference || ''}
                </span>
              </div>
            )}

            {voiceStatus === 'matched' && matchedResult && (
              <div className="flex flex-col text-center items-center">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 font-mono truncate">
                    {matchedResult.matchedMapName
                      ? `${rawVoiceDict.matchedPrefix || ''} ${matchedResult.matchedMapName}`
                      : matchedResult.action === 'switch_source'
                        ? `${rawVoiceDict.switchedPrefix || ''} ${matchedResult.actionPayload}`
                        : `${rawVoiceDict.actionPrefix || ''} ${matchedResult.action}`}
                  </span>
                </div>
                {liveTranscript && (
                  <span className="text-[10px] text-emerald-600/90 dark:text-emerald-400/90 font-mono truncate">
                    {dict?.maps?.heardLabel || ''} {dict?.maps?.openQuote || '“'}{liveTranscript}{dict?.maps?.closeQuote || '”'} {matchPercentText}
                  </span>
                )}
              </div>
            )}

            {voiceStatus === 'nomatch' && (
              <div className="flex flex-col text-center items-center">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 font-mono">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {liveTranscript
                      ? `${dict?.maps?.heardLabel || ''} “${liveTranscript}” (${rawVoiceDict.noDbdMatch || ''})`
                      : rawVoiceDict.noSpeechDetected || ''}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono truncate">
                  {rawVoiceDict.trySayingPrompt || ''}
                </span>
              </div>
            )}

            {voiceStatus === 'error' && (
              <div className="flex flex-col text-center items-center">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 font-mono">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{errorMessage || rawVoiceDict.micBlocked || ''}</span>
                </div>
                <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 font-mono">
                  {rawVoiceDict.checkPermissionsHint || ''}
                </span>
              </div>
            )}

            {voiceStatus === 'idle' && (
              <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                {renderHoldKeyHint(rawVoiceDict.holdVToTalkHint, dict?.maps?.keyV || 'V')}
              </p>
            )}
        </div>
      </div>

      {disambiguationVariants.length > 0 && (
        <div className="relative z-10 mt-2.5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 dark:bg-cyan-950/30 p-2.5 backdrop-blur-sm flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-cyan-800 dark:text-cyan-300 font-mono">
            <span>{dict?.maps?.variants || ''}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {disambiguationVariants.map((variant) => (
              <button
                key={variant}
                type="button"
                onClick={() => handleExecuteCommand(variant)}
                className="flex items-center gap-1 rounded-xl border border-cyan-400/40 bg-white/80 dark:bg-cyan-900/40 px-2.5 py-0.5 text-xs font-bold text-cyan-900 dark:text-cyan-200 transition hover:border-cyan-500 hover:bg-cyan-100 dark:hover:bg-cyan-800/60 active:scale-95 cursor-pointer shadow-xs font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
              >
                <span>{variant}</span>
                <ArrowRight className="h-3 w-3 text-cyan-500 dark:text-cyan-400" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}

      <VoiceEngineInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        currentEngine={activeEngine}
        onSelectEngine={(eng) => {
          setActiveEngine(eng);
          if (eng === 'client-model') {
            initClientSpeechModel(locale);
          }
        }}
        browserName={browserInfo.browserName}
        hasNativeWebSpeech={browserInfo.hasNativeWebSpeech}
        modelProgress={modelProgress}
        onPreloadModel={() => initClientSpeechModel(locale)}
        modelQuality={modelQuality}
        onSelectModelQuality={handleSelectModelQuality}
        modelDescriptor={resolveModelDescriptor(locale, modelQuality)}
        speechLocaleTag={resolveSpeechLocaleTag(locale)}
        dict={dict}
      />
    </section>
  );
}

export default VoiceCommandBanner;