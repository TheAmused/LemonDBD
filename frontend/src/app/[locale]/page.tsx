// frontend/src/app/[locale]/page.tsx
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { LemonIcon } from '@/components/LemonIcon';
import { QuestsModal } from '@/components/QuestsModal';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { useSidebarState } from '@/hooks/useSidebarState';
import { Shield, ArrowRight } from 'lucide-react';

function LandingContent() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const { isCollapsed } = useSidebarState();

  const [dict, setDict] = useState<any>(null);
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);

  useEffect(() => {
    getDictionary(locale).then(setDict);
  }, [locale]);

  if (!dict) return null;

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory=""
        onOpenQuests={() => setIsQuestsOpen(true)}
      />

      <main
        className={`flex-1 w-full flex items-center justify-center min-h-[calc(100vh-4rem)] lg:min-h-screen transition-all duration-300 p-6 sm:p-10 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        <div className="relative flex flex-col items-center text-center max-w-xl mx-auto z-10 py-12">
          {/* Ambient Glows */}
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-red-600/15 blur-3xl" />

          {/* Big Animated Lemon Icon */}
          <div className="relative mb-8 flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500/20 via-amber-500/5 to-red-600/20 border-2 border-amber-500/40 p-6 shadow-2xl shadow-amber-950/60 hover:scale-105 transition-transform duration-300 group">
            <LemonIcon className="h-full w-full filter drop-shadow-[0_0_24px_rgba(245,158,11,0.6)] group-hover:rotate-6 transition-transform duration-300 animate-pulse" />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-amber-400 mb-5">
            <span>{dict?.landing?.welcomeBadge || 'Dead by Daylight Companion'}</span>
          </div>

          {/* Welcoming Words */}
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-100">
            {dict?.landing?.welcomeTitle || 'Welcome to LemonDBD'}
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed font-medium max-w-md">
            {dict?.landing?.welcomeSubtitle ||
              'Your dedicated Dead by Daylight database, interactive map explorer, perk randomizer, and player companion.'}
          </p>

          {/* Direct CTA to Perks */}
          <div className="mt-8">
            <Link
              href={`/${locale}/perks`}
              className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-7 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-amber-950/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Shield className="h-4 w-4" />
              <span>{dict?.landing?.enterButton || 'Enter Perks Vault'}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <QuestsModal isOpen={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} dict={dict} />
      </main>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b12] flex items-center justify-center text-slate-400 font-mono text-xs">
          Loading LemonDBD...
        </div>
      }
    >
      <LandingContent />
    </Suspense>
  );
}

