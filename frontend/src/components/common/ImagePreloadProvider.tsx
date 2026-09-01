// frontend/src/components/common/ImagePreloadProvider.tsx
'use client';

import React, { useEffect, createContext, useContext, useCallback } from 'react';
import { getPerkIconUrl, getCharacterAvatarUrl, getBackendBaseUrl } from '@/utils/perkUtils';
import type { Perk } from '@/types/perks';

interface ImagePreloadContextType {
  prefetchImages: (urls: (string | null | undefined)[]) => void;
  prefetchPerkIcons: (perks: Perk[]) => void;
}

const ImagePreloadContext = createContext<ImagePreloadContextType>({
  prefetchImages: () => {},
  prefetchPerkIcons: () => {},
});

// Core assets to warm up in background
const CORE_ASSETS_TO_PREFETCH = [
  '/logo.webp',
  '/icon.png',
  '/images/addon-rarity/common.webp',
  '/images/addon-rarity/uncommon.webp',
  '/images/addon-rarity/rare.webp',
  '/images/addon-rarity/very-rare.webp',
  '/images/addon-rarity/ultra-rare.webp',
];

export const ImagePreloadProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  // 1. Register Service Worker for Cache-Storage Image Caching
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const registerSW = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(() => {
          // Registration successful
        })
        .catch(() => {
          // Non-fatal fallback
        });
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW, { once: true });
    }
  }, []);

  // 2. Prefetch array of image URLs in background idle time
  const prefetchImages = useCallback((urls: (string | null | undefined)[]) => {
    if (typeof window === 'undefined' || !urls || urls.length === 0) return;

    const validUrls = urls.filter((u): u is string => Boolean(u && typeof u === 'string'));
    if (validUrls.length === 0) return;

    const runPrefetch = () => {
      validUrls.forEach((url) => {
        try {
          const img = new Image();
          img.src = url;
        } catch {
          // Non-fatal prefetch error
        }
      });
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(runPrefetch, { timeout: 2000 });
    } else {
      setTimeout(runPrefetch, 500);
    }
  }, []);

  // 3. Helper to prefetch all icons from an array of perks / characters
  const prefetchPerkIcons = useCallback(
    (perks: Perk[]) => {
      if (!perks || perks.length === 0) return;
      const backendBase = getBackendBaseUrl();
      const urls: string[] = [];

      for (const perk of perks) {
        const iconUrl = getPerkIconUrl(perk, backendBase);
        if (iconUrl) urls.push(iconUrl);

        const avatarUrl = getCharacterAvatarUrl(
          perk,
          (perk.category === 'Killer' || perk.category === 'Survivor' ? perk.category : undefined),
          backendBase
        );
        if (avatarUrl) urls.push(avatarUrl);
      }

      prefetchImages(urls);
    },
    [prefetchImages]
  );

  // 4. Initial Background Warmup
  useEffect(() => {
    prefetchImages(CORE_ASSETS_TO_PREFETCH);
  }, [prefetchImages]);

  return (
    <ImagePreloadContext value={{ prefetchImages, prefetchPerkIcons }}>
      {children}
    </ImagePreloadContext>
  );
};

export const useImagePrefetch = () => useContext(ImagePreloadContext);
