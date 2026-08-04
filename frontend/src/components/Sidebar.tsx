'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Flame,
  Shield,
  Skull,
  Layers,
  Dices,
  Sun,
  Moon,
  Languages,
  RefreshCw,
  Menu,
  X,
  CheckCircle2,
  Database,
  Users,
  Swords,
  Trophy,
  Scroll,
} from 'lucide-react';

interface SidebarProps {
  currentLocale: string;
  dict: any;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  onSyncComplete?: () => void;
  onOpenQuests?: () => void;
  totalPerksCount?: number;
  survivorCount?: number;
  killerCount?: number;
  characterCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentLocale,
  dict,
  activeCategory,
  onSelectCategory,
  onSyncComplete,
  onOpenQuests,
  totalPerksCount = 0,
  survivorCount = 0,
  killerCount = 0,
  characterCount = 0,
}) => {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const toggleLocale =
    currentLocale === 'en' ? (pathname.includes('/es') ? 'pl' : 'es') : currentLocale === 'es' ? 'pl' : 'en';

  const redirectedPathName = (locale: string) => {
    if (!pathname) return '/';
    const segments = pathname.split('/');
    segments[1] = locale;
    return segments.join('/');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

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
              if (data.current_step === 'downloading_assets' && data.total > 0) {
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

  const navItems = [
    {
      id: 'all',
      label: dict.filters.allCategories || 'All Perks',
      icon: Layers,
      color: 'text-slate-400 dark:text-slate-400',
      activeBg: 'bg-slate-200/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100',
    },
    {
      id: 'Survivor',
      label: dict.filters.survivor || 'Survivor Perks',
      icon: Shield,
      color: 'text-emerald-500',
      activeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    },
    {
      id: 'Killer',
      label: dict.filters.killer || 'Killer Perks',
      icon: Skull,
      color: 'text-rose-500',
      activeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    },
    {
      id: 'generator',
      label: dict.filters.generatorTab || 'Perk Generator',
      icon: Dices,
      color: 'text-amber-500',
      activeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    },
    {
      id: 'challenge',
      label: '⚡ Challenge',
      icon: Swords,
      color: 'text-amber-400',
      activeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    },
    {
      id: 'draft',
      label: '🏆 Draft Room',
      icon: Trophy,
      color: 'text-rose-400',
      activeBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    },
    {
      id: 'quests',
      label: '📜 Quests',
      icon: Scroll,
      color: 'text-amber-400',
      activeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    },
  ];

  // Calculate Survivor vs Killer distribution percentages
  const safeTotal = survivorCount + killerCount || 1;
  const survivorPct = Math.round((survivorCount / safeTotal) * 100);
  const killerPct = 100 - survivorPct;

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between p-4 overflow-y-auto">
      <div>
        {/* Brand Header */}
        <Link
          href={`/${currentLocale}`}
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-2 py-3 group focus:outline-none focus:ring-2 focus:ring-red-500 rounded-xl"
        >
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

        {/* Division Navigation Tabs */}
        <nav aria-label="Perk Category Navigation" className="mt-6 space-y-1.5">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Navigation
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeCategory === item.id;

            if (item.id === 'challenge' || item.id === 'draft') {
              return (
                <Link
                  key={item.id}
                  href={`/${currentLocale}/${item.id}`}
                  onClick={() => setMobileOpen(false)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    isActive
                      ? item.activeBg
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${item.color}`} />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            }

            if (item.id === 'quests') {
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (onOpenQuests) onOpenQuests();
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    isActive
                      ? item.activeBg
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${item.color}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectCategory(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  isActive
                    ? item.activeBg
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* NEW: LIVE VAULT STATS WIDGET (Fills the empty space) */}
        <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-100/60 p-3.5 dark:border-slate-800/80 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Database className="h-3 w-3 text-red-500" />
              {dict.stats?.vaultStats || 'Vault Statistics'}
            </span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-xl border border-slate-200/60 bg-white/80 p-2 dark:border-slate-800/60 dark:bg-slate-950/60">
              <div className="flex items-center gap-1 text-slate-400 mb-1">
                <Layers className="h-3 w-3" />
                <span className="text-[10px] font-semibold">{dict.stats?.totalPerks || 'Perks'}</span>
              </div>
              <p className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                {totalPerksCount}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/60 bg-white/80 p-2 dark:border-slate-800/60 dark:bg-slate-950/60">
              <div className="flex items-center gap-1 text-slate-400 mb-1">
                <Users className="h-3 w-3" />
                <span className="text-[10px] font-semibold">{dict.stats?.characters || 'Cast'}</span>
              </div>
              <p className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                {characterCount}
              </p>
            </div>
          </div>

          {/* Survivor vs Killer Ratio Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px] font-extrabold">
              <span className="text-emerald-500 flex items-center gap-1">
                <Shield className="h-3 w-3" /> {survivorCount}
              </span>
              <span className="text-slate-400 text-[10px] font-normal">{dict.stats?.ratio || 'Ratio'}</span>
              <span className="text-rose-500 flex items-center gap-1">
                {killerCount} <Skull className="h-3 w-3" />
              </span>
            </div>

            <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                style={{ width: `${survivorPct}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title={`Survivors: ${survivorPct}%`}
              />
              <div
                style={{ width: `${killerPct}%` }}
                className="bg-rose-500 transition-all duration-500"
                title={`Killers: ${killerPct}%`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Footer Controls */}
      <div className="space-y-3 pt-4 mt-4 border-t border-slate-200/80 dark:border-slate-800/80">
        {showSuccessToast && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Sync Successful!</span>
          </div>
        )}

        <button
          onClick={handleTriggerSync}
          disabled={isSyncing}
          className="w-full flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-3.5 text-xs font-bold text-white shadow-md shadow-red-900/20 hover:from-red-500 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60 transition-all cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? `${dict.app.syncing} (${syncStatus})` : dict.app.syncWiki}</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={redirectedPathName(toggleLocale)}
            aria-label="Switch Language"
            className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/50 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <Languages className="h-3.5 w-3.5 text-red-500" />
            <span className="uppercase">{toggleLocale}</span>
          </Link>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle Dark Mode"
            className="flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100/50 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-slate-300" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        aria-label="Sidebar Navigation"
        className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 transition-colors"
      >
        <SidebarContent />
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 lg:hidden">
        <Link href={`/${currentLocale}`} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white">
            <Flame className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-sm tracking-wider font-mono text-slate-900 dark:text-slate-100">
            {dict.app.title}
          </span>
        </Link>

        <button
          onClick={() => setMobileOpen(true)}
          aria-expanded={mobileOpen}
          aria-label="Open Navigation Drawer"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close Navigation Drawer"
              className="absolute right-3 top-3 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};