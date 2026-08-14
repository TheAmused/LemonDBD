'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { VoiceCommandBanner, VoiceCommandBannerProps } from './VoiceCommandBanner';

export interface VoiceNavButtonProps {
  locale?: string;
  currentSource?: 'all' | 'hens333' | 'samoelcolt';
  onSourceChange?: (source: 'all' | 'hens333' | 'samoelcolt') => void;
  onSelectMap?: (mapName: string, mapId?: string, source?: string) => void;
  onAction?: (action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close') => void;
  availableMaps?: Array<{ id: string; name: string; realm: string; source: string }>;
  className?: string;
  variant?: 'banner' | 'compact';
}

/**
 * VoiceNavButton
 * Backward-compatible wrapper component providing full VoiceCommandBanner features
 * and navigation support.
 */
export function VoiceNavButton({
  locale = 'en',
  currentSource: propSource,
  onSourceChange: propOnSourceChange,
  onSelectMap: propOnSelectMap,
  onAction: propOnAction,
  availableMaps,
  className = '',
  variant = 'banner',
}: VoiceNavButtonProps) {
  const router = useRouter();
  const [internalSource, setInternalSource] = useState<'all' | 'hens333' | 'samoelcolt'>(
    propSource || 'hens333'
  );

  const currentSource = propSource || internalSource;
  const handleSourceChange = propOnSourceChange || setInternalSource;

  const handleSelectMap =
    propOnSelectMap ||
    ((mapName: string, mapId?: string, source?: string) => {
      const queryParams = new URLSearchParams();
      if (mapName) queryParams.set('mapName', mapName);
      if (mapId) queryParams.set('mapId', mapId);
      if (source && source !== 'all') queryParams.set('source', source);

      router.push(`/${locale}/maps?${queryParams.toString()}`);
    });

  const handleAction =
    propOnAction ||
    ((action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close') => {
      // Default fallback for action commands when no custom action handler is provided
      if (action === 'close') {
        router.push(`/${locale}`);
      }
    });

  return (
    <VoiceCommandBanner
      locale={locale}
      currentSource={currentSource}
      onSourceChange={handleSourceChange}
      onSelectMap={handleSelectMap}
      onAction={handleAction}
      availableMaps={availableMaps}
      className={className}
    />
  );
}

export { VoiceCommandBanner };
export default VoiceNavButton;
