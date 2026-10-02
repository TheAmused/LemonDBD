// frontend/src/components/sidebar/mainNavItems.ts
//
// The main navigation entries, shared by the sidebar and the error pages' "where to next" list.

import type React from 'react';
import { Gamepad2, Heart, Info, LayoutList } from 'lucide-react';
import {
  AdeptBadgeIcon,
  BloodwebIcon,
  MaskIcon,
  PerkHexIcon,
  RealmMapIcon,
  RiftPortalIcon,
} from '@/components/icons/DbdIcons';
import type { Dictionary } from '@/locales/types';
import type { SitePageId } from '@/utils/sitePages';

export interface MainNavItem {
  /** Sidebar id (what `activeCategory` uses). */
  id: string;
  /** The page-kill-switch id of the same destination. */
  pageId: SitePageId;
  label: string;
  icon: React.ElementType;
  color: string;
  activeBg: string;
  href: string;
}

const NAV_COLOR = 'text-accent-red';
const NAV_ACTIVE_BG = 'bg-accent-red/10 text-accent-red border border-accent-red/20';

export function buildMainNavItems(dict: Dictionary | undefined, locale: string): MainNavItem[] {
  const entries: Array<[string, SitePageId, string, React.ElementType]> = [
    ['perks', 'perks', dict?.filters?.perks || dict?.sidebar?.perks || 'Perks', PerkHexIcon],
    ['generator', 'randomizer', dict?.filters?.generatorTab || dict?.generator?.title || 'Randomizer', BloodwebIcon],
    ['streaks', 'streaks', dict?.sidebar?.challenges || 'Challenges', RiftPortalIcon],
    ['minigames', 'minigames', dict?.sidebar?.minigames || 'Minigames', Gamepad2],
    ['maps', 'maps', dict?.sidebar?.mapExplorer || 'Maps', RealmMapIcon],
    ['characters', 'characters', dict?.sidebar?.characters || 'Characters', MaskIcon],
    ['tier-lists', 'tier-lists', dict?.sidebar?.tierLists || 'Tier Lists', LayoutList],
    ['smash-or-pass', 'smash-or-pass', dict?.sidebar?.smashOrPass || 'Smash or Pass', Heart],
    ['trophies', 'achievements', dict?.sidebar?.trophies || 'Trophies', AdeptBadgeIcon],
    // TEMPORARY: remove once About us is linked permanently.
    ['about', 'about', 'About us', Info],
  ];
  return entries.map(([id, pageId, label, icon]) => ({
    id,
    pageId,
    label,
    icon,
    color: NAV_COLOR,
    activeBg: NAV_ACTIVE_BG,
    href: `/${locale}/${pageId}`,
  }));
}
