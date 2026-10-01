// frontend/src/components/smash-or-pass/creator/styles.ts
/**
 * Button and field recipes shared by the smash-or-pass creator/import/export
 * screens -- the same token-based treatments as the tier-list creator's own
 * `components/tier-lists/styles.ts`, kept as its own copy here so the two
 * features don't cross-import from each other's folders.
 */
export const BTN_SECONDARY =
  'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border-color bg-bg-surface px-3 text-xs sm:text-sm font-bold text-text-primary shadow-xs transition-colors hover:bg-bg-elevated disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

export const BTN_PRIMARY =
  'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-accent-red px-4 text-xs sm:text-sm font-extrabold text-text-inverted shadow-md shadow-accent-red/20 transition-colors hover:bg-accent-red-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

export const BTN_DANGER_GHOST =
  'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-accent-red/40 bg-accent-red/10 px-3 text-xs sm:text-sm font-bold text-accent-red transition-colors hover:bg-accent-red/20 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

export const FIELD =
  'w-full min-h-[44px] rounded-xl border border-border-color bg-bg-primary px-3 text-sm text-text-primary focus:border-accent-red focus:outline-none';

export const TEXTAREA_FIELD =
  'w-full rounded-xl border border-border-color bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-red focus:outline-none';

export const LABEL = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-secondary';
