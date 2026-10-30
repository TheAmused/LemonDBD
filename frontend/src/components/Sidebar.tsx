'use client';
// frontend/src/components/Sidebar.tsx

import { Modal } from '@/components/common/Modal';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  LayoutList,
  Gamepad2,
  Settings,
  Library,} from 'lucide-react';
import { useSidebarState } from '@/hooks/useSidebarState';
import { LemonIcon } from './LemonIcon';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';
import { SidebarNavLink } from './sidebar/SidebarNavLink';
import { SidebarNavGroup } from './sidebar/SidebarNavGroup';
import { adminOnlyPageFromPathname } from '@/utils/adminOnlyPages';
import { SidebarUserSection } from './sidebar/SidebarUserSection';
import { SidebarBottomControls } from './sidebar/SidebarBottomControls';
import { i18n } from '@/i18n/config';
import { WhatsNewLauncher } from '@/components/changelog/WhatsNewLauncher';
import { useChangelogFeed } from '@/components/changelog/useChangelogFeed';
import { PerkHexIcon, MaskIcon, GridIcon, TrophyIcon, DiceIcon, TargetIcon, MapIcon, HeartIcon } from '@/components/icons/DbdIcons';

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

const BardInsultsModal = dynamic(
  () => import('./sidebar/BardInsultsModal').then((m) => m.BardInsultsModal),
  { ssr: false }
);

/** A page link (`href`) or a button that opens a dialog (`onSelect`). */
interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  onSelect?: () => void;
}

/** A foldable run of items under one title. */
interface NavGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

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
  const [insultsModalOpen, setInsultsModalOpen] = useState(false);

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

  const navEntries = useMemo((): NavEntry[] => {
    const page = (id: string, label: string, icon: React.ElementType, segment: string): NavItem => ({
      id, label, icon, href: `/${currentLocale}/${segment}`,
    });
    return [
      page('streaks', dict.sidebar.challenges, TargetIcon, 'streaks'),
      page('maps', dict.sidebar.mapCallouts, MapIcon, 'maps'),
      page('generator', dict.filters.generatorTab, DiceIcon, 'randomizer'),
      {
        id: 'database',
        label: dict.sidebar.groupDatabase,
        icon: Library,
        items: [
          page('perks', dict.filters.perks, PerkHexIcon, 'perks'),
          page('characters', dict.sidebar.characters, MaskIcon, 'characters'),
        ],
      },
      {
        id: 'extras',
        label: dict.sidebar.groupExtras,
        icon: GridIcon,
        items: [
          page('tier-lists', dict.sidebar.tierLists, LayoutList, 'tier-lists'),
          page('smash-or-pass', dict.sidebar.smashOrPass, HeartIcon, 'smash-or-pass'),
          page('minigames', dict.sidebar.minigames, Gamepad2, 'minigames'),
        ],
      },
      page('trophies', dict.sidebar.trophies, TrophyIcon, 'achievements'),
      page('settings', dict.sidebar.settings, Settings, 'settings'),
      page('about', dict.sidebar.about, Info, 'about'),
    ];
  }, [dict, currentLocale]);

  // Admin-only pages are hidden from everyone else; a group left empty disappears with them.
  const visibleNavEntries = useMemo(() => {
    const visible = (item: NavItem) => isAdmin || !item.href || !adminOnlyPageFromPathname(item.href, i18n.locales);
    return navEntries
      .map((entry) => ('items' in entry ? { ...entry, items: entry.items.filter(visible) } : entry))
      .filter((entry) => ('items' in entry ? entry.items.length > 0 : visible(entry)));
  }, [navEntries, isAdmin]);

  const renderNavItem = (item: NavItem) => (
    <SidebarNavLink
      key={item.id}
      id={item.id}
      label={item.label}
      icon={item.icon}
      href={item.href}
      isActive={!!item.href && checkIsActive(item.href)}
      hasPopup={item.onSelect ? 'dialog' : undefined}
      onClick={item.onSelect ?? closeMobile}
    />
  );

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
          {visibleNavEntries.map((entry) => (
            'items' in entry ? (
              <SidebarNavGroup
                key={entry.id}
                id={entry.id}
                label={entry.label}
                icon={entry.icon}
                hasActive={entry.items.some((item) => !!item.href && checkIsActive(item.href))}
              >
                {entry.items.map(renderNavItem)}
              </SidebarNavGroup>
            ) : renderNavItem(entry)
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
          onOpenInsults={() => {
            setInsultsModalOpen(true);
            setMobileOpen(false);
          }}
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
          aria-label={dict.sidebar.toggleSidebar}
          aria-expanded={!isCollapsed}
          className="hit-area hidden lg:flex absolute top-1/2 -right-6 -translate-y-1/2 h-16 w-6 items-center justify-center rounded-r-control border border-l-0 border-border-color bg-bg-sidebar text-text-primary shadow-md hover:bg-bg-sidebar-hover hover:w-7 hover:text-accent-red active:scale-95 transition-all duration-200 cursor-pointer z-50 group" press={false}
        >
          <ChevronRight
            aria-hidden="true"
            className="lemon-sidebar-icon-collapsed icon-lg text-accent-red group-hover:scale-110 transition-transform"
          />
          <ChevronLeft
            aria-hidden="true"
            className="lemon-sidebar-icon-expanded icon-lg text-accent-red group-hover:scale-110 transition-transform"
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
            <LemonIcon className="icon-xl" />
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
            <Menu />
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
          <X className="icon-lg" />
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
      {insultsModalOpen && (
        <BardInsultsModal
          isOpen={insultsModalOpen}
          onClose={() => setInsultsModalOpen(false)}
        />
      )}
    </>
  );
};

