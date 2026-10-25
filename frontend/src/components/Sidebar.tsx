'use client';
// frontend/src/components/Sidebar.tsx

import { Modal } from '@/components/common/Modal';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Info,
  LayoutList,
  Gamepad2,
  Settings,
} from 'lucide-react';
import { useSidebarState } from '@/hooks/useSidebarState';
import { LemonIcon } from './LemonIcon';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';
import { SidebarNavLink } from './sidebar/SidebarNavLink';
import { adminOnlyPageFromPathname } from '@/utils/adminOnlyPages';
import { SidebarUserSection } from './sidebar/SidebarUserSection';
import { SidebarBottomControls } from './sidebar/SidebarBottomControls';
import { i18n } from '@/i18n/config';
import { WhatsNewLauncher } from '@/components/changelog/WhatsNewLauncher';
import { useChangelogFeed } from '@/components/changelog/useChangelogFeed';
import { PerkHexIcon, BloodwebIcon, RiftPortalIcon, RealmMapIcon, MaskIcon, AdeptBadgeIcon } from '@/components/icons/DbdIcons';

import { tip } from '@/components/common/Tooltip';
import { Button } from '@/components/common/Button';
import { useDictionary, useLocale } from "@/context/DictionaryContext";
import { IconTile } from '@/components/common/IconTile';
import { TileButton } from "@/components/common/TileButton";

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
}

