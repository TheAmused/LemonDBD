'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { MapExplorer } from '@/components/maps/MapExplorer';
import VoiceNavButton from '@/components/maps/VoiceNavButton';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { Mic, Compass } from 'lucide-react';

export default function MapsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as Locale) || 'en';

  const [dict, setDict] = useState<any>(null);

  // Read optional ?mapName= query param set by VoiceNavButton
  // MapExplorer will auto-open that map's detail modal on load
  const initialMapName = searchParams?.get('mapName') || '';

  useEffect(() => {
    getDictionary(locale).then(setDict);
  }, [locale]);

  const handleSelectCategory = (cat: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/${locale}`;
    }
  };

  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row dbd-fog-overlay">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="maps"
        onSelectCategory={handleSelectCategory}
      />

      <main className="flex-1 lg:pl-64 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {/* ── Page Header ── */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <Compass className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">
                Map Explorer
              </h1>
              <p className="text-xs text-slate-500">
                Browse DBD maps, callouts, and guides
              </p>
            </div>
          </div>

          {/* ── Voice Command Bar ── */}
          <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900/70 px-5 py-4 backdrop-blur-sm shadow-lg shadow-cyan-950/30">
            {/* Decorative ambient glow */}
            <div className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
            <div className="pointer-events-none absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-cyan-600/5 blur-2xl" />

            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/25">
                  <Mic className="h-3.5 w-3.5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">Voice Navigation</p>
                  <p className="text-[10px] text-slate-500">
                    Say a map name — it opens automatically
                  </p>
                </div>
              </div>

              <VoiceNavButton locale={locale} />
            </div>
          </div>
        </div>

        {/* ── Map Explorer — receives the spoken map name to auto-open ── */}
        <MapExplorer initialMapName={initialMapName} />
      </main>
    </div>
  );
}
