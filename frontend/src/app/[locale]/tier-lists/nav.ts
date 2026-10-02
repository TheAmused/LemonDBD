// frontend/src/app/[locale]/tier-lists/nav.ts
import type { PageNav } from '@/utils/pageNav';
import { LayoutList } from 'lucide-react';

export const nav: PageNav = {
  order: 70,
  icon: LayoutList,
  label: (dict) => dict?.sidebar?.tierLists || 'Tier Lists',
};
