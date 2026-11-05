'use client';
// frontend/src/components/landing/HomePage.tsx

import React, { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { } from 'next/navigation';
import { LemonIcon } from '@/components/LemonIcon';

import { SlidersHorizontal } from 'lucide-react';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import { useImagePrefetch } from '@/components/common/ImagePreloadProvider';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { buttonClassName } from '@/components/common/Button';

function LandingContent() {
  const locale = useLocale();
  const { prefetchImages } = useImagePrefetch();

  const dict = useDictionary();

  useEffect(() => {
    prefetchImages([
      '/logo.webp',
      '/icon.png',
    ]);
  }, [prefetchImages]);

  return (
    <div className="relative flex flex-col items-center text-center w-full max-w-xl mx-auto z-10 py-8 sm:py-12">
      {/* Welcoming Words */}
      {dict.landing.welcomeTitle && (
        <h1 className="mb-8 text-3xl sm:text-5xl font-black tracking-tight text-text-primary">
          {dict.landing.welcomeTitle}
        </h1>
      )}

      {/* Big Animated Lemon Icon */}
      <div className="relative mb-8 flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-card bg-bg-elevated border-2 border-accent-red/40 p-6 shadow-md hover:scale-105 transition-transform duration-300 group">
        <LemonIcon className="h-full w-full dbd-lemon-glow group-hover:rotate-6 transition-transform duration-300 animate-pulse" />
      </div>

      {dict.landing.welcomeSubtitle && (
        <p className="text-sm sm:text-base text-text-secondary leading-relaxed font-medium max-w-md">
          {dict.landing.welcomeSubtitle}
        </p>
      )}

      {/* Navigation lives in the sidebar, so the hero only points at tailoring the site. */}
      {dict.landing.settingsButton && (
        <div className="mt-8">
          <Link
            href={`/${locale}/settings`}
            className={buttonClassName('primary', 'lg')}
          >
            <SlidersHorizontal className="icon-md" />
            <span>{dict.landing.settingsButton}</span>
          </Link>
        </div>
      )}
    </div>
  );
}

function LandingFallback() {
  return (
    <DbdSpinner
      layout="inline"
      size="responsive"
      accent="blood"
      needleSpeed={1.3}
    />
  );
}


export default function HomePage() {
  return (
    <Suspense fallback={<LandingFallback />}>
      <LandingContent />
    </Suspense>
  );
}

