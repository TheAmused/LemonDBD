// frontend/src/app/[locale]/achievements/nav.ts
import type { PageNav } from '@/utils/pageNav';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';

export const nav: PageNav = {
  order: 90,
  sidebarId: 'trophies',
  icon: AdeptBadgeIcon,
  label: (dict) => dict?.sidebar?.trophies || 'Trophies',
};
