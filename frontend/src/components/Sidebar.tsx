'use client';
// frontend/src/components/Sidebar.tsx
import type { Dictionary } from '@/locales/types';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  Flame,
  Sparkles,
  Dices,
  Menu,
  X,
  Users,
  Trophy,
  Scroll,
  Calculator,
  Wand2,
  Compass,
  Swords,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Folder,
  Gamepad2,
  Heart,
} from 'lucide-react';
import { useSidebarState } from '@/hooks/useSidebarState';
import { useVaultStats } from '@/context/VaultStatsContext';
import { LemonIcon } from './LemonIcon';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';
import { SidebarNavLink } from './sidebar/SidebarNavLink';
import { SidebarStatsCard } from './sidebar/SidebarStatsCard';
import { SidebarUserSection } from './sidebar/SidebarUserSection';
import { SidebarBottomControls } from './sidebar/SidebarBottomControls';
import { i18n, type Locale } from '@/i18n/config';
import { WhatsNewLauncher } from '@/components/changelog/WhatsNewLauncher';

const AuthModal = dynamic(() => import('./AuthModal').then((m) => m.AuthModal), { ssr: false });
const BugReportModal = dynamic(
  () => import('./sidebar/BugReportModal').then((m) => m.BugReportModal),
  { ssr: false }
);
const BuyCoffeeModal = dynamic(
  () => import('./sidebar/BuyCoffeeModal').then((m) => m.BuyCoffeeModal),
  { ssr: false }
);

