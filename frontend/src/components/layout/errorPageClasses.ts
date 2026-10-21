// frontend/src/components/layout/errorPageClasses.ts
//
// Class lists shared by the in-app error pages (ErrorPage) and the last-resort app/global-error.tsx,
// which cannot render ErrorPage (no providers there).
export const ERROR_CODE_BADGE =
  'mb-5 inline-flex items-center rounded-full border border-accent-red/30 bg-accent-red/10 px-4 py-1.5 type-label-sm text-accent-red';
export const ERROR_PAGE_TITLE = 'text-3xl font-black tracking-tight text-text-primary sm:text-5xl';
export const ERROR_PAGE_TEXT = 'mt-4 max-w-md text-sm font-medium leading-relaxed text-text-secondary sm:text-base';
export const ERROR_PAGE_ACTIONS = 'mt-8 flex flex-wrap items-center justify-center gap-3';
export const ERROR_PAGE_REFERENCE = 'mt-6 type-caption text-text-muted';

// buttonClassName('secondary' | 'primary', 'lg') written out. global-error.tsx is part of every
// route's client bundle, and buttonClassName would pull in tailwind-merge (~16KB gzip) for two
// fixed strings. errorBoundaries.test.ts keeps these equal to what buttonClassName returns.
const BUTTON_BASE =
  'inline-flex max-w-full shrink-0 items-center justify-center font-bold transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red disabled:cursor-not-allowed disabled:opacity-50';
export const GLOBAL_ERROR_RETRY_BUTTON = `${BUTTON_BASE} border border-border-color bg-bg-surface text-text-secondary hover:bg-bg-elevated hover:text-text-primary gap-2 px-6 py-3 text-base rounded-control`;
export const GLOBAL_ERROR_HOME_BUTTON = `${BUTTON_BASE} bg-accent-red text-text-inverted shadow-sm hover:bg-accent-red-hover gap-2 px-6 py-3 text-base rounded-control`;
