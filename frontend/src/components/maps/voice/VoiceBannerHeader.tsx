'use client';
// frontend/src/components/maps/voice/VoiceBannerHeader.tsx

import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Brain, Globe, Volume2, VolumeX } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import type { ModelProgressInfo, VoiceEngineType } from '@/services/clientSpeechModel';
import type { VoiceStatusConfigEntry } from './voiceStatusConfig';
import { Button } from '@/components/common/Button';
import { cn } from '@/utils/cn';

export interface VoiceEngineControlsProps {
  activeEngine: VoiceEngineType;
  modelProgress: ModelProgressInfo;
  currentCfg: VoiceStatusConfigEntry;
  soundEnabled: boolean;
  setSoundEnabled: Dispatch<SetStateAction<boolean>>;
  setIsInfoModalOpen: Dispatch<SetStateAction<boolean>>;
  /** Phones: neutral buttons under the mic instead of the tinted badge beside the mode switcher. */
  compact?: boolean;
  className?: string;
}

/** The engine badge (opens the engine info) with its status dot, and the sound toggle. */
export function VoiceEngineControls({
  activeEngine,
  modelProgress,
  currentCfg,
  soundEnabled,
  setSoundEnabled,
  setIsInfoModalOpen,
  compact = false,
  className,
}: VoiceEngineControlsProps) {
  const dict = useDictionary();
  const EngineIcon = activeEngine === 'web-speech' ? Globe : Brain;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button
        type="button"
        onClick={() => setIsInfoModalOpen(true)}
        aria-label={dict.voice.viewEngineInfo}
        variant={compact ? 'secondary' : 'soft'}
        size="sm"
      >
        <EngineIcon className={cn(!compact && 'icon-md', 'text-accent-red')} aria-hidden="true" />
        <span>{activeEngine === 'web-speech' ? dict.voice.engineNativeBadge : dict.voice.engineClientBadge}</span>
        <span
          className={cn(
            'rounded-full',
            compact ? 'h-2 w-2' : 'h-2.5 w-2.5',
            modelProgress.status === 'downloading' ? 'bg-accent-amber animate-pulse' : currentCfg.dotClass
          )}
          aria-hidden="true"
        />
      </Button>

      <Button
        type="button"
        onClick={() => setSoundEnabled((prev) => !prev)}
        aria-label={soundEnabled ? dict.voice.muteSound : dict.voice.enableSound}
        variant="secondary"
        size={compact ? 'sm' : 'md'}
        icon
      >
        {soundEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX className="text-text-muted" aria-hidden="true" />}
      </Button>
    </div>
  );
}

interface VoiceBannerHeaderProps extends Omit<VoiceEngineControlsProps, 'compact' | 'className'> {
  centerHeaderSlot?: React.ReactNode;
}

/**
 * The mode switcher in the middle, with the engine badge and sound toggle on its left from `md` up.
 * On a phone the engine controls sit under the voice row instead (see VoiceCommandBanner).
 */
export function VoiceBannerHeader({ centerHeaderSlot, ...controls }: VoiceBannerHeaderProps) {
  return (
    <div className="relative z-20 flex items-center justify-center md:justify-between gap-3 w-full mb-3">
      <VoiceEngineControls {...controls} className="hidden md:flex flex-1 justify-start" />

      {centerHeaderSlot && (
        <div className="flex items-center justify-center shrink-0">
          {centerHeaderSlot}
        </div>
      )}

      {/* Empty, the same width as the left side so the mode switcher stays centred. */}
      <div className="hidden md:flex flex-1" aria-hidden="true" />
    </div>
  );
}
