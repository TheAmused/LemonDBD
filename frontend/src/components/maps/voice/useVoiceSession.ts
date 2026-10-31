'use client';
// frontend/src/components/maps/voice/useVoiceSession.ts
import { logger } from '@/utils/logger';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createDeduper, trackEvent } from '@/utils/analytics';
import {
  getBrowserCompatibility,
  getModelQuality,
  initClientSpeechModel,
  subscribeModelProgress,
  transcribeClientAudio,
  type AudioCaptureSession,
  type BrowserCompatibilityInfo,
  type ModelProgressInfo,
  type ModelQuality,
  type VoiceEngineType,
} from '@/services/clientSpeechModel';
import { getVariantsForMap, matchVoiceQuery, type MatchResult } from '@/utils/mapVoiceMatcher';
import { playMatchSuccessSound, type SpeechRecognitionInstance } from '@/components/maps/VoiceCommandBannerParts';
import { useStartListening } from './useStartListening';
import type { VoiceCommandBannerProps, VoiceStatusState } from './voiceTypes';
import { useIsClient } from '@/hooks/useIsClient';
import { useOnValueChange } from '@/hooks/useOnValueChange';

type VoiceSessionOptions = Pick<
  VoiceCommandBannerProps,
  'locale' | 'onSelectMap' | 'onAction' | 'availableMaps' | 'active'
>;

/** Owns the voice banner's state: engine choice, listening lifecycle, match execution and hotkeys. */
export function useVoiceSession({
  locale = 'en',
  onSelectMap,
  onAction,
  availableMaps,
  active = true,
}: VoiceSessionOptions) {
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
  const [modelQuality, setModelQualityState] = useState<ModelQuality>(() => getModelQuality());
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioSessionRef = useRef<AudioCaptureSession | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const liveTranscriptRef = useRef<string>('');
  const pendingMatchRef = useRef<MatchResult | null>(null);
  const isHoldingRef = useRef<boolean>(false);
  const holdStartTimeRef = useRef<number>(0);
  const mouseDownListeningStateRef = useRef<boolean>(false);

  const propsRef = useRef({
    onSelectMap,
    onAction,
    availableMaps,
    soundEnabled,
  });

  useEffect(() => {
    propsRef.current = {
      onSelectMap,
      onAction,
      availableMaps,
      soundEnabled,
    };
  }, [onSelectMap, onAction, availableMaps, soundEnabled]);

  // Browser support is checked again once running in the browser (the server can't know it),
  // while rendering, and picks the engine that browser does best.
  const isClient = useIsClient();
  const [compatChecked, setCompatChecked] = useState(false);
  if (isClient && !compatChecked) {
    setCompatChecked(true);
    const compat = getBrowserCompatibility();
    setBrowserInfo(compat);
    setActiveEngine(compat.recommendedEngine);
  }

  useEffect(() => {
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
      void initClientSpeechModel(locale);
    }
  }, [active, activeEngine, locale]);


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
  useOnValueChange(active, (isActive) => {
    if (!isActive) setVoiceStatus('idle');
  });
  useEffect(() => {
    if (!active) cleanupListening();
  }, [active, cleanupListening]);

  const engineRef = useRef<VoiceEngineType>(activeEngine);
  useLayoutEffect(() => {
    engineRef.current = activeEngine;
  });
  // recognition.onend can run again after stopListeningAndProcess already reported the same
  // command, so one command is reported at most once per 1.5 s.
  const outcomeDedupeRef = useRef(createDeduper(1500));
  // A variant pill click replays a command that was already reported; it is not a new one.
  const outcomeMutedRef = useRef(false);
  const reportVoiceOutcome = useCallback((result: 'matched' | 'nomatch') => {
    if (outcomeMutedRef.current) return;
    if (!outcomeDedupeRef.current()) return;
    trackEvent('map_voice_command', { result, engine: engineRef.current });
  }, []);

  const executeMatch = useCallback((result: MatchResult) => {
    setMatchedResult(result);
    pendingMatchRef.current = null;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    const {
      onAction: triggerAction,
      onSelectMap: triggerSelectMap,
      soundEnabled: isSoundOn,
    } = propsRef.current;

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
      reportVoiceOutcome('matched');
      setVoiceStatus('matched');
      if (isSoundOn) playMatchSuccessSound();
      triggerSelectMap(result.matchedMapName, result.matchedMapId);

      const variants =
        result.availableVariants ||
        getVariantsForMap(result.matchedMapName);
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

    reportVoiceOutcome('nomatch');
    setVoiceStatus('nomatch');
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setVoiceStatus('idle');
    }, 2200);
  }, [reportVoiceOutcome]);

  const handleExecuteCommand = useCallback(
    (queryText: string) => {
      liveTranscriptRef.current = queryText;
      setLiveTranscript(queryText);

      const result = matchVoiceQuery(
        queryText,
        propsRef.current.availableMaps
      );

      outcomeMutedRef.current = true;
      try {
        if (result) {
          executeMatch(result);
        } else {
          reportVoiceOutcome('nomatch');
          setVoiceStatus('nomatch');
          resetTimerRef.current = setTimeout(() => {
            setVoiceStatus('idle');
          }, 2000);
        }
      } finally {
        outcomeMutedRef.current = false;
      }
    },
    [executeMatch, reportVoiceOutcome]
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
                propsRef.current.availableMaps
              );
              if (match) {
                executeMatch(match);
                return;
              }
            }
          } catch (err: unknown) {
            logger.error('[VoiceNav] Client-side transcription error:', err);
          }
        }

        reportVoiceOutcome('nomatch');
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
        logger.warn('[VoiceNav] Error stopping recognition in stopListeningAndProcess:', e);
      }
    }

    const currentText = liveTranscriptRef.current.trim();
    if (currentText) {
      const match =
        pendingMatchRef.current ||
        matchVoiceQuery(
          currentText,
          propsRef.current.availableMaps
        );

      if (match) {
        liveTranscriptRef.current = '';
        executeMatch(match);
        return;
      } else {
        reportVoiceOutcome('nomatch');
        setVoiceStatus('nomatch');
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          setVoiceStatus('idle');
        }, 2200);
        return;
      }
    }

    setVoiceStatus('idle');
  }, [activeEngine, locale, executeMatch, reportVoiceOutcome]);


  const startListening = useStartListening({
    activeEngine, locale, executeMatch, stopListeningAndProcess, reportVoiceOutcome,
    recognitionRef, audioSessionRef, resetTimerRef, silenceTimerRef, isListeningRef,
    liveTranscriptRef, pendingMatchRef, isHoldingRef, holdStartTimeRef, propsRef,
    setVoiceStatus, setLiveTranscript, setMatchedResult, setErrorMessage, setAudioLevel, setActiveEngine,
  });

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
          void startListening(true);
        } else {
          void stopListeningAndProcess();
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
          void stopListeningAndProcess();
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

  return {
    voiceStatus, liveTranscript, matchedResult, disambiguationVariants, errorMessage,
    soundEnabled, setSoundEnabled, audioLevel,
    browserInfo, activeEngine, setActiveEngine, modelProgress, modelQuality, setModelQualityState,
    isInfoModalOpen, setIsInfoModalOpen,
    isListeningRef, isHoldingRef, holdStartTimeRef, mouseDownListeningStateRef,
    startListening, stopListeningAndProcess, handleExecuteCommand,
  };
}
