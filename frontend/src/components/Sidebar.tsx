// frontend/src/components/Sidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useParams } from 'next/navigation';
import {
  Flame,
  Shield,
  Dices,
  Menu,
  X,
  Users,
  Trophy,
  Scroll,
  Calculator,
  Wand2,
  Compass,
  Repeat,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Folder,
  Gamepad2,
  Heart,
} from 'lucide-react';
import { useSidebarState } from '@/hooks/useSidebarState';
import { LemonIcon } from './LemonIcon';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from './AuthModal';
import { BugReportModal } from './sidebar/BugReportModal';
import { BuyCoffeeModal } from './sidebar/BuyCoffeeModal';
import { SidebarNavLink } from './sidebar/SidebarNavLink';
import { SidebarStatsCard } from './sidebar/SidebarStatsCard';
import { SidebarUserSection } from './sidebar/SidebarUserSection';
import { SidebarBottomControls } from './sidebar/SidebarBottomControls';
import { i18n, type Locale } from '@/i18n/config';

interface SidebarProps {
  currentLocale?: string;
  dict: any;
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
  onOpenQuests?: () => void;
  totalPerksCount?: number;
  survivorCount?: number;
  killerCount?: number;
  characterCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentLocale: propLocale,
  dict,
  activeCategory,
  onSelectCategory,
  onOpenQuests,
  totalPerksCount = 0,
  survivorCount = 0,
  killerCount = 0,
  characterCount = 0,
}) => {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const params = useParams();
  const currentTab = searchParams?.get('tab');

  // Safe fallback resolution for locale
  const routeLocale = (params?.locale as string) || pathname.split('/')[1];
  const currentLocale = (
    i18n.locales.includes(propLocale as Locale)
      ? propLocale
      : i18n.locales.includes(routeLocale as Locale)
      ? routeLocale
      : i18n.defaultLocale
  ) as string;

  const { isCollapsed, toggleSidebar } = useSidebarState();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [coffeeModalOpen, setCoffeeModalOpen] = useState(false);
  const [othersOpen, setOthersOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  const checkIsActive = (itemId: string, itemHref?: string): boolean => {
    if (!pathname) return false;

    // Perk Randomizer: ONLY active when on /perks with tab=generator
    if (itemId === 'generator') {
      return (
        activeCategory === 'generator' ||
        (pathname.startsWith(`/${currentLocale}/perks`) && currentTab === 'generator')
      );
    }

    // Perks: active on /perks only when tab is NOT generator
    if (itemId === 'perks') {
      if (activeCategory === 'generator' || currentTab === 'generator') {
        return false;
      }
      return (
        activeCategory === 'perks' ||
        activeCategory === 'Survivor' ||
        activeCategory === 'Killer' ||
        pathname === `/${currentLocale}/perks` ||
        pathname.startsWith(`/${currentLocale}/perks`)
      );
    }

    if (itemId === 'characters') {
      return (
        activeCategory === 'characters' ||
        pathname === `/${currentLocale}/characters` ||
        pathname === `/${currentLocale}/characters/` ||
        (pathname.startsWith(`/${currentLocale}/characters/`) &&
          !pathname.includes('/guesser'))
      );
    }

    if (itemId === 'smash-or-pass') {
      return (
        activeCategory === 'smash-or-pass' ||
        pathname.startsWith(`/${currentLocale}/smash-or-pass`)
      );
    }

    if (activeCategory === itemId) return true;

    if (itemHref) {
      return pathname.startsWith(itemHref);
    }

    return false;
  };

  const mainNavItems = [
    {
      id: 'perks',
      label: dict?.filters?.perks || dict?.sidebar?.perks || 'Perks',
      icon: Shield,
      color: 'text-red-500',
      activeBg:
        'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
      href: `/${currentLocale}/perks`,
    },
    {
      id: 'generator',
      label:
        dict?.filters?.generatorTab ||
        dict?.generator?.title ||
        'Perk Randomizer',
      icon: Dices,
      color: 'text-amber-500',
      activeBg:
        'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
      href: `/${currentLocale}/perks?tab=generator`,
    },
    {
      id: 'streaks',
      label: dict?.sidebar?.challenges || '🔥 Challenges',
      icon: Repeat,
      color: 'text-orange-400',
      activeBg:
        'bg-orange-500/10 text-orange-400 border border-orange-500/20',
      href: `/${currentLocale}/streaks`,
    },
    {
      id: 'maps',
      label: dict?.sidebar?.mapExplorer || '🗺️ Map Explorer',
      icon: Compass,
      color: 'text-cyan-400',
      activeBg:
        'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      href: `/${currentLocale}/maps`,
    },
    {
      id: 'characters',
      label: dict?.sidebar?.characters || '👤 Characters',
      icon: Users,
      color: 'text-indigo-400',
      activeBg:
        'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      href: `/${currentLocale}/characters`,
    },
  ];

  const otherNavItems = [
    {
      id: 'smash-or-pass',
      label: dict?.sidebar?.smashOrPass || '💋 Smash or Pass',
      icon: Heart,
      color: 'text-pink-400',
      activeBg:
        'bg-pink-500/10 text-pink-400 border border-pink-500/20',
      href: `/${currentLocale}/smash-or-pass`,
    },
    {
      id: 'guesser',
      label: dict?.guesser?.navLink ? `🎮 ${dict.guesser.navLink}` : '🎮 Guesser',
      icon: Gamepad2,
      color: 'text-violet-400',
      activeBg:
        'bg-violet-500/10 text-violet-400 border border-violet-500/20',
      href: `/${currentLocale}/characters/guesser`,
    },
    {
      id: 'draft',
      label: dict?.sidebar?.draftRoom || '🏆 Draft Room',
      icon: Trophy,
      color: 'text-rose-400',
      activeBg:
        'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      href: `/${currentLocale}/draft`,
    },
    {
      id: 'swf',
      label: dict?.sidebar?.swfPlanner || '👥 SWF Planner',
      icon: Users,
      color: 'text-emerald-400',
      activeBg:
        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      href: `/${currentLocale}/swf`,
    },
    {
      id: 'killer-calculator',
      label: dict?.sidebar?.killerCalc || '🎯 Killer Calc',
      icon: Calculator,
      color: 'text-purple-400',
      activeBg:
        'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      href: `/${currentLocale}/killer-calculator`,
    },
    {
      id: 'builds',
      label: dict?.sidebar?.buildVault || '🔥 Build Vault',
      icon: Flame,
      color: 'text-red-400',
      activeBg:
        'bg-red-500/10 text-red-400 border border-red-500/20',
      href: `/${currentLocale}/builds`,
    },
    {
      id: 'custom-perks',
      label: dict?.sidebar?.perkStudio || '🎨 Perk Studio',
      icon: Wand2,
      color: 'text-pink-400',
      activeBg:
        'bg-pink-500/10 text-pink-400 border border-pink-500/20',
      href: `/${currentLocale}/custom-perks`,
    },
    {
      id: 'quests',
      label: dict?.sidebar?.quests || '📜 Quests',
      icon: Scroll,
      color: 'text-amber-400',
      activeBg:
        'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      href: `/${currentLocale}/quests`,
    },
  ];

  const isOtherActive = otherNavItems.some((item) =>
    checkIsActive(item.id, item.href)
  );

  useEffect(() => {
    if (isOtherActive && isAdmin) {
      setOthersOpen(true);
    }
  }, [isOtherActive, isAdmin]);

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col justify-between p-4 overflow-y-auto">
      <div>
        {/* Brand Header: Navigates to Landing Page */}
        <div className="flex items-center justify-between px-1 py-2">
          <Link
            href={`/${currentLocale}`}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-xl"
            aria-label="LemonDBD Home"
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

        {/* Navigation */}
        <nav aria-label="Main Navigation" className="mt-5 space-y-1">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Navigation
          </p>

          {mainNavItems.map((item) => (
            <SidebarNavLink
              key={item.id}
              id={item.id}
              label={item.label}
              icon={item.icon}
              color={item.color}
              activeBg={item.activeBg}
              href={item.href}
              isActive={checkIsActive(item.id, item.href)}
              onClick={() => {
                setMobileOpen(false);
              }}
            />
          ))}

          {/* Admin "Others" Accordion Group */}
          {isAdmin && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setOthersOpen(!othersOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  isOtherActive
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
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                      othersOpen ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                </div>
              </button>

              {othersOpen && (
                <div className="mt-1 ml-3 pl-2.5 space-y-3 border-l-2 border-slate-200 dark:border-slate-800/80">
                  <div className="space-y-1">
                    {otherNavItems.map((item) => (
                      <SidebarNavLink
                        key={item.id}
                        id={item.id}
                        label={item.label}
                        icon={item.icon}
                        color={item.color}
                        activeBg={item.activeBg}
                        href={item.href}
                        isActive={checkIsActive(item.id, item.href)}
                        onClick={() => {
                          if (item.id === 'quests' && onOpenQuests) {
                            onOpenQuests();
                          }
                          setMobileOpen(false);
                        }}
                      />
                    ))}
                  </div>

                  <SidebarStatsCard
                    dict={dict}
                    totalPerksCount={totalPerksCount}
                    survivorCount={survivorCount}
                    killerCount={killerCount}
                    characterCount={characterCount}
                  />
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User Account / Login */}
        <SidebarUserSection
          currentLocale={currentLocale}
          user={user}
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
          onOpenAuthModal={() => setAuthModalOpen(true)}
          onLogout={logout}
          onNavigateMobile={() => setMobileOpen(false)}
        />
      </div>

      {/* Language, Theme, Bug Report & Buy Coffee */}
      <SidebarBottomControls
        currentLocale={currentLocale}
        onOpenBugModal={() => {
          setBugModalOpen(true);
          setMobileOpen(false);
        }}
        onOpenCoffeeModal={() => {
          setCoffeeModalOpen(true);
          setMobileOpen(false);
        }}
      />
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        aria-label="Sidebar Navigation"
        className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 transition-transform duration-300 ${
          isCollapsed ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        {renderSidebarContent()}

        <button
          type="button"
          onClick={toggleSidebar}
          title={
            isCollapsed
              ? 'Expand Navigation Sidebar'
              : 'Collapse Navigation Sidebar'
          }
          aria-label={
            isCollapsed
              ? 'Expand Navigation Sidebar'
              : 'Collapse Navigation Sidebar'
          }
          className="hidden lg:flex absolute top-1/2 -right-6 -translate-y-1/2 h-16 w-6 items-center justify-center rounded-r-2xl border border-l-0 border-slate-200 bg-white/95 text-slate-700 shadow-md hover:bg-slate-100 hover:w-7 hover:text-cyan-600 dark:border-slate-700/80 dark:bg-slate-900/95 dark:text-cyan-400 dark:shadow-2xl dark:shadow-slate-950/90 dark:hover:bg-slate-800 dark:hover:text-cyan-300 active:scale-95 transition-all duration-200 cursor-pointer z-50 group"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
          )}
        </button>
      </aside>

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 lg:hidden">
        <Link
          href={`/${currentLocale}`}
          className="flex items-center gap-2.5"
          aria-label="LemonDBD Home"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/30 text-white p-1">
            <LemonIcon className="h-6 w-6" />
          </div>
          <span className="font-extrabold text-sm tracking-wider font-mono text-slate-900 dark:text-slate-100">
            LemonDBD
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-expanded={mobileOpen}
          aria-label="Open Navigation Drawer"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 animate-in slide-in-from-left duration-200">
            <button
              type="button"
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

      {/* Global Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
      <BugReportModal
        isOpen={bugModalOpen}
        onClose={() => setBugModalOpen(false)}
      />
      <BuyCoffeeModal
        isOpen={coffeeModalOpen}
        onClose={() => setCoffeeModalOpen(false)}
      />
    </>
  );
};

