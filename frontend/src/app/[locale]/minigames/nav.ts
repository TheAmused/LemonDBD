// frontend/src/app/[locale]/minigames/nav.ts
import type { PageNav } from '@/utils/pageNav';
import { Gamepad2 } from 'lucide-react';

export const nav: PageNav = {
  order: 40,
  icon: Gamepad2,
  label: (dict) => dict?.sidebar?.minigames || 'Minigames',
};
