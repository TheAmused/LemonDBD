// frontend/src/components/sidebar/mainNavItems.ts
//
// The page list the sidebar, the page-switch panel and the error pages share. Pages come from
// the generated registry (route folders); a page appears in the sidebar when its folder has a
// nav.ts (src/utils/pageNav.ts).

import type React from 'react';
import { FileText } from 'lucide-react';
import { PAGE_NAV } from '@/generated/pageNav.generated';
import { SITE_PAGE_IDS, type PageSlug } from '@/utils/sitePages';
import type { Dictionary } from '@/locales/types';

export interface MainNavItem {
  /** Sidebar id (what `activeCategory` uses). */
  id: string;
  /** The page-kill-switch id (the route folder name). */
  pageId: PageSlug;
  label: string;
  icon: React.ElementType;
  color: string;
  activeBg: string;
  href: string;
}

const NAV_COLOR = 'text-accent-red';
const NAV_ACTIVE_BG = 'bg-accent-red/10 text-accent-red border border-accent-red/20';

/** "tier-lists" -> "Tier lists", for a page that has no nav.ts to name it. */
function fallbackLabel(id: string): string {
  const words = id.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function toItem(pageId: PageSlug, dict: Dictionary | undefined, locale: string): MainNavItem {
  const nav = PAGE_NAV[pageId];
  return {
    id: nav?.sidebarId ?? pageId,
    pageId,
    label: nav ? nav.label(dict) : fallbackLabel(pageId),
    icon: nav?.icon ?? FileText,
    color: NAV_COLOR,
    activeBg: NAV_ACTIVE_BG,
    href: `/${locale}/${pageId}`,
  };
}

/** The sidebar entries: every page that declared a nav.ts, in its `order`. */
export function buildMainNavItems(dict: Dictionary | undefined, locale: string): MainNavItem[] {
  return SITE_PAGE_IDS.filter((id) => PAGE_NAV[id])
    .sort((a, b) => (PAGE_NAV[a]?.order ?? 0) - (PAGE_NAV[b]?.order ?? 0))
    .map((id) => toItem(id, dict, locale));
}

/** Every page (also those without a sidebar entry), plus any extra ids, for the admin switches. */
export function buildSwitchablePages(dict: Dictionary | undefined, locale: string, extraIds: readonly PageSlug[] = []): MainNavItem[] {
  const nav = buildMainNavItems(dict, locale);
  const known = new Set(nav.map((item) => item.pageId));
  const rest = [...SITE_PAGE_IDS, ...extraIds]
    .filter((id, index, all) => !known.has(id) && all.indexOf(id) === index)
    .map((id) => toItem(id, dict, locale));
  return [...nav, ...rest];
}
