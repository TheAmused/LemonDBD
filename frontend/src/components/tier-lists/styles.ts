// frontend/src/components/tier-lists/styles.ts
/**
 * Layout-only tweaks for the shared Button / Input primitives on the tier-list
 * screens: a 44px minimum height so every control is a comfortable touch
 * target. Colour and focus treatment come from components/common.
 */
export const TOUCH_BTN = 'min-h-11';

/** Header action buttons: one fixed height and radius, a single line, width set by the label. */
export const HEADER_BTN = 'h-11 min-w-11 px-4 whitespace-nowrap';

/** The creator (new list, edit details) is built for desktop: its entry points vanish below this width. */
export const CREATOR_MIN_WIDTH = '(min-width: 1024px)';
export const CREATOR_ENTRY_HIDDEN = 'max-lg:hidden';

export const TOUCH_FIELD = 'min-h-11 bg-bg-primary';

export const LABEL = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-secondary';
