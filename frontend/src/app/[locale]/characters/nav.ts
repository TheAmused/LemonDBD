// frontend/src/app/[locale]/characters/nav.ts
import type { PageNav } from '@/utils/pageNav';
import { MaskIcon } from '@/components/icons/DbdIcons';

export const nav: PageNav = {
  order: 60,
  icon: MaskIcon,
  label: (dict) => dict?.sidebar?.characters || 'Characters',
};
