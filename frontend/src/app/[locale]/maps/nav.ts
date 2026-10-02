// frontend/src/app/[locale]/maps/nav.ts
import type { PageNav } from '@/utils/pageNav';
import { RealmMapIcon } from '@/components/icons/DbdIcons';

export const nav: PageNav = {
  order: 50,
  icon: RealmMapIcon,
  label: (dict) => dict?.sidebar?.mapExplorer || 'Maps',
};
