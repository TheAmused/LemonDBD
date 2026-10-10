// frontend/src/components/maps/voice/voiceStatusConfig.ts
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, CheckCircle2, Mic, MicOff, RefreshCw, Volume2 } from 'lucide-react';
import type { VoiceStatusState } from './voiceTypes';

export interface VoiceStatusConfigEntry {
  badge: string;
  dotClass: string;
  icon: LucideIcon;
  buttonColor: string;
}

/** Badge copy, indicator colour, icon and button colours for each voice status. */
export function buildStatusConfig(rawVoiceDict: Record<string, string>): Record<VoiceStatusState, VoiceStatusConfigEntry> {
  return {
    idle: {
      badge: rawVoiceDict.idleReady || '',
      dotClass: 'bg-text-muted',
      icon: Mic,
      buttonColor: 'bg-bg-elevated text-text-secondary ring-border-color hover:bg-bg-surface',
    },
    listening: {
      badge: rawVoiceDict.listeningSpeakNow || '',
      dotClass: 'bg-accent-red animate-ping',
      icon: Volume2,
      buttonColor: 'bg-accent-red text-text-inverted ring-accent-red/60 hover:bg-accent-red-hover',
    },
    processing: {
      badge: rawVoiceDict.processingAudio || '',
      dotClass: 'bg-accent-amber animate-pulse',
      icon: RefreshCw,
      buttonColor: 'bg-accent-amber text-text-inverted ring-accent-amber/40',
    },
    matched: {
      badge: rawVoiceDict.matchedExecuting || '',
      dotClass: 'bg-accent-green',
      icon: CheckCircle2,
      buttonColor: 'bg-accent-green text-text-inverted ring-accent-green/50',
    },
    nomatch: {
      badge: rawVoiceDict.noMatchTryAgain || '',
      dotClass: 'bg-accent-amber',
      icon: MicOff,
      buttonColor: 'bg-accent-amber text-text-inverted ring-accent-amber/30',
    },
    error: {
      badge: rawVoiceDict.micErrorCheckPermission || '',
      dotClass: 'bg-accent-red',
      icon: AlertCircle,
      buttonColor: 'bg-accent-red text-text-inverted ring-accent-red/40',
    },
  };
}
