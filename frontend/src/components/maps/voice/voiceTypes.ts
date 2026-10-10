// frontend/src/components/maps/voice/voiceTypes.ts
import type React from 'react';

export interface VoiceCommandBannerProps {
  locale?: string;
  currentSource: 'all' | 'hens333' | 'samoelcolt';
  onSourceChange: (source: 'all' | 'hens333' | 'samoelcolt') => void;
  onSelectMap: (mapName: string, mapId?: number, source?: string) => void;
  onAction?: (action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close') => void;
  availableMaps?: Array<{ id: number; name: string; realm?: string; source?: string }>;
  className?: string;
  /** False when the banner is kept mounted but hidden (e.g. behind another
   * mode's UI). Disables the "hold V to talk" hotkey and tears down any
   * in-progress mic session -- both would otherwise keep responding while
   * the banner isn't visible. Defaults to true. */
  active?: boolean;
  /** Optional slot rendered at the center of the header row (e.g. the mode toggle switch) */
  centerHeaderSlot?: React.ReactNode;
  /** When true, omits outer card frame (border, rounded corners, blur glows) for embedding inside a parent container */
  embedded?: boolean;
}

export type VoiceStatusState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'matched'
  | 'nomatch'
  | 'error';

/** The latest values of the props the speech callbacks read (kept in a ref so they never go stale). */
export type VoiceSessionProps = Pick<
  VoiceCommandBannerProps,
  'currentSource' | 'onSourceChange' | 'onSelectMap' | 'onAction' | 'availableMaps'
> & { soundEnabled: boolean };
