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

import { Button } from '@/components/common/Button';
import { SegmentedControl } from '@/components/common/SegmentedControl';
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
  const rawVoiceDict = dict.voice;

  return (
    <div className="relative z-20 flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3 w-full mb-3">
      {/* Desktop Left: Engine info & Sound controls */}
      <div className="hidden md:flex flex-wrap items-center justify-start gap-2 order-1 flex-1">
        <Button
          type="button"
          onClick={() => setIsInfoModalOpen(true)}
          {...tip(activeEngine === 'web-speech'
              ? dict.voice.webSpeechTooltip
              : dict.voice.clientModelTooltip, undefined, 'action')}
          aria-label={dict.voice.viewEngineInfo}
          variant="soft" size="sm" pill
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
        </Button>

        <Button
          type="button"
          onClick={() => setSoundEnabled((prev) => !prev)}
          {...tip(soundEnabled ? dict.voice.muteSound : dict.voice.enableSound, undefined, 'action')}
          aria-label={soundEnabled ? dict.voice.muteSound : dict.voice.enableSound}
          variant="secondary" size="md" icon
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <VolumeX className="h-4 w-4 text-text-muted" aria-hidden="true" />
          )}
        </Button>
      </div>

      {/* Center slot: Search/Voice mode switcher */}
      {centerHeaderSlot && (
        <div className="flex items-center justify-center shrink-0 order-1 md:order-2">
          {centerHeaderSlot}
        </div>
      )}

      {/* Mobile secondary bar: combines Engine, Sound and Source into ONE clean, compact line */}
      <div className="flex md:hidden items-center justify-center flex-wrap gap-2 order-2 w-full pt-0.5">
        <Button
          type="button"
          onClick={() => setIsInfoModalOpen(true)}
          {...tip(activeEngine === 'web-speech'
              ? dict.voice.webSpeechTooltip
              : dict.voice.clientModelTooltip, undefined, 'action')}
          aria-label={dict.voice.viewEngineInfo}
          variant="soft" size="xs" pill
        >
          {activeEngine === 'web-speech' ? (
            <Globe className="h-3.5 w-3.5 text-accent-red" aria-hidden="true" />
          ) : (
            <Brain className="h-3.5 w-3.5 text-accent-red" aria-hidden="true" />
          )}
          <span>
            {activeEngine === 'web-speech'
              ? rawVoiceDict.engineNativeBadge
              : rawVoiceDict.engineClientBadge}
          </span>
          <span className={`h-2 w-2 rounded-full ${modelProgress.status === 'downloading' ? 'bg-accent-amber animate-pulse' : currentCfg.dotClass}`} aria-hidden="true" />
        </Button>

        <Button
          type="button"
          onClick={() => setSoundEnabled((prev) => !prev)}
          {...tip(soundEnabled ? dict.voice.muteSound : dict.voice.enableSound, undefined, 'action')}
          aria-label={soundEnabled ? dict.voice.muteSound : dict.voice.enableSound}
          variant="secondary" size="sm" icon pill
        >
          {soundEnabled ? (
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <VolumeX className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
          )}
        </Button>

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
        <div className="flex items-center gap-2">
          <span className="type-label-xs text-text-muted">{dict.maps.sourceLabel}</span>
          <SegmentedControl<'hens333' | 'lemondbd'>
            ariaLabel={dict.maps.providerAria}
            size="sm"
            value={currentSource === 'hens333' ? 'hens333' : 'lemondbd'}
            onChange={(source) => {
              if (source === 'hens333') onSourceChange?.('hens333');
            }}
            options={[
              { value: 'hens333', label: dict.maps.sourceHensClock },
              {
                value: 'lemondbd',
                label: dict.maps.sourceLemonDbd,
                icon: <Lock className="h-3 w-3" aria-hidden="true" />,
                disabled: true,
                tooltip: { title: dict.maps.sourceLemonDbd, description: dict.maps.lemonDbdSourceLocked },
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
