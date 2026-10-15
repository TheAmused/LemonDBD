import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The project's own sizes and radii (tokens.css) have to be declared here, otherwise tailwind-merge
// reads `text-tiny` as a text COLOR and silently drops the real color class next to it, and treats
// `rounded-card` as an unrelated utility so it never replaces another radius.
const RADIUS_ROLES = ['chip', 'control', 'card', 'modal'];
const twMerge = extendTailwindMerge({
  extend: {
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
