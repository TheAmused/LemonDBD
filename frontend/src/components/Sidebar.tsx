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
  Calculator,
  Wand2,
  Compass,
  Package,
  Settings,
  Repeat,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Folder,
  Gamepad2,
} from 'lucide-react';
import { ScraperConfigModal } from './ScraperConfigModal';
import { useSidebarState } from '@/hooks/useSidebarState';

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
  const { isCollapsed, toggleSidebar } = useSidebarState();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [othersOpen, setOthersOpen] = useState(false);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const toggleLocale =
    currentLocale === 'en' ? (pathname?.includes('/es') ? 'pl' : 'es') : currentLocale === 'es' ? 'pl' : 'en';

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
      await fetch(backendBase + '/api/v1/scrape', { method: 'POST' });
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
          const res = await fetch(backendBase + '/api/v1/scrape/status');
          if (res.ok) {
            const data = await res.json();
            if (data.is_running) {
              const activeSource = data.last_used_source || data.active_source || data.source;
              const sourceInfo = activeSource ? (' - ' + activeSource) : '';
              if ((data.current_step === 'downloading_assets' || data.current_step === 'downloading_icons') && data.total > 0) {
                const pct = Math.round((data.progress / data.total) * 100);
                setSyncStatus(pct + '%' + sourceInfo);
              } else {
                setSyncStatus(data.current_step.replace(/_/g, ' ') + sourceInfo);
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

  interface NavItem {
    id: string;
    label: string;
    icon: any;
    color: string;
    activeBg: string;
    href?: string;
  }

  // Top-Level Main Navigation
  const mainNavItems: NavItem[] = [
    {
      id: 'all',
      label: dict.filters?.allCategories || 'Perks Vault',
      icon: Shield,
      color: 'text-red-500',
      activeBg: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
      href: `/${currentLocale}`,
    },
    {
      id: 'generator',
      label: dict.filters?.generatorTab || 'Perk Randomizer',
      icon: Dices,
      color: 'text-amber-500',
      activeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
      href: `/${currentLocale}?tab=generator`,
    },
    {
      id: 'streaks',
      label: '🔥 Streaks',
      icon: Repeat,
      color: 'text-orange-400',
      activeBg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
      href: `/${currentLocale}/streaks`,
    },
    {
      id: 'challenge',
      label: '⚡ Challenge',
      icon: Swords,
      color: 'text-amber-400',
      activeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      href: `/${currentLocale}/challenge`,
    },
    {
      id: 'maps',
      label: '🗺️ Map Explorer',
      icon: Compass,
      color: 'text-cyan-400',
      activeBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      href: `/${currentLocale}/maps`,
    },
    {
      id: 'items',
      label: '📦 Items & Add-ons',
      icon: Package,
      color: 'text-teal-400',
      activeBg: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
      href: `/${currentLocale}/items`,
    },
    {
      id: 'characters',
      label: '👤 Characters',
      icon: Users,
      color: 'text-indigo-400',
      activeBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      href: `/${currentLocale}/characters`,
    },
    {
      id: 'guesser',
      label: dict.guesser?.navLink ? `🎮 ${dict.guesser.navLink}` : '🎮 Guesser',
      icon: Gamepad2,
      color: 'text-violet-400',
      activeBg: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
      href: `/${currentLocale}/characters/guesser`,
    },
  ];

  // Droppable "Others" Accordion Navigation
  const otherNavItems: NavItem[] = [
    {
      id: 'draft',
      label: '🏆 Draft Room',
      icon: Trophy,
      color: 'text-rose-400',
      activeBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      href: `/${currentLocale}/draft`,
    },
    {
      id: 'swf',
      label: '👥 SWF Planner',
      icon: Users,
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      href: `/${currentLocale}/swf`,
    },
    {
      id: 'killer-calculator',
      label: '🎯 Killer Calc',
      icon: Calculator,
      color: 'text-purple-400',
      activeBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      href: `/${currentLocale}/killer-calculator`,
    },
    {
      id: 'builds',
      label: '🔥 Build Vault',
      icon: Flame,
      color: 'text-red-400',
      activeBg: 'bg-red-500/10 text-red-400 border border-red-500/20',
      href: `/${currentLocale}/builds`,
    },
    {
      id: 'custom-perks',
      label: '🎨 Perk Studio',
      icon: Wand2,
      color: 'text-pink-400',
      activeBg: 'bg-pink-500/10 text-pink-400 border border-pink-500/20',
      href: `/${currentLocale}/custom-perks`,
    },
    {
      id: 'quests',
      label: '📜 Quests',
      icon: Scroll,
      color: 'text-amber-400',
      activeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      href: `/${currentLocale}/quests`,
    },
  ];

  // Auto-expand "Others" accordion if an item inside it is active
  const isOtherActive = otherNavItems.some(
    (item) => activeCategory === item.id || (item.href && pathname?.includes(item.href))
  );

  useEffect(() => {
    if (isOtherActive) {
      setOthersOpen(true);
    }
  }, [isOtherActive]);

  // Calculate Survivor vs Killer distribution percentages
  const safeTotal = survivorCount + killerCount || 1;
  const survivorPct = Math.round((survivorCount / safeTotal) * 100);
  const killerPct = 100 - survivorPct;

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive =
      activeCategory === item.id ||
      (item.href &&
        (item.id === 'characters'
          ? pathname === item.href || pathname === item.href + '/'
          : pathname?.includes(item.href)));

    if (item.href) {
      return (
        <Link
          key={item.id}
          href={item.href}
          aria-current={isActive ? 'page' : undefined}
          onClick={() => {
            setMobileOpen(false);
          }}
          className={
            'w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 ' +
            (isActive
              ? item.activeBg
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900/60')
          }
        >
          <div className="flex items-center gap-3">
            <Icon className={'h-4 w-4 ' + item.color} />
            <span>{item.label}</span>
          </div>
        </Link>
      );
    }

    return (
      <button
        key={item.id}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => {
          if (item.id === 'quests') {
            if (onOpenQuests) onOpenQuests();
          } else if (onSelectCategory) {
            onSelectCategory(item.id);
          }
          setMobileOpen(false);
        }}
        className={
          'w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 ' +
          (isActive
            ? item.activeBg
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900/60')
        }
      >
        <div className="flex items-center gap-3">
          <Icon className={'h-4 w-4 ' + item.color} />
          <span>{item.label}</span>
        </div>
      </button>
    );
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col justify-between p-4 overflow-y-auto">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1 py-2">
          <Link
            href={'/' + currentLocale}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-red-500 rounded-xl"
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
        </div>

        {/* Navigation Tabs */}
        <nav aria-label="Perk Category Navigation" className="mt-5 space-y-1">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Navigation
          </p>

          {/* Main Top-Level Items */}
          {mainNavItems.map(renderNavItem)}

          {/* Droppable "Others" Accordion Group */}
          <div className="pt-1">
            <button
              onClick={() => setOthersOpen(!othersOpen)}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 ${
                isOtherActive
                  ? 'bg-slate-800/80 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Folder className="h-4 w-4 text-cyan-400" />
                <span>Others</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isOtherActive && (
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                )}
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                    othersOpen ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </div>
            </button>

            {/* Nested Sub-Menu List & Vault Stats */}
            {othersOpen && (
              <div className="mt-1 ml-3 pl-2.5 space-y-3 border-l-2 border-slate-800/80">
                <div className="space-y-1">
                  {otherNavItems.map(renderNavItem)}
                </div>

                {/* LIVE VAULT STATS WIDGET */}
                <div className="mt-3 rounded-2xl border border-slate-200/80 bg-slate-100/60 p-3 dark:border-slate-800/80 dark:bg-slate-900/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <Database className="h-3 w-3 text-red-500" />
                      {dict.stats?.vaultStats || 'Vault Statistics'}
                    </span>
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    <div className="rounded-xl border border-slate-200/60 bg-white/80 p-2 dark:border-slate-800/60 dark:bg-slate-950/60">
                      <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                        <Layers className="h-3 w-3" />
                        <span className="text-[10px] font-semibold">{dict.stats?.totalPerks || 'Perks'}</span>
                      </div>
                      <p className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
                        {totalPerksCount}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200/60 bg-white/80 p-2 dark:border-slate-800/60 dark:bg-slate-950/60">
                      <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                        <Users className="h-3 w-3" />
                        <span className="text-[10px] font-semibold">{dict.stats?.characters || 'Cast'}</span>
                      </div>
                      <p className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
                        {characterCount}
                      </p>
                    </div>
                  </div>

                  {/* Survivor vs Killer Ratio Bar */}
                  <div className="space-y-1 pt-0.5">
                    <div className="flex justify-between text-[10px] font-extrabold">
                      <span className="text-emerald-500 flex items-center gap-1">
                        <Shield className="h-2.5 w-2.5" /> {survivorCount}
                      </span>
                      <span className="text-slate-400 text-[9px] font-normal">{dict.stats?.ratio || 'Ratio'}</span>
                      <span className="text-rose-500 flex items-center gap-1">
                        {killerCount} <Skull className="h-2.5 w-2.5" />
                      </span>
                    </div>

                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        style={{ width: survivorPct + '%' }}
                        className="bg-emerald-500 transition-all duration-500"
                        title={'Survivors: ' + survivorPct + '%'}
                      />
                      <div
                        style={{ width: killerPct + '%' }}
                        className="bg-rose-500 transition-all duration-500"
                        title={'Killers: ' + killerPct + '%'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Sidebar Footer Controls */}
      <div className="space-y-2.5 pt-3 mt-3 border-t border-slate-200/80 dark:border-slate-800/80">
        {showSuccessToast && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Sync Successful!</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="flex-1 flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-3 text-xs font-bold text-white shadow-md shadow-red-900/20 hover:from-red-500 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60 transition-all cursor-pointer min-w-0"
          >
            <RefreshCw className={'h-3.5 w-3.5 shrink-0 ' + (isSyncing ? 'animate-spin' : '')} />
            <span className="truncate">{isSyncing ? (dict.app.syncing + ' (' + syncStatus + ')') : dict.app.syncWiki}</span>
          </button>
          <button
            onClick={() => setIsConfigOpen(true)}
            title="Scraper Settings"
            aria-label="Scraper Settings"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100/50 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 hover:rotate-45 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={redirectedPathName(toggleLocale)}
            aria-label="Switch Language"
            className="flex h-8 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/50 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <Languages className="h-3.5 w-3.5 text-red-500" />
            <span className="uppercase">{toggleLocale}</span>
          </Link>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle Dark Mode"
            className="flex h-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-100/50 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
            <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-slate-300" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── DESKTOP ASIDE SIDEBAR WITH INTEGRATED DRAWER KNOB HANDLE ── */}
      <aside
        aria-label="Sidebar Navigation"
        className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 transition-transform duration-300 ${
          isCollapsed ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        {renderSidebarContent()}

        {/* ── SINGLE UNIFIED DRAWER KNOB HANDLE (STAYS ATTACHED TO SIDEBAR RIGHT BORDER) ── */}
        <button
          onClick={toggleSidebar}
          title={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
          aria-label={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
          className="hidden lg:flex absolute top-1/2 -right-6 -translate-y-1/2 h-16 w-6 items-center justify-center rounded-r-2xl border border-l-0 border-slate-700/80 bg-slate-900/95 text-cyan-400 shadow-2xl shadow-slate-950/90 backdrop-blur-xl hover:bg-slate-800 hover:w-7 hover:text-cyan-300 active:scale-95 transition-all duration-200 cursor-pointer z-50 group"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform" />
          )}
        </button>
      </aside>

      {/* ── MOBILE HEADER & DRAWER ── */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 lg:hidden">
        <Link href={'/' + currentLocale} className="flex items-center gap-2.5">
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
            {renderSidebarContent()}
          </div>
        </div>
      )}

      <ScraperConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
    </>
  );
};
