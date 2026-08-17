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
  Menu,
  X,
  Database,
  Users,
  Trophy,
  Scroll,
  Calculator,
  Wand2,
  Compass,
  Package,
  Repeat,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Folder,
  Gamepad2,
  LogIn,
  LogOut,
  Crown,
} from 'lucide-react';
import { useSidebarState } from '@/hooks/useSidebarState';
import { LemonIcon } from './LemonIcon';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from './AuthModal';

interface SidebarProps {
  currentLocale: string;
  dict: any;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
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
  onOpenQuests,
  totalPerksCount = 0,
  survivorCount = 0,
  killerCount = 0,
  characterCount = 0,
}) => {
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebarState();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [othersOpen, setOthersOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const toggleLocale =
    currentLocale === 'en' ? (pathname?.includes('/es') ? 'pl' : 'es') : currentLocale === 'es' ? 'pl' : 'en';

  const redirectedPathName = (locale: string) => {
    if (!pathname) return '/';
    const segments = pathname.split('/');
    segments[1] = locale;
    return segments.join('/');
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

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
      label: '🔥 Challenges',
      icon: Repeat,
      color: 'text-orange-400',
      activeBg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
      href: `/${currentLocale}/streaks`,
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
  ];

  // Droppable "Others" Accordion Navigation (Visible only to Admins)
  const otherNavItems: NavItem[] = [
    {
      id: 'guesser',
      label: dict.guesser?.navLink ? `🎮 ${dict.guesser.navLink}` : '🎮 Guesser',
      icon: Gamepad2,
      color: 'text-violet-400',
      activeBg: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
      href: `/${currentLocale}/characters/guesser`,
    },
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
    if (isOtherActive && isAdmin) {
      setOthersOpen(true);
    }
  }, [isOtherActive, isAdmin]);

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
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-slate-200')
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
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-slate-200')
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
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-xl"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 via-red-950/20 to-slate-100 dark:to-slate-900 border border-amber-500/30 text-slate-900 dark:text-white shadow-md group-hover:scale-105 transition-transform p-1.5">
              <LemonIcon className="h-7 w-7" />
            </div>
            <div>
              <span className="font-black text-base tracking-wider text-slate-900 dark:text-slate-100 font-mono">
                LemonDBD
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Tabs */}
        <nav aria-label="Perk Category Navigation" className="mt-5 space-y-1">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Navigation
          </p>

          {/* Main Top-Level Items (Visible to All Users) */}
          {mainNavItems.map(renderNavItem)}

          {/* Droppable "Others" Accordion Group (Visible Only to Admins) */}
          {isAdmin && (
            <div className="pt-1">
              <button
                onClick={() => setOthersOpen(!othersOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 ${isOtherActive
                    ? 'bg-cyan-500/10 text-cyan-600 border border-cyan-500/30 dark:bg-slate-800/80 dark:text-cyan-400'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-slate-200'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Folder className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
                  <span className="flex items-center gap-1.5">
                    <span>Others</span>
                    <span className="rounded bg-amber-500/10 px-1 py-0.2 text-[9px] font-extrabold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      ADMIN
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isOtherActive && (
                    <span className="h-2 w-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
                  )}
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${othersOpen ? 'rotate-180' : 'rotate-0'
                      }`}
                  />
                </div>
              </button>

              {/* Nested Sub-Menu List & Vault Stats */}
              {othersOpen && (
                <div className="mt-1 ml-3 pl-2.5 space-y-3 border-l-2 border-slate-200 dark:border-slate-800/80">
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
          )}
        </nav>

        {/* User Account / Login Button Section */}
        <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
          {!isAuthenticated || !user ? (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-red-600/10 border border-amber-500/30 hover:border-amber-500/60 p-2.5 text-xs font-bold text-amber-500 dark:text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer shadow-sm group"
            >
              <LogIn className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              <span>Sign In / Register</span>
            </button>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-100/60 dark:border-slate-800/80 dark:bg-slate-900/60 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <Link
                  href={`/${currentLocale}/user`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400">
                    <LemonIcon className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {user.username}
                    </p>
                    <span
                      className={`inline-block rounded px-1 text-[9px] font-black uppercase tracking-wider ${user.role === 'admin'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        }`}
                    >
                      {user.role}
                    </span>
                  </div>
                </Link>

                <div className="flex items-center gap-1">
                  {isAdmin && (
                    <Link
                      href={`/${currentLocale}/admin`}
                      title="Admin Control Center"
                      onClick={() => setMobileOpen(false)}
                      className="p-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Crown className="h-4 w-4" />
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer Controls */}
      <div className="space-y-2.5 pt-3 mt-3 border-t border-slate-200/80 dark:border-slate-800/80">
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
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle Dark Mode"
            className="flex h-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-100/50 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isMounted && resolvedTheme === 'dark' ? (
              <Moon className="h-3.5 w-3.5 text-slate-300" />
            ) : (
              <Sun className="h-3.5 w-3.5 text-amber-500" />
            )}
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
        className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 transition-transform duration-300 ${isCollapsed ? '-translate-x-full' : 'translate-x-0'
          }`}
      >
        {renderSidebarContent()}

        {/* ── SINGLE UNIFIED DRAWER KNOB HANDLE (STAYS ATTACHED TO SIDEBAR RIGHT BORDER) ── */}
        <button
          onClick={toggleSidebar}
          title={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
          aria-label={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
          className="hidden lg:flex absolute top-1/2 -right-6 -translate-y-1/2 h-16 w-6 items-center justify-center rounded-r-2xl border border-l-0 border-slate-200 bg-white/95 text-slate-700 shadow-md hover:bg-slate-100 hover:w-7 hover:text-cyan-600 dark:border-slate-700/80 dark:bg-slate-900/95 dark:text-cyan-400 dark:shadow-2xl dark:shadow-slate-950/90 dark:hover:bg-slate-800 dark:hover:text-cyan-300 active:scale-95 transition-all duration-200 cursor-pointer z-50 group"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
          )}
        </button>
      </aside>

      {/* ── MOBILE HEADER & DRAWER ── */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 lg:hidden">
        <Link href={'/' + currentLocale} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/30 text-white p-1">
            <LemonIcon className="h-6 w-6" />
          </div>
          <span className="font-extrabold text-sm tracking-wider font-mono text-slate-900 dark:text-slate-100">
            LemonDBD
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

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};
