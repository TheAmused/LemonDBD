// frontend/src/components/maps/voice/useStartListening.ts
import { useCallback } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { AudioCaptureSession, initClientSpeechModel, type VoiceEngineType } from '@/services/clientSpeechModel';
import { matchVoiceQuery, type MatchResult } from '@/utils/mapVoiceMatcher';
import { localeMetaFor } from '@/i18n/config';
import { useDictionary } from '@/context/DictionaryContext';
import {
  playMicStartSound,
  type SpeechRecognitionErrorEvent,
  type SpeechRecognitionEvent,
  type SpeechRecognitionInstance,
  type WindowWithSpeech,
} from '@/components/maps/VoiceCommandBannerParts';
import type { VoiceSessionProps, VoiceStatusState } from './voiceTypes';

/** Everything the start-listening callback reads or writes. Refs and setters are stable in practice, but
 * they arrive through this object, so the callback lists them as dependencies anyway: a caller that ever
 * passes an unstable one gets a fresh callback instead of a stale closure. */
export interface StartListeningContext {
  activeEngine: VoiceEngineType;
  locale: string;
  executeMatch: (result: MatchResult) => void;
  stopListeningAndProcess: () => Promise<void>;
  recognitionRef: RefObject<SpeechRecognitionInstance | null>;
  audioSessionRef: RefObject<AudioCaptureSession | null>;
  resetTimerRef: RefObject<NodeJS.Timeout | null>;
  silenceTimerRef: RefObject<NodeJS.Timeout | null>;
  isListeningRef: RefObject<boolean>;
  liveTranscriptRef: RefObject<string>;
  pendingMatchRef: RefObject<MatchResult | null>;
  isHoldingRef: RefObject<boolean>;
  holdStartTimeRef: RefObject<number>;
  propsRef: RefObject<VoiceSessionProps>;
  setVoiceStatus: Dispatch<SetStateAction<VoiceStatusState>>;
  setLiveTranscript: Dispatch<SetStateAction<string>>;
  setMatchedResult: Dispatch<SetStateAction<MatchResult | null>>;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  setAudioLevel: Dispatch<SetStateAction<number>>;
  setActiveEngine: Dispatch<SetStateAction<VoiceEngineType>>;
}

/** Starts a microphone session on the active engine (local model or the browser's Web Speech API). */
export function useStartListening(ctx: StartListeningContext) {
  const {
    activeEngine, locale, executeMatch, stopListeningAndProcess,
    recognitionRef, audioSessionRef, resetTimerRef, silenceTimerRef, isListeningRef,
    liveTranscriptRef, pendingMatchRef, isHoldingRef, holdStartTimeRef, propsRef,
    setVoiceStatus, setLiveTranscript, setMatchedResult, setErrorMessage, setAudioLevel, setActiveEngine,
  } = ctx;
  const dict = useDictionary();

  return useCallback(
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
              ? dict.voice.micBlocked
              : dict.voice.micAccessError
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

        recognition.lang = localeMetaFor(locale).bcp47;
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
          const alternatives: string[] = [];

          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              finalText += res[0].transcript + ' ';
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
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          isListeningRef.current = false;
          isHoldingRef.current = false;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

          if (event.error === 'network' || event.error === 'service-not-allowed') {
            setActiveEngine('client-model');
            initClientSpeechModel(locale);
            setVoiceStatus('nomatch');
            setErrorMessage(dict.voice.switchedToLocalEngine);
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
            resetTimerRef.current = setTimeout(() => {
              setVoiceStatus('idle');
            }, 3000);
          } else if (event.error === 'not-allowed') {
            setVoiceStatus('error');
            setErrorMessage(
              dict.voice.micBlocked
            );
          } else if (event.error === 'no-speech') {
            setVoiceStatus('nomatch');
            resetTimerRef.current = setTimeout(() => {
              setVoiceStatus('idle');
            }, 2400);
          } else {
            setVoiceStatus('error');
            setErrorMessage(
              dict.voice.speechRecognitionErrorPrefix
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
                propsRef.current.availableMaps
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
        const message = err instanceof Error ? err.message : dict.voice.failedToInitialize;
        setErrorMessage(message);
      }
    },
    [
      activeEngine, locale, executeMatch, stopListeningAndProcess, dict,
      recognitionRef, audioSessionRef, resetTimerRef, silenceTimerRef, isListeningRef,
      liveTranscriptRef, pendingMatchRef, isHoldingRef, holdStartTimeRef, propsRef,
      setVoiceStatus, setLiveTranscript, setMatchedResult, setErrorMessage, setAudioLevel, setActiveEngine,
    ]
  );
}
