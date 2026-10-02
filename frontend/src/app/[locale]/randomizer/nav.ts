// frontend/src/app/[locale]/randomizer/nav.ts
import type { PageNav } from '@/utils/pageNav';
import { BloodwebIcon } from '@/components/icons/DbdIcons';

export const nav: PageNav = {
  order: 20,
  sidebarId: 'generator',
  icon: BloodwebIcon,
  label: (dict) => dict?.filters?.generatorTab || dict?.generator?.title || 'Randomizer',
};
