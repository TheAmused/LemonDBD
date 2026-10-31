import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The project's own sizes and radii (tokens.css) have to be declared here, otherwise tailwind-merge
// reads `text-tiny` as a text COLOR and silently drops the real color class next to it, and treats
// `rounded-card` as an unrelated utility so it never replaces another radius.
const RADIUS_ROLES = ['chip', 'control', 'card', 'modal'];
// The `--container-*` widths (w-page, max-w-viewport-lg, ...): without them `max-w-none` cannot replace
// `max-w-viewport-lg`, both stay and the stylesheet order decides (the fullscreen modal stopped at 96vw).
const CONTAINER_SIZES = [
  'bleed', 'cell', 'cell-lg', 'field', 'field-lg', 'field-sm', 'fifth-gap', 'gutter',
  'hub-xs', 'hub-sm', 'hub-md', 'hub-lg', 'hub-xl', 'hub-2xl',
  'lore-column', 'lore-rail', 'lore-rail-sm', 'lore-rail-md', 'lore-rail-lg',
  'menu', 'modal-auto', 'page', 'page-lg', 'page-xl', 'profile', 'profile-xl', 'roster-modal',
  'third-gap', 'toast', 'viewport-sm', 'viewport-md', 'viewport-lg', 'workspace', 'workspace-xl',
];
const twMerge = extendTailwindMerge({
  extend: {
    theme: { container: CONTAINER_SIZES },
    classGroups: {
      'font-size': [{ text: ['micro', 'tiny', 'mini', 'compact', 'relative', 'relative-sm'] }],
      rounded: [{ rounded: RADIUS_ROLES }],
      'rounded-t': [{ 'rounded-t': RADIUS_ROLES }],
      'rounded-r': [{ 'rounded-r': RADIUS_ROLES }],
      'rounded-b': [{ 'rounded-b': RADIUS_ROLES }],
      'rounded-l': [{ 'rounded-l': RADIUS_ROLES }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
