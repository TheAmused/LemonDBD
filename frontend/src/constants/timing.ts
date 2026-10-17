// frontend/src/constants/timing.ts
// Delays that more than one screen must agree on. A component never types a millisecond value of its own.

/** Wait after the last keystroke before a search box asks the server. */
export const SEARCH_DEBOUNCE_MS = 300;

/** How long a confirmation or an error notice stays up before it dismisses itself. */
export const TOAST_DURATION_MS = { success: 4000, error: 9000 } as const;

/** Wait after the last edit before a live preview is requested. */
export const PREVIEW_DEBOUNCE_MS = 400;
