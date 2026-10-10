// frontend/src/components/maps/voice/useVoiceSession.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioCaptureSession,
  getBrowserCompatibility,
  getModelQuality,
  initClientSpeechModel,
  subscribeModelProgress,
  transcribeClientAudio,
  type BrowserCompatibilityInfo,
  type ModelProgressInfo,
  type ModelQuality,
  type VoiceEngineType,
} from '@/services/clientSpeechModel';
import { getVariantsForMap, matchVoiceQuery, type MapSource, type MatchResult } from '@/utils/mapVoiceMatcher';
import { playMatchSuccessSound, type SpeechRecognitionInstance } from '@/components/maps/VoiceCommandBannerParts';
import { useStartListening } from './useStartListening';
import type { VoiceCommandBannerProps, VoiceStatusState } from './voiceTypes';

type VoiceSessionOptions = Pick<
  VoiceCommandBannerProps,
  'locale' | 'currentSource' | 'onSourceChange' | 'onSelectMap' | 'onAction' | 'availableMaps' | 'active'
>;

/** Owns the voice banner's state: engine choice, listening lifecycle, match execution and hotkeys. */
export function useVoiceSession({
  locale = 'en',
  currentSource,
  onSourceChange,
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
                propsRef.current.availableMaps
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
          propsRef.current.availableMaps
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


  const startListening = useStartListening({
    activeEngine, locale, executeMatch, stopListeningAndProcess,
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

  return {
    voiceStatus, liveTranscript, matchedResult, disambiguationVariants, errorMessage,
    soundEnabled, setSoundEnabled, audioLevel,
    browserInfo, activeEngine, setActiveEngine, modelProgress, modelQuality, setModelQualityState,
    isInfoModalOpen, setIsInfoModalOpen,
    isListeningRef, isHoldingRef, holdStartTimeRef, mouseDownListeningStateRef,
    startListening, stopListeningAndProcess, handleExecuteCommand,
  };
}
