// frontend/src/components/common/modalManager.ts
//
// Pure, DOM-agnostic bookkeeping shared by every <Modal>: which modal is on top
// (so Escape / focus trap only act on that one) and a ref-counted page scroll
// lock (so stacked modals never restore `overflow` too early or leave it stuck).

/* ------------------------------ modal stack ------------------------------ */

const stack: string[] = [];

export const pushModal = (id: string): void => {
  if (!stack.includes(id)) stack.push(id);
};

export const removeModal = (id: string): void => {
  const i = stack.indexOf(id);
  if (i !== -1) stack.splice(i, 1);
};

export const isTopModal = (id: string): boolean => stack[stack.length - 1] === id;

export const modalDepth = (id: string): number => stack.indexOf(id);

export const openModalCount = (): number => stack.length;

/* ------------------------------ scroll lock ------------------------------ */

export interface ScrollLockTarget {
  style: { overflow: string; paddingRight: string };
}

let lockCount = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

/** Lock page scroll. `scrollbarWidth` is compensated so the layout does not jump. */
export const acquireScrollLock = (target: ScrollLockTarget, scrollbarWidth = 0): void => {
  if (lockCount === 0) {
    saved = { overflow: target.style.overflow, paddingRight: target.style.paddingRight };
    target.style.overflow = 'hidden';
    if (scrollbarWidth > 0) target.style.paddingRight = `${scrollbarWidth}px`;
  }
  lockCount += 1;
};

export const releaseScrollLock = (target: ScrollLockTarget): void => {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0 && saved) {
    target.style.overflow = saved.overflow;
    target.style.paddingRight = saved.paddingRight;
    saved = null;
  }
};

export const scrollLockCount = (): number => lockCount;

/** Test hook. */
export const __resetModalManager = (): void => {
  stack.length = 0;
  lockCount = 0;
  saved = null;
};
