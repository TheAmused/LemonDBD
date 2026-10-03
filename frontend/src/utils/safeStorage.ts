// frontend/src/utils/safeStorage.ts
// One place for "localStorage that may not exist" (SSR, private mode, blocked
// site data). Every storage helper in the app goes through these.

/** The browser's localStorage, or null when unavailable / access throws. */
export function getLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    // Non-browser runtimes (unit tests install a mock on globalThis).
    const g = globalThis as { localStorage?: Storage };
    return g.localStorage ?? null;
  } catch {
    return null;
  }
}

export function safeGetItem(key: string): string | null {
  try {
    return getLocalStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    getLocalStorage()?.setItem(key, value);
    return getLocalStorage() !== null;
  } catch {
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    getLocalStorage()?.removeItem(key);
  } catch {
    /* ignore */
  }
}
