// frontend/src/components/smash-or-pass/prefs/smashPrefs.ts

/**
 * What the viewer chose on the page's warning: whether visual and sound effects play, and
 * whether the music does. `chosenAt` is when (ms since the epoch); it is what decides which of
 * two saved choices -- this device's and the account's -- is the newer one.
 */
export interface SmashPrefs {
  effects: boolean;
  music: boolean;
  chosenAt: number;
}

const PREFS_KEY = 'lemondbd_smash_prefs_v1';

function isPrefs(value: unknown): value is SmashPrefs {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.effects === 'boolean' && typeof v.music === 'boolean' && typeof v.chosenAt === 'number';
}

/** This device's saved choice, or null when the viewer has not made one here. */
export function readLocalPrefs(): SmashPrefs | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isPrefs(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLocalPrefs(prefs: SmashPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable: the choice lasts for this visit only.
  }
}

/** Whether the device asks for less motion; effects then start out switched off. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface Reconciled {
  /** The choice to use, or null when neither side has one. */
  prefs: SmashPrefs | null;
  /** True when this device's choice is the newer one and the account should be sent it. */
  pushToAccount: boolean;
}

/**
 * Signing in (or opening the page signed in) meets two saved choices: the one on this device and
 * the one on the account. The later one wins, and a choice only one side has is shared with the
 * other -- so one made before signing in is kept, and a new device picks up the account's.
 */
export function reconcilePrefs(local: SmashPrefs | null, account: SmashPrefs | null): Reconciled {
  if (!local) return { prefs: account, pushToAccount: false };
  if (!account) return { prefs: local, pushToAccount: true };
  if (local.chosenAt > account.chosenAt) return { prefs: local, pushToAccount: true };
  return { prefs: account, pushToAccount: false };
}
