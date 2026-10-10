'use client';
// frontend/src/components/maps/voice/VoiceBannerHeader.tsx

import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Brain, Globe, Lock, Volume2, VolumeX } from 'lucide-react';
import { tip } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';
import type { ModelProgressInfo, VoiceEngineType } from '@/services/clientSpeechModel';
import type { VoiceStatusConfigEntry } from './voiceStatusConfig';
import type { VoiceCommandBannerProps } from './voiceTypes';

interface VoiceBannerHeaderProps {
  activeEngine: VoiceEngineType;
  modelProgress: ModelProgressInfo;
  currentCfg: VoiceStatusConfigEntry;
  soundEnabled: boolean;
  setSoundEnabled: Dispatch<SetStateAction<boolean>>;
  setIsInfoModalOpen: Dispatch<SetStateAction<boolean>>;
  centerHeaderSlot?: React.ReactNode;
  currentSource: VoiceCommandBannerProps['currentSource'];
  onSourceChange: VoiceCommandBannerProps['onSourceChange'];
}

/** Engine badge, sound toggle, optional centre slot and source switcher. */
export function VoiceBannerHeader({
  activeEngine,
  modelProgress,
  currentCfg,
  soundEnabled,
  setSoundEnabled,
  setIsInfoModalOpen,
  centerHeaderSlot,
  currentSource,
  onSourceChange,
}: VoiceBannerHeaderProps) {
  const dict = useDictionary();
  const rawVoiceDict = (dict.voice || {}) as Record<string, string>;

  return (
    <div className="relative z-20 flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3 w-full mb-3">
      {/* Desktop Left: Engine info & Sound controls */}
      <div className="hidden md:flex flex-wrap items-center justify-start gap-2 order-1 flex-1">
        <button
          type="button"
          onClick={() => setIsInfoModalOpen(true)}
          {...tip(activeEngine === 'web-speech'
              ? dict.voice.webSpeechTooltip
              : dict.voice.clientModelTooltip, undefined, 'action')}
          aria-label={dict.voice.viewEngineInfo}
          className="inline-flex items-center gap-2 rounded-full border border-accent-red/30 bg-accent-red/10 px-3.5 py-1.5 text-compact font-bold text-accent-red transition-all cursor-pointer shadow-sm hover:scale-105 hover:bg-accent-red/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
        >
          {activeEngine === 'web-speech' ? (
            <Globe className="h-4 w-4 text-accent-red" aria-hidden="true" />
          ) : (
            <Brain className="h-4 w-4 text-accent-red" aria-hidden="true" />
          )}
          <span>
            {activeEngine === 'web-speech'
              ? rawVoiceDict.engineNativeBadge || ''
              : rawVoiceDict.engineClientBadge || ''}
          </span>
          <span className={`h-2.5 w-2.5 rounded-full ${modelProgress.status === 'downloading' ? 'bg-accent-amber animate-pulse' : currentCfg.dotClass}`} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => setSoundEnabled((prev) => !prev)}
          {...tip(soundEnabled ? dict.voice.muteSound : dict.voice.enableSound, undefined, 'action')}
          aria-label={soundEnabled ? dict.voice.muteSound : dict.voice.enableSound}
          className="pointer-coarse:min-h-11 pointer-coarse:min-w-11 flex h-9 w-9 items-center justify-center rounded-xl border border-border-color bg-bg-elevated text-text-secondary transition hover:border-border-subtle hover:text-text-primary cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-red"
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <VolumeX className="h-4 w-4 text-text-muted" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Center slot: Search/Voice mode switcher */}
      {centerHeaderSlot && (
        <div className="flex items-center justify-center shrink-0 order-1 md:order-2">
          {centerHeaderSlot}
        </div>
      )}

      {/* Mobile secondary bar: combines Engine, Sound and Source into ONE clean, compact line */}
      <div className="flex md:hidden items-center justify-center flex-wrap gap-2 order-2 w-full pt-0.5">
        <button
          type="button"
          onClick={() => setIsInfoModalOpen(true)}
          {...tip(activeEngine === 'web-speech'
              ? dict.voice.webSpeechTooltip
              : dict.voice.clientModelTooltip, undefined, 'action')}
          aria-label={dict.voice.viewEngineInfo}
          className="inline-flex items-center gap-1.5 rounded-full border border-accent-red/30 bg-accent-red/10 px-2.5 py-1 type-strong text-accent-red transition-all cursor-pointer hover:bg-accent-red/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red shadow-xs"
        >
          {activeEngine === 'web-speech' ? (
            <Globe className="h-3.5 w-3.5 text-accent-red" aria-hidden="true" />
          ) : (
            <Brain className="h-3.5 w-3.5 text-accent-red" aria-hidden="true" />
          )}
          <span>
            {activeEngine === 'web-speech'
              ? rawVoiceDict.engineNativeBadge || 'Web Speech'
              : rawVoiceDict.engineClientBadge || 'Lokalny Model AI'}
          </span>
          <span className={`h-2 w-2 rounded-full ${modelProgress.status === 'downloading' ? 'bg-accent-amber animate-pulse' : currentCfg.dotClass}`} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => setSoundEnabled((prev) => !prev)}
          {...tip(soundEnabled ? dict.voice.muteSound : dict.voice.enableSound, undefined, 'action')}
          aria-label={soundEnabled ? dict.voice.muteSound : dict.voice.enableSound}
          className="pointer-coarse:min-h-11 pointer-coarse:min-w-11 flex h-7 w-7 items-center justify-center rounded-full border border-border-color bg-bg-elevated text-text-secondary transition hover:border-border-subtle hover:text-text-primary cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-red shadow-xs"
        >
          {soundEnabled ? (
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <VolumeX className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
          )}
        </button>

        <div
          className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-bg-elevated px-2.5 py-1 text-xs text-text-secondary shadow-xs"
        >
          <span className="type-label-2xs text-text-muted">
            {dict.maps.sourceLabel}
          </span>
          <span className="font-extrabold text-accent-red">
            {dict.maps.sourceHens}
          </span>
        </div>
      </div>

      {/* Desktop Right: Source switcher */}
      <div className="hidden md:flex flex-wrap items-center justify-end gap-2 order-3 flex-1">
        <div
          role="group"
          aria-label={dict.maps.providerAria}
          className="flex items-center gap-1.5 rounded-full border border-border-color bg-bg-elevated p-1"
        >
          <span className="px-1.5 type-label-xs text-text-muted">
            {dict.maps.sourceLabel}
          </span>
          <button
            type="button"
            onClick={() => onSourceChange('hens333')}
            aria-pressed={currentSource === 'hens333'}
            className={`rounded-full px-3 py-1 text-compact font-extrabold transition-all cursor-pointer ${currentSource === 'hens333'
                ? 'bg-accent-red text-text-inverted shadow-sm font-black'
                : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
              }`}
          >
            {dict.maps.sourceHensClock}
          </button>

          <button
            type="button"
            disabled
            {...tip(dict.maps.lemonDbdSourceLocked, undefined, 'action')} aria-label={dict.maps.lemonDbdSourceLocked}
            aria-disabled="true"
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-compact font-extrabold text-text-muted cursor-not-allowed"
          >
            <Lock className="h-3 w-3" aria-hidden="true" />
            {dict.maps.sourceLemonDbd}
          </button>
        </div>
      </div>
    </div>
  );
}
