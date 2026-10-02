// frontend/src/app/[locale]/about/nav.ts
import type { PageNav } from '@/utils/pageNav';
import { Info } from 'lucide-react';

export const nav: PageNav = {
  order: 100,
  icon: Info,
  label: (dict) => 'About us',
};
