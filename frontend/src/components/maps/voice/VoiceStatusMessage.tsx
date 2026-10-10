'use client';
// frontend/src/components/maps/voice/VoiceStatusMessage.tsx

import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Spinner } from '@/components/common/Spinner';
import { useDictionary } from '@/context/DictionaryContext';
import type { VoiceEngineType } from '@/services/clientSpeechModel';
import type { MatchResult } from '@/utils/mapVoiceMatcher';
import { formatMessage } from '@/utils/i18nFormat';
import { renderHoldKeyHint } from '@/components/maps/VoiceCommandBannerParts';
import type { VoiceStatusState } from './voiceTypes';

interface VoiceStatusMessageProps {
  voiceStatus: VoiceStatusState;
  liveTranscript: string;
  audioLevel: number;
  activeEngine: VoiceEngineType;
  matchedResult: MatchResult | null;
  errorMessage: string;
}

/** The live status line under the mic button (one layout per voice status). */
export function VoiceStatusMessage({
  voiceStatus,
  liveTranscript,
  audioLevel,
  activeEngine,
  matchedResult,
  errorMessage,
}: VoiceStatusMessageProps) {
  const dict = useDictionary();
  const rawVoiceDict = (dict.voice || {}) as Record<string, string>;

  const matchPercentText = matchedResult?.confidence
    ? rawVoiceDict.matchPercent
      ? formatMessage(rawVoiceDict.matchPercent, { percent: Math.round(matchedResult.confidence * 100) })
      : `(${Math.round(matchedResult.confidence * 100)}%)`
    : '';

  return (
    <div className="flex flex-col items-center w-full max-w-xl md:max-w-2xl lg:max-w-3xl px-2" aria-live="polite">
        {voiceStatus === 'listening' && (
          <div className="flex flex-col text-center items-center w-full max-w-full px-2">
            <div className="flex items-center justify-center gap-2 max-w-full">
              <span className="h-2 w-2 rounded-full bg-accent-red animate-ping shrink-0" aria-hidden="true" />
              <span className="type-strong-fluid text-text-primary truncate max-w-[280px] sm:max-w-xl">
                {liveTranscript
                  ? `“${liveTranscript}”`
                  : audioLevel > 8
                    ? rawVoiceDict.listeningVoice || ''
                    : rawVoiceDict.speakMapPrompt || ''}
              </span>
            </div>
            <span className="type-micro text-text-muted truncate max-w-[280px] sm:max-w-xl">
              {activeEngine === 'client-model'
                ? rawVoiceDict.localModelListeningDesc || ''
                : rawVoiceDict.webSpeechListeningDesc || ''}
            </span>
          </div>
        )}

        {voiceStatus === 'processing' && (
          <div className="flex flex-col text-center items-center w-full max-w-full px-2">
            <div className="flex items-center justify-center gap-2 max-w-full">
              <Spinner size="xs" tone="amber" />
              <span className="type-strong-fluid text-accent-amber truncate max-w-[280px] sm:max-w-xl">
                {liveTranscript
                  ? `${rawVoiceDict.transcribingPrefix || ''} “${liveTranscript}”`
                  : rawVoiceDict.transcribingVoice || ''}
              </span>
            </div>
            <span className="type-micro text-accent-amber/80 truncate max-w-[280px] sm:max-w-xl">
              {rawVoiceDict.localWasmInference || ''}
            </span>
          </div>
        )}

        {voiceStatus === 'matched' && matchedResult && (
          <div className="flex flex-col text-center items-center w-full max-w-full px-2">
            <div className="flex items-center justify-center gap-1.5 max-w-full">
              <CheckCircle2 className="h-3.5 w-3.5 text-accent-green shrink-0" aria-hidden="true" />
              <span className="type-strong-fluid text-accent-green truncate max-w-[280px] sm:max-w-xl">
                {matchedResult.matchedMapName
                  ? `${rawVoiceDict.matchedPrefix || ''} ${matchedResult.matchedMapName}`
                  : matchedResult.action === 'switch_source'
                    ? `${rawVoiceDict.switchedPrefix || ''} ${matchedResult.actionPayload}`
                    : `${rawVoiceDict.actionPrefix || ''} ${matchedResult.action}`}
              </span>
            </div>
            {liveTranscript && (
              <span className="type-micro text-accent-green/90 truncate max-w-[280px] sm:max-w-xl">
                {dict.maps.heardLabel} {dict.maps.openQuote}{liveTranscript}{dict.maps.closeQuote} {matchPercentText}
              </span>
            )}
          </div>
        )}

        {voiceStatus === 'nomatch' && (
          <div className="flex flex-col text-center items-center w-full max-w-full px-2">
            <div className="flex items-center justify-center gap-1.5 type-strong text-accent-amber max-w-full">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[280px] sm:max-w-xl">
                {liveTranscript
                  ? `${dict.maps.heardLabel} “${liveTranscript}” (${rawVoiceDict.noDbdMatch || ''})`
                  : rawVoiceDict.noSpeechDetected || ''}
              </span>
            </div>
            <span className="type-micro text-text-muted truncate max-w-[280px] sm:max-w-xl">
              {rawVoiceDict.trySayingPrompt || ''}
            </span>
          </div>
        )}

        {voiceStatus === 'error' && (
          <div className="flex flex-col text-center items-center w-full max-w-full px-2">
            <div className="flex items-center justify-center gap-1.5 type-strong text-accent-red max-w-full">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[280px] sm:max-w-xl">{errorMessage || rawVoiceDict.micBlocked || ''}</span>
            </div>
            <span className="type-micro text-accent-red/80 truncate max-w-[280px] sm:max-w-xl">
              {rawVoiceDict.checkPermissionsHint || ''}
            </span>
          </div>
        )}

        {voiceStatus === 'idle' && (
          <div className="w-full text-center px-2 max-w-full">
            <p className="text-xs sm:text-compact text-text-muted leading-relaxed text-center break-words max-w-full">
              <span className="md:hidden">
                {rawVoiceDict.tapToTalkMobileHint || dict.voice.tapToTalkMobileHint}
              </span>
              <span className="hidden md:inline">
                {renderHoldKeyHint(rawVoiceDict.holdVToTalkHint, dict.maps.keyV)}
              </span>
            </p>
          </div>
        )}
    </div>
  );
}
