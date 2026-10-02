// frontend/src/app/[locale]/smash-or-pass/nav.ts
import type { PageNav } from '@/utils/pageNav';
import { Heart } from 'lucide-react';

export const nav: PageNav = {
  order: 80,
  icon: Heart,
  label: (dict) => dict?.sidebar?.smashOrPass || 'Smash or Pass',
};
