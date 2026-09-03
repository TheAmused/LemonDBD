'use client';
// frontend/src/app/[locale]/page.tsx

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { LemonIcon } from '@/components/LemonIcon';
import { QuestsModal } from '@/components/QuestsModal';
import { i18n, type Locale } from '@/i18n/config';
import { Sparkles, ArrowRight } from 'lucide-react';
import { FogHeartbeatBackground } from '@/components/landing/FogHeartbeatBackground';
import { DbdSpinner } from '@/components/DbdSpinner';
import { useImagePrefetch } from '@/components/ImagePreloadProvider';
import { useDictionary } from '@/context/DictionaryContext';

function LandingContent() {
  const params = useParams();
  const locale = (params?.locale as Locale) || i18n.defaultLocale;
  const { prefetchImages } = useImagePrefetch();

  const dict = useDictionary();
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);

  useEffect(() => {
    prefetchImages([
      '/logo.webp',
      '/icon.png',
    ]);
  }, [prefetchImages]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-primary text-text-primary flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <FogHeartbeatBackground />

      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory=""
        onOpenQuests={() => setIsQuestsOpen(true)}
      />

      <main className="flex-1 w-full flex items-center justify-center min-h-[calc(100vh-4rem)] lg:min-h-screen transition-[padding] duration-300 p-4 sm:p-8 lg:p-12 lemon-shell-main">
        <div className="relative flex flex-col items-center text-center w-full max-w-xl mx-auto z-10 py-8 sm:py-12">
          {/* Ambient Glows */}
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-accent-amber/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-accent-red/15 blur-3xl" />

          {/* Big Animated Lemon Icon */}
          <div className="relative mb-8 flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-3xl bg-gradient-to-br from-accent-amber/20 via-accent-amber/5 to-accent-red/20 border-2 border-accent-amber/40 p-6 shadow-2xl shadow-accent-amber/20 hover:scale-105 transition-transform duration-300 group">
            <LemonIcon className="h-full w-full dbd-lemon-glow group-hover:rotate-6 transition-transform duration-300 animate-pulse" />
          </div>

          {/* Badge */}
          {dict?.landing?.welcomeBadge && (
            <div className="inline-flex items-center rounded-full border border-accent-amber/30 bg-accent-amber/10 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-accent-amber mb-5">
              <span>{dict.landing.welcomeBadge}</span>
            </div>
          )}

          {/* Welcoming Words */}
          {dict?.landing?.welcomeTitle && (
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-text-primary">
              {dict.landing.welcomeTitle}
            </h1>
          )}

          {dict?.landing?.welcomeSubtitle && (
            <p className="mt-4 text-sm sm:text-base text-text-secondary leading-relaxed font-medium max-w-md">
              {dict.landing.welcomeSubtitle}
            </p>
          )}

          {/* Direct CTA to Perks */}
          {dict?.landing?.enterButton && (
            <div className="mt-8">
              <Link
                href={`/${locale}/perks`}
                className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-accent-amber to-accent-amber-hover px-7 py-3.5 text-sm font-black text-text-inverted shadow-xl shadow-accent-amber/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>{dict.landing.enterButton}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        <QuestsModal isOpen={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} dict={dict} />
      </main>
    </div>
  );
}

function LandingFallback() {
  return (
    <DbdSpinner
      layout="fullscreen"
      size="responsive"
      accent="amber"
      needleSpeed={1.3}
    />
  );
}


export default function LandingPage() {
  return (
    <Suspense fallback={<LandingFallback />}>
      <LandingContent />
    </Suspense>
  );
}

