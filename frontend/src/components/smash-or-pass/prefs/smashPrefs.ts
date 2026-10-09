// frontend/src/components/smash-or-pass/prefs/smashPrefs.ts

/**
 * What the viewer chose on the page's warning: whether visual effects (flashes, particles, card
 * motion), sound effects and music play. `chosenAt` is when (ms since the epoch); it is what decides which of
 * two saved choices -- this device's and the account's -- is the newer one.
 */
export interface SmashPrefs {
  effects: boolean;
  sounds: boolean;
  music: boolean;
  chosenAt: number;
}

const PREFS_KEY = 'lemondbd_smash_prefs_v1';

/** A saved choice, or null when it is malformed. One saved before sound effects had their own switch follows `effects`. */
function parsePrefs(value: unknown): SmashPrefs | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.effects !== 'boolean' || typeof v.music !== 'boolean' || typeof v.chosenAt !== 'number') return null;
  return { effects: v.effects, sounds: typeof v.sounds === 'boolean' ? v.sounds : v.effects, music: v.music, chosenAt: v.chosenAt };
}

/** This device's saved choice, or null when the viewer has not made one here. */
export function readLocalPrefs(): SmashPrefs | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsePrefs(parsed);
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

/** What the switches show before the viewer has chosen: on, unless the device asks for less motion. */
export function defaultPrefs(): Omit<SmashPrefs, 'chosenAt'> {
  const reduced = prefersReducedMotion();
  return { effects: !reduced, sounds: true, music: !reduced };
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