interface SidebarProps {
  currentLocale?: string;
  dict: Dictionary;
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
  onOpenQuests?: () => void;
  /**
   * Vault-stat overrides. Pages that already hold the full perk list (e.g.
   * /perks, /randomizer) pass their own numbers; everyone else omits these and
   * gets the shared, fetched-once values from VaultStatsContext.
   */
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
  totalPerksCount,
  survivorCount,
  killerCount,
  characterCount,
}) => {
  // Fetched once for the whole app instead of once per page. Fifteen files used
  // to run `perks?limit=1000` in their own effect purely to fill this card.
  const vaultStats = useVaultStats();
  const stats = {
    totalPerksCount: totalPerksCount ?? vaultStats.totalPerksCount,
    survivorCount: survivorCount ?? vaultStats.survivorCount,
    killerCount: killerCount ?? vaultStats.killerCount,
    characterCount: characterCount ?? vaultStats.characterCount,
  };
  const pathname = usePathname() || '';
  const params = useParams();

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
  const [authModalIntent, setAuthModalIntent] = useState<'login' | 'verify'>('login');
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [coffeeModalOpen, setCoffeeModalOpen] = useState(false);
  const [othersOpen, setOthersOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMobileOpen((open) => (open ? false : open));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const checkIsActive = useCallback((itemId: string, itemHref?: string): boolean => {
    if (!pathname) return false;

    // Perk Randomizer: its own route now, not a tab on /perks
    if (itemId === 'generator') {
      return (
        activeCategory === 'generator' ||
        pathname.startsWith(`/${currentLocale}/randomizer`)
      );
    }

    if (itemId === 'perks') {
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
  }, [pathname, currentLocale, activeCategory]);

  // The nav arrays are ~15 object literals with icon refs and class strings.
  // They were rebuilt on every render -- including every keystroke elsewhere on
  // the page, since this component re-renders with its parent -- and handed to
  // memoised children as fresh props, defeating the memoisation. They only
  // actually depend on the dictionary and the locale.
  const mainNavItems = useMemo(() => [
    {
      id: 'perks',
      label: dict?.filters?.perks || dict?.sidebar?.perks || 'Perks',
      icon: Sparkles,
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
      href: `/${currentLocale}/randomizer`,
    },
    {
      id: 'streaks',
      label: dict?.sidebar?.challenges || 'Challenges',
      icon: Swords,
      color: 'text-orange-400',
      activeBg:
        'bg-orange-500/10 text-orange-400 border border-orange-500/20',
      href: `/${currentLocale}/streaks`,
    },
    {
      id: 'maps',
      label: dict?.sidebar?.mapExplorer || 'Map Explorer',
      icon: Compass,
      color: 'text-cyan-400',
      activeBg:
        'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      href: `/${currentLocale}/maps`,
    },
    {
      id: 'characters',
      label: dict?.sidebar?.characters || 'Characters',
      icon: Users,
      color: 'text-indigo-400',
      activeBg:
        'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      href: `/${currentLocale}/characters`,
    },
    {
      id: 'smash-or-pass',
      label: dict?.sidebar?.smashOrPass || 'Smash or Pass',
      icon: Heart,
      color: 'text-pink-400',
      activeBg:
        'bg-pink-500/10 text-pink-400 border border-pink-500/20',
      href: `/${currentLocale}/smash-or-pass`,
    },
    {
      id: 'trophies',
      label: dict?.sidebar?.trophies || 'Trophies',
      icon: Trophy,
      color: 'text-yellow-500',
      activeBg:
        'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
      // No destination page yet -- renders as an inert "Soon" badge below.
      href: undefined,
      comingSoon: true,
    },
  ], [dict, currentLocale]);

  // Admin-only group; memoised for the same reason as above.
  const otherNavItems = useMemo(() => [
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
  ], [dict, currentLocale]);

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
            aria-label={dict?.sidebar?.homeAria || 'LemonDBD Home'}
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 via-red-950/20 to-slate-100 dark:to-slate-900 border border-amber-500/30 text-slate-900 dark:text-white shadow-md group-hover:scale-105 transition-transform p-1.5">
              <LemonIcon className="h-7 w-7" />
            </div>
            <div>
              <span className="font-black text-base tracking-wider text-slate-900 dark:text-slate-100 font-mono">
                {dict?.app?.title || 'LemonDBD'}
              </span>
            </div>
          </Link>

          <WhatsNewLauncher dict={dict} />
        </div>

        {/* Navigation */}
        <nav aria-label={dict?.sidebar?.navAria || 'Main Navigation'} className="mt-5 space-y-1">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            {dict?.sidebar?.navigation || 'Navigation'}
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
              isActive={!item.comingSoon && checkIsActive(item.id, item.href)}
              badge={item.comingSoon ? (dict?.sidebar?.soon || 'Soon') : undefined}
              badgeColor="bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20"
              onClick={item.comingSoon ? undefined : closeMobile}
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
                    <span>{dict?.sidebar?.others || 'Others'}</span>
                    <span className="rounded bg-amber-500/10 px-1 py-0.2 text-[9px] font-extrabold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {dict?.sidebar?.admin || 'ADMIN'}
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
                    totalPerksCount={stats.totalPerksCount}
                    survivorCount={stats.survivorCount}
                    killerCount={stats.killerCount}
                    characterCount={stats.characterCount}
                  />
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User Account / Login */}
        <SidebarUserSection
          currentLocale={currentLocale}
          dict={dict}
          user={user}
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
          onOpenAuthModal={() => {
            setAuthModalIntent('login');
            setAuthModalOpen(true);
          }}
          onOpenVerifyModal={() => {
            setAuthModalIntent('verify');
            setAuthModalOpen(true);
          }}
          onLogout={logout}
          onNavigateMobile={() => setMobileOpen(false)}
        />
      </div>

      {/* Language, Theme, Bug Report & Buy Coffee */}
      <SidebarBottomControls
        currentLocale={currentLocale}
        dict={dict}
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
        aria-label={dict?.sidebar?.navAria || 'Sidebar Navigation'}
        className="lemon-shell-aside hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 transition-transform duration-300"
      >
        {renderSidebarContent()}

        {/* The label is deliberately state-independent: the collapsed state is
            applied to the DOM before hydration, so a state-derived label would
            mismatch on the first render. One label true in both states avoids that. */}
        <button
          type="button"
          onClick={toggleSidebar}
          title={dict?.sidebar?.toggleSidebar || 'Toggle Navigation Sidebar'}
          aria-label={dict?.sidebar?.toggleSidebar || 'Toggle Navigation Sidebar'}
          aria-expanded={!isCollapsed}
          className="hidden lg:flex absolute top-1/2 -right-6 -translate-y-1/2 h-16 w-6 items-center justify-center rounded-r-2xl border border-l-0 border-slate-200 bg-white/95 text-slate-700 shadow-md hover:bg-slate-100 hover:w-7 hover:text-cyan-600 dark:border-slate-700/80 dark:bg-slate-900/95 dark:text-cyan-400 dark:shadow-2xl dark:shadow-slate-950/90 dark:hover:bg-slate-800 dark:hover:text-cyan-300 active:scale-95 transition-all duration-200 cursor-pointer z-50 group"
        >
          {/* Both are rendered; globals.css shows the right one from the
              pre-paint `data-sidebar` attribute, so the chevron is correct on
              the first frame instead of flipping after hydration. */}
          <ChevronRight
            aria-hidden="true"
            className="lemon-sidebar-icon-collapsed h-5 w-5 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform"
          />
          <ChevronLeft
            aria-hidden="true"
            className="lemon-sidebar-icon-expanded h-5 w-5 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform"
          />
        </button>
      </aside>

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 lg:hidden">
        <Link
          href={`/${currentLocale}`}
          className="flex items-center gap-2.5"
          aria-label={dict?.sidebar?.homeAria || 'LemonDBD Home'}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/30 text-white p-1">
            <LemonIcon className="h-6 w-6" />
          </div>
          <span className="font-extrabold text-sm tracking-wider font-mono text-slate-900 dark:text-slate-100">
            {dict?.app?.title || 'LemonDBD'}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <WhatsNewLauncher dict={dict} />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-label={dict?.sidebar?.openDrawer || 'Open Navigation Drawer'}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
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
              aria-label={dict?.sidebar?.closeDrawer || 'Close Navigation Drawer'}
              className="absolute right-3 top-3 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Global Modals -- mounted on demand, see the dynamic() imports above. */}
      {authModalOpen && (
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          verifyEmailFor={authModalIntent === 'verify' ? user?.email : undefined}
          dict={dict}
        />
      )}
      {bugModalOpen && (
        <BugReportModal
          isOpen={bugModalOpen}
          onClose={() => setBugModalOpen(false)}
          dict={dict}
        />
      )}
      {coffeeModalOpen && (
        <BuyCoffeeModal
          isOpen={coffeeModalOpen}
          onClose={() => setCoffeeModalOpen(false)}
          dict={dict}
        />
      )}
    </>
  );
};

