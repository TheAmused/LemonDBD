// frontend/src/app/[locale]/perks/nav.ts
import type { PageNav } from '@/utils/pageNav';
import { PerkHexIcon } from '@/components/icons/DbdIcons';

export const nav: PageNav = {
  order: 10,
  icon: PerkHexIcon,
  label: (dict) => dict?.filters?.perks || dict?.sidebar?.perks || 'Perks',
};
