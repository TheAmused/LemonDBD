'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, Languages, Flame, RefreshCw, CheckCircle2, Trophy, Scroll, Users, Calculator, Wand2, Compass } from 'lucide-react';

interface NavbarProps {
  currentLocale: string;
  dict: any;
  onSyncComplete?: () => void;
  onOpenQuests?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentLocale, dict, onSyncComplete, onOpenQuests }) => {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const toggleLocale = currentLocale === 'en' ? 'es' : 'en';

  const redirectedPathName = (locale: string) => {
    if (!pathname) return '/';
    const segments = pathname.split('/');
    segments[1] = locale;
    return segments.join('/');
  };

  const handleTriggerSync = async () => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);
      setSyncStatus('Init...');
      await fetch(`${backendBase}/api/v1/scrape`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to trigger scrape job:', err);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isSyncing) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${backendBase}/api/v1/scrape/status`);
          if (res.ok) {
            const data = await res.json();
            if (data.is_running) {
              if (data.current_step === 'downloading_icons' && data.total > 0) {
                const pct = Math.round((data.progress / data.total) * 100);
                setSyncStatus(`${pct}%`);
              } else {
                setSyncStatus(data.current_step.replace('_', ' '));
              }
            } else {
              setIsSyncing(false);
              setSyncStatus('');
              setShowSuccessToast(true);
              setTimeout(() => setShowSuccessToast(false), 4000);
              if (onSyncComplete) onSyncComplete();
              clearInterval(interval);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isSyncing, backendBase, onSyncComplete]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          {/* Brand Logo */}
          <Link href={`/${currentLocale}`} className="flex items-center gap-3 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-900 text-white shadow-lg shadow-red-900/30 group-hover:scale-105 transition-transform">
              <Flame className="h-5 w-5 text-red-100 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-wider text-slate-900 dark:text-slate-100 font-mono">
                  {dict.app.title}
                </span>
                <span className="rounded bg-red-600/10 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 border border-red-500/20">
                  PRO
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {dict.app.subtitle}
              </p>
            </div>
          </Link>

          {/* Main Navigation */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-2">
            <Link
              href={`/${currentLocale}/challenge`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                pathname?.includes('/challenge')
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm'
                  : 'text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20'
              }`}
            >
              <span>⚡ Challenge</span>
            </Link>

            <Link
              href={`/${currentLocale}/draft`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                pathname?.includes('/draft')
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm'
                  : 'text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20'
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>Draft Room</span>
            </Link>

            <Link
              href={`/${currentLocale}/swf`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                pathname?.includes('/swf')
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                  : 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>SWF Planner</span>
            </Link>

            <Link
              href={`/${currentLocale}/killer-calculator`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                pathname?.includes('/killer-calculator')
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-sm'
                  : 'text-purple-500 hover:text-purple-400 hover:bg-purple-500/10 border border-purple-500/20'
              }`}
            >
              <Calculator className="h-3.5 w-3.5" />
              <span>Killer Calc</span>
            </Link>

            <Link
              href={`/${currentLocale}/builds`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                pathname?.includes('/builds')
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-sm'
                  : 'text-red-500 hover:text-red-400 hover:bg-red-500/10 border border-red-500/20'
              }`}
            >
              <span>🔥 Build Vault</span>
            </Link>

            <Link
              href={`/${currentLocale}/custom-perks`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                pathname?.includes('/custom-perks')
                  ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20 shadow-sm'
                  : 'text-pink-500 hover:text-pink-400 hover:bg-pink-500/10 border border-pink-500/20'
              }`}
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>Perk Studio</span>
            </Link>

            <Link
              href={`/${currentLocale}/maps`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                pathname?.includes('/maps')
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                  : 'text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20'
              }`}
            >
              <Compass className="h-3.5 w-3.5 text-cyan-400" />
              <span>Map Explorer</span>
            </Link>

            {onOpenQuests && (
              <button
                onClick={onOpenQuests}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-all cursor-pointer"
              >
                <Scroll className="h-3.5 w-3.5 text-amber-400" />
                <span>Quests</span>
              </button>
            )}
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {showSuccessToast && (
            <div className="hidden md:flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Database Updated</span>
            </div>
          )}

          {/* Sync Trigger Button */}
          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            title={dict.app.syncWiki}
            className="flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-3.5 text-xs font-bold text-white shadow-md shadow-red-900/20 hover:from-red-500 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:opacity-60 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isSyncing ? `${dict.app.syncing} (${syncStatus})` : dict.app.syncWiki}
            </span>
          </button>

          {/* Locale Switcher */}
          <Link
            href={redirectedPathName(toggleLocale)}
            aria-label="Toggle Language"
            className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <Languages className="h-3.5 w-3.5 text-red-500" />
            <span className="uppercase tracking-wider">{toggleLocale}</span>
          </Link>

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle Theme"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100/50 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-slate-300" />
          </button>
        </div>
      </div>
    </header>
  );
};