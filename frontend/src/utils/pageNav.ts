// frontend/src/utils/pageNav.ts
//
// How a page appears in the sidebar. A page folder (src/app/[locale]/<id>/) opts in by adding a
// `nav.ts` that default-exports nothing but `export const nav: PageNav = {...}`; the generator
// (scripts/generate-site-pages.mjs) picks it up. A page without nav.ts is still a switchable
// page, it just isn't listed in the navigation.

import type React from 'react';
import type { Dictionary } from '@/locales/types';

export interface PageNav {
  /** Position in the sidebar (ascending). */
  order: number;
  icon: React.ElementType;
  label: (dict: Dictionary | undefined) => string;
  /** The id `activeCategory` and the sidebar use, when it differs from the route folder name. */
  sidebarId?: string;
}