export const Sidebar: React.FC<SidebarProps> = ({ currentLocale: propLocale }) => {
  const dict = useDictionary();
  const pathname = usePathname() || '';
  const activeLocale = useLocale();
  const currentLocale = propLocale || activeLocale;
const { isCollapsed, toggleSidebar } = useSidebarState();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  // One fetch for both launchers (desktop sidebar and mobile header).
  const changelogFeed = useChangelogFeed();

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

  // Active state comes from the URL alone: AppShell keeps this sidebar mounted across pages, so there is
  // no page left to tell it which section it is in.
  const checkIsActive = useCallback((itemHref: string): boolean => (
    !!pathname && pathname.startsWith(itemHref)
  ), [pathname]);

  const mainNavItems = useMemo(() => [
    {
      id: 'perks',
      label: dict.filters.perks,
      icon: PerkHexIcon,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/perks`,
    },
    {
      id: 'generator',
      label: dict.filters.generatorTab,
      icon: BloodwebIcon,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/randomizer`,
    },
    {
      id: 'streaks',
      label: dict.sidebar.challenges,
      icon: RiftPortalIcon,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/streaks`,
    },
    {
      id: 'minigames',
      label: dict.sidebar.minigames,
      icon: Gamepad2,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/minigames`,
    },
    {
      id: 'maps',
      label: dict.sidebar.mapExplorer,
      icon: RealmMapIcon,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/maps`,
    },
    {
      id: 'characters',
      label: dict.sidebar.characters,
      icon: MaskIcon,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/characters`,
    },
    {
      id: 'tier-lists',
      label: dict.sidebar.tierLists,
      icon: LayoutList,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/tier-lists`,
    },
    {
      id: 'smash-or-pass',
      label: dict.sidebar.smashOrPass,
      icon: Heart,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/smash-or-pass`,
    },
    {
      id: 'trophies',
      label: dict.sidebar.trophies,
      icon: AdeptBadgeIcon,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/achievements`,
    },
    {
      id: 'about',
      label: dict.sidebar.about,
      icon: Info,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/about`,
    },
    {
      id: 'settings',
      label: dict.sidebar.settings,
      icon: Settings,
      color: 'text-accent-red',
      activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
      href: `/${currentLocale}/settings`,
    },
  ], [dict, currentLocale]);



  const renderSidebarContent = () => (
    <div className="flex h-full flex-col justify-between bg-bg-sidebar p-4 overflow-y-auto">
      <div>
        <div className="flex items-center justify-between px-1 py-2">
          <Link
            href={`/${currentLocale}`}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-accent-red rounded-control"
            aria-label={dict.sidebar.homeAria}
          >
            <IconTile tone="red" size="sm" className="relative p-1.5 text-text-primary shadow-xs group-hover:scale-105 transition-transform">
              <LemonIcon className="h-7 w-7" />
            </IconTile>
            <div>
              <span className="font-black text-base tracking-wider text-text-primary">
                {dict.app.title}
              </span>
            </div>
          </Link>

          <div className="hidden lg:block">
            <WhatsNewLauncher feed={changelogFeed} />
          </div>
        </div>

        <nav aria-label={dict.sidebar.navAria} className="mt-5 space-y-1">
          <p className="px-3 type-label-2xs text-text-muted mb-2">
            {dict.sidebar.navigation}
          </p>

          {mainNavItems
            .filter((item) => isAdmin || !adminOnlyPageFromPathname(item.href, i18n.locales))
            .map((item) => (
            <SidebarNavLink
              key={item.id}
              id={item.id}
              label={item.label}
              icon={item.icon}
              color={item.color}
              activeBg={item.activeBg}
              href={item.href}
              isActive={checkIsActive(item.href)}
              onClick={closeMobile}
            />
          ))}
        </nav>

        <SidebarUserSection
          currentLocale={currentLocale}
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
        aria-label={dict.sidebar.navAria}
        className="lemon-shell-aside hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen lg:shrink-0 border-r border-border-color bg-bg-sidebar z-50"
      >
        <div className="w-full h-full overflow-hidden flex flex-col">
          <div className="w-64 h-full flex flex-col shrink-0">
            {renderSidebarContent()}
          </div>
        </div>

        <TileButton
          onClick={toggleSidebar}
          data-testid="sidebar-toggle-button"
          {...tip(dict.sidebar.toggleSidebar, undefined, 'action')}
          aria-label={dict.sidebar.toggleSidebar}
          aria-expanded={!isCollapsed}
          className="hit-area hidden lg:flex absolute top-1/2 -right-6 -translate-y-1/2 h-16 w-6 items-center justify-center rounded-r-control border border-l-0 border-border-color bg-bg-sidebar text-text-primary shadow-md hover:bg-bg-sidebar-hover hover:w-7 hover:text-accent-red active:scale-95 transition-all duration-200 cursor-pointer z-50 group" press={false}
        >
          <ChevronRight
            aria-hidden="true"
            className="lemon-sidebar-icon-collapsed h-5 w-5 text-accent-red group-hover:scale-110 transition-transform"
          />
          <ChevronLeft
            aria-hidden="true"
            className="lemon-sidebar-icon-expanded h-5 w-5 text-accent-red group-hover:scale-110 transition-transform"
          />
        </TileButton>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-color bg-bg-sidebar px-4 lg:hidden">
        <Link
          href={`/${currentLocale}`}
          className="flex min-h-11 items-center gap-2.5"
          aria-label={dict.sidebar.homeAria}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-chip bg-accent-red/15 border border-accent-red/30 text-text-primary p-1">
            <LemonIcon className="h-6 w-6" />
          </div>
          <span className="font-extrabold text-sm tracking-wider text-text-primary">
            {dict.app.title}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <WhatsNewLauncher feed={changelogFeed} />
          <Button
            icon
            variant="secondary"
            onClick={() => setMobileOpen(true)}
            data-testid="mobile-drawer-toggle"
            aria-expanded={mobileOpen}
            aria-label={dict.sidebar.openDrawer}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <Modal
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        variant="drawer-left"
        size="xs"
        layer="nested"
        closeButton="none"
        containerClassName="lg:hidden"
        ariaLabel={dict.sidebar.openDrawer}
        bodyClassName="p-0"
      >
        <Button
          icon
          size="sm"
          variant="ghost"
          onClick={() => setMobileOpen(false)}
          data-testid="mobile-drawer-close"
          aria-label={dict.sidebar.closeDrawer}
          pill
          className="absolute right-3 top-3 z-20"
        >
          <X className="h-5 w-5" />
        </Button>
        {renderSidebarContent()}
      </Modal>

      {authModalOpen && (
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          verifyEmailFor={authModalIntent === 'verify' ? user?.email : undefined}
        />
      )}
      {bugModalOpen && (
        <BugReportModal
          isOpen={bugModalOpen}
          onClose={() => setBugModalOpen(false)}
        />
      )}
      {coffeeModalOpen && (
        <BuyCoffeeModal
          isOpen={coffeeModalOpen}
          onClose={() => setCoffeeModalOpen(false)}
        />
      )}
    </>
  );
};

