'use client';
// frontend/src/components/maps/VoiceCommandBanner.tsx

import React from 'react';
import {
  initClientSpeechModel,
  resolveModelDescriptor,
  setModelQuality,
} from '@/services/clientSpeechModel';
import { useDictionary } from '@/context/DictionaryContext';
import { VoiceEngineInfoModal } from './VoiceCommandBannerParts';
import { VoiceBannerHeader } from './voice/VoiceBannerHeader';
import { VoiceMicButton } from './voice/VoiceMicButton';
import { VoiceStatusMessage } from './voice/VoiceStatusMessage';
import { VoiceVariantPills } from './voice/VoiceVariantPills';
import { VoiceWaveform } from './voice/VoiceWaveform';
import { buildStatusConfig } from './voice/voiceStatusConfig';
import { useVoiceSession } from './voice/useVoiceSession';
import type { VoiceCommandBannerProps } from './voice/voiceTypes';

export type { VoiceCommandBannerProps, VoiceStatusState } from './voice/voiceTypes';

export function VoiceCommandBanner({
  locale = 'en',
  currentSource,
  onSourceChange,
  onSelectMap,
  onAction,
  availableMaps,
  className = '',
  active = true,
  centerHeaderSlot,
  embedded = false,
}: VoiceCommandBannerProps) {
  const dict = useDictionary();
  const session = useVoiceSession({
    locale, currentSource, onSourceChange, onSelectMap, onAction, availableMaps, active,
  });
  const {
    voiceStatus, liveTranscript, matchedResult, disambiguationVariants, errorMessage,
    soundEnabled, setSoundEnabled, audioLevel,
    browserInfo, activeEngine, setActiveEngine, modelProgress, modelQuality, setModelQualityState,
    isInfoModalOpen, setIsInfoModalOpen,
    handleExecuteCommand,
  } = session;

  const rawVoiceDict = (dict.voice || {}) as Record<string, string>;
  const currentCfg = buildStatusConfig(rawVoiceDict)[voiceStatus];

  return (
    // From `md` up the controls row is lifted out of the flow so the mic cluster
    // centres against the whole panel rather than the space left under it; the
    // min-height is what keeps the centred cluster clear of those controls.
    // Below `md` the controls wrap to a second line and would collide, so they
    // stay in the flow there.
    <section
      aria-label={dict.maps.voiceEngineAria}
      className={
        embedded
          ? `relative flex flex-1 h-full w-full flex-col ${className}`
          : `relative flex w-full flex-col overflow-hidden rounded-3xl border border-border-color bg-bg-surface px-4 pt-3.5 pb-4 sm:px-6 sm:pt-4 sm:pb-5 md:min-h-[14rem] backdrop-blur-xl shadow-xl dark:shadow-2xl transition-all duration-300 ${className}`
      }
    >
      {!embedded && (
        <>
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-accent-red/5 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-accent-red/5 blur-3xl" />
        </>
      )}

      <VoiceBannerHeader
        activeEngine={activeEngine}
        modelProgress={modelProgress}
        currentCfg={currentCfg}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        setIsInfoModalOpen={setIsInfoModalOpen}
        centerHeaderSlot={centerHeaderSlot}
        currentSource={currentSource}
        onSourceChange={onSourceChange}
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 py-1">
        <div className="flex w-full items-center justify-center gap-3 sm:gap-5">
          <VoiceWaveform
            heights={[7, 14, 24, 36, 46, 34, 20, 12]}
            keyPrefix="left-wave"
            phaseOffset={0}
            idleBarClass="bg-accent-red"
            voiceStatus={voiceStatus}
            audioLevel={audioLevel}
          />
          <VoiceMicButton
            voiceStatus={voiceStatus}
            currentCfg={currentCfg}
            isListeningRef={session.isListeningRef}
            isHoldingRef={session.isHoldingRef}
            holdStartTimeRef={session.holdStartTimeRef}
            mouseDownListeningStateRef={session.mouseDownListeningStateRef}
            startListening={session.startListening}
            stopListeningAndProcess={session.stopListeningAndProcess}
          />
          <VoiceWaveform
            heights={[12, 20, 34, 46, 36, 24, 14, 7]}
            keyPrefix="right-wave"
            phaseOffset={2}
            idleBarClass="bg-accent-amber"
            voiceStatus={voiceStatus}
            audioLevel={audioLevel}
          />
        </div>

        <VoiceStatusMessage
          voiceStatus={voiceStatus}
          liveTranscript={liveTranscript}
          audioLevel={audioLevel}
          activeEngine={activeEngine}
          matchedResult={matchedResult}
          errorMessage={errorMessage}
        />
      </div>

      {disambiguationVariants.length > 0 && (
        <VoiceVariantPills variants={disambiguationVariants} onSelect={handleExecuteCommand} />
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
        onSelectModelQuality={(quality) => {
          if (setModelQuality(quality)) {
            setModelQualityState(quality);
            if (activeEngine === 'client-model') {
              initClientSpeechModel(locale);
            }
          }
        }}
        modelDescriptor={resolveModelDescriptor(locale, modelQuality)}
      />
    </section>
  );
}
