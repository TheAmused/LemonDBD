'use client';
// frontend/src/components/Sidebar.tsx

import type { Dictionary } from '@/locales/types';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  Sparkles,
  Dices,
  Menu,
  X,
  Users,
  Trophy,
  Compass,
  Swords,
  ChevronLeft,
  ChevronRight,
  Heart,
} from 'lucide-react';
import { useSidebarState } from '@/hooks/useSidebarState';
import { LemonIcon } from './LemonIcon';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';
import { SidebarNavLink } from './sidebar/SidebarNavLink';
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
  totalPerksCount?: number;
  survivorCount?: number;
  killerCount?: number;
  characterCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentLocale: propLocale,
  dict,
  activeCategory,
  totalPerksCount,
  survivorCount,
  killerCount,
  characterCount,
}) => {
  const pathname = usePathname() || '';
  const params = useParams();

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
        pathname.startsWith(`/${currentLocale}/characters/`)
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

  const mainNavItems = useMemo(() => [
    {
      id: 'perks',
      label: dict?.filters?.perks || dict?.sidebar?.perks || 'Perks',
      icon: Sparkles,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/perks`,
    },
    {
      id: 'generator',
      label: dict?.filters?.generatorTab || dict?.generator?.title || 'Randomizer',
      icon: Dices,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/randomizer`,
    },
    {
      id: 'streaks',
      label: dict?.sidebar?.challenges || 'Challenges',
      icon: Swords,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/streaks`,
    },
    {
      id: 'maps',
      label: dict?.sidebar?.mapExplorer || 'Maps',
      icon: Compass,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/maps`,
    },
    {
      id: 'characters',
      label: dict?.sidebar?.characters || 'Characters',
      icon: Users,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/characters`,
    },
    {
      id: 'smash-or-pass',
      label: dict?.sidebar?.smashOrPass || 'Smash or Pass',
      icon: Heart,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/smash-or-pass`,
    },
    {
      id: 'trophies',
      label: dict?.sidebar?.trophies || 'Trophies',
      icon: Trophy,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/achievements`,
    },
  ], [dict, currentLocale]);



  const renderSidebarContent = () => (
    <div className="flex h-full flex-col justify-between p-4 overflow-y-auto">
      <div>
        <div className="flex items-center justify-between px-1 py-2">
          <Link
            href={`/${currentLocale}`}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-accent-red rounded-xl"
            aria-label={dict?.sidebar?.homeAria || 'Home'}
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-accent-red/15 border border-accent-red/30 text-text-primary shadow-xs group-hover:scale-105 transition-transform p-1.5">
              <LemonIcon className="h-7 w-7" />
            </div>
            <div>
              <span className="font-black text-base tracking-wider text-text-primary font-mono">
                {dict?.app?.title || 'LemonDBD'}
              </span>
            </div>
          </Link>

          <WhatsNewLauncher dict={dict} />
        </div>

        <nav aria-label={dict?.sidebar?.navAria || 'Navigation'} className="mt-5 space-y-1">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-text-muted mb-2">
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
              isActive={checkIsActive(item.id, item.href)}
              onClick={closeMobile}
            />
          ))}
        </nav>

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
      <aside
        aria-label={dict?.sidebar?.navAria || 'Sidebar'}
        className="lemon-shell-aside hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col border-r border-border-color bg-bg-surface backdrop-blur-xl transition-transform duration-300"
      >
        {renderSidebarContent()}

        <button
          type="button"
          onClick={toggleSidebar}
          title={dict?.sidebar?.toggleSidebar || 'Toggle Sidebar'}
          aria-label={dict?.sidebar?.toggleSidebar || 'Toggle Sidebar'}
          aria-expanded={!isCollapsed}
          className="hidden lg:flex absolute top-1/2 -right-6 -translate-y-1/2 h-16 w-6 items-center justify-center rounded-r-2xl border border-l-0 border-border-color bg-bg-surface text-text-primary shadow-md hover:bg-bg-elevated hover:w-7 hover:text-accent-red active:scale-95 transition-all duration-200 cursor-pointer z-50 group"
        >
          <ChevronRight
            aria-hidden="true"
            className="lemon-sidebar-icon-collapsed h-5 w-5 text-accent-red group-hover:scale-110 transition-transform"
          />
          <ChevronLeft
            aria-hidden="true"
            className="lemon-sidebar-icon-expanded h-5 w-5 text-accent-red group-hover:scale-110 transition-transform"
          />
        </button>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-color bg-bg-surface px-4 backdrop-blur-xl lg:hidden">
        <Link
          href={`/${currentLocale}`}
          className="flex items-center gap-2.5"
          aria-label={dict?.sidebar?.homeAria || 'Home'}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-red/15 border border-accent-red/30 text-text-primary p-1">
            <LemonIcon className="h-6 w-6" />
          </div>
          <span className="font-extrabold text-sm tracking-wider font-mono text-text-primary">
            {dict?.app?.title || 'LemonDBD'}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <WhatsNewLauncher dict={dict} />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-label={dict?.sidebar?.openDrawer || 'Open Drawer'}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-color text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-bg-primary/60 backdrop-blur-sm animate-in fade-in duration-200"
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] border-r border-border-color bg-bg-surface shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label={dict?.sidebar?.closeDrawer || 'Close Drawer'}
              className="absolute right-3 top-3 rounded-full p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            {renderSidebarContent()}
          </div>
        </div>
      )}

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

