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
