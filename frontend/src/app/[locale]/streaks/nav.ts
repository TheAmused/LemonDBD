// frontend/src/app/[locale]/streaks/nav.ts
import type { PageNav } from '@/utils/pageNav';
import { RiftPortalIcon } from '@/components/icons/DbdIcons';

export const nav: PageNav = {
  order: 30,
  icon: RiftPortalIcon,
  label: (dict) => dict?.sidebar?.challenges || 'Challenges',
};
