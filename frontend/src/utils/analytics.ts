// frontend/src/utils/analytics.ts
//
// The one place Umami custom events are sent from. Analytics is best effort: it must never
// throw, block or change the UI, and it does nothing when the Umami script is missing
// (ad blocker, not loaded yet, server render).
import { safeGetItem, safeSetItem } from '@/utils/safeStorage';

/** What Umami accepts as event data: flat primitives only. */
export type EventProps = Record<string, string | number | boolean>;

type Role = 'survivor' | 'killer';

/** Every event the site sends, with its exact props. `undefined` means "no props". */
export interface AnalyticsEvents {
  // Randomizer
  randomizer_roll: {
    mode: 'wheel' | 'instant' | 'slot' | 'tarot' | 'crate';
    role: Role;
    blind: boolean;
    /** Active curse id, or 'none'. Read together with `role`. */
    curse: string;
    no_repeat: boolean;
    sound: 'on' | 'off';
  };
  // Maps
  map_open: { map: string; map_id: number; realm: string; via: 'browse' | 'search' | 'voice' | 'link' };
  map_voice_command: { result: 'matched' | 'nomatch'; engine: 'web-speech' | 'client-model' };
  // About and legal pages
  contact_click: { method: 'email' | 'discord'; page: ContactPage | 'other' };
  legal_link_click: { target: 'terms-of-service' | 'privacy-policy' | 'rules' };
  // User profile
  showcase_complete: { role: Role };
  avatar_upload: undefined;
  data_download: undefined;
  sign_out_everywhere: undefined;
  account_delete: undefined;
  two_factor_change: { action: 'enabled' | 'disabled' };
  // Smash or Pass
  smash_vote: { vote: 'smash' | 'pass'; roster: string };
  smash_roster_play: { roster: string };
  smash_roster_create: { mode: 'simple' | 'full'; nsfw: boolean };
  smash_roster_import: { via: 'link' | 'manual' };
  smash_roster_export: { method: 'link' | 'json_copy' | 'file' };
  smash_persona_share: { method: string };
  smash_persona_open: undefined;
  smash_leaderboard_open: undefined;
  smash_stats_open: undefined;
  smash_reset: undefined;
  smash_effects_choice: { effects: 'on' | 'off' };
  // Characters
  ownership_mode_enter: undefined;
  ownership_save: { characters_changed: number; perks_changed: number };
  ownership_blocked: { reason: 'login' | 'verify' };
  // Auth
  signup: { method: 'password' | 'google' };
  login: { method: 'password' | 'google' | 'two_factor' };
  email_verified: undefined;
  forgot_password_request: undefined;
  legal_preview_open: { doc: 'terms' | 'rules' | 'privacy' };
}

export type EventName = keyof AnalyticsEvents;
type EventArgs<K extends EventName> = AnalyticsEvents[K] extends undefined ? [] : [props: AnalyticsEvents[K]];

declare global {
  interface Window {
    umami?: { track: (name: string, data?: EventProps) => unknown };
  }
}

interface QueuedEvent {
  name: string;
  props: EventProps | undefined;
}

/** Events fired before the Umami script finished loading (it is injected after a client fetch). */
const MAX_QUEUED_EVENTS = 20;
const queuedEvents: QueuedEvent[] = [];

function dispatch(name: string, props: EventProps | undefined, queueIfNotLoaded: boolean): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const umami = window.umami;
    if (!umami || typeof umami.track !== 'function') {
      if (queueIfNotLoaded && queuedEvents.length < MAX_QUEUED_EVENTS) queuedEvents.push({ name, props });
      return false;
    }
    umami.track(name, props);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sends an event. Returns true only when it was handed to Umami right now; an event fired before
 * the script has loaded is kept (at most 20) and sent by `flushQueuedEvents`.
 */
export function trackEvent<K extends EventName>(name: K, ...args: EventArgs<K>): boolean {
  return dispatch(name, args[0] as EventProps | undefined, true);
}

/** Sends what was fired before Umami loaded. Called once the script is there; returns how many went out. */
export function flushQueuedEvents(): number {
  try {
    if (typeof window === 'undefined') return 0;
    const umami = window.umami;
    if (!umami || typeof umami.track !== 'function') return 0;
    const pending = queuedEvents.splice(0, queuedEvents.length);
    for (const { name, props } of pending) {
      try {
        umami.track(name, props);
      } catch {
        // Best effort: one bad event must not stop the rest.
      }
    }
    return pending.length;
  } catch {
    return 0;
  }
}

/**
 * Sends an event once per browser: `storageKey` is remembered in localStorage only after the
 * event really went out, so an event attempted before Umami loaded is tried again later.
 */
export function trackOnce<K extends EventName>(storageKey: string, name: K, ...args: EventArgs<K>): boolean {
  if (safeGetItem(storageKey) !== null) return false;
  // Not queued: the caller tries again on its own, and a queued copy would then be sent twice.
  if (!dispatch(name, args[0] as EventProps | undefined, false)) return false;
  safeSetItem(storageKey, '1');
  return true;
}

/** `allow()` is true at most once per `windowMs`; used to drop an accidental double report. */
export function createDeduper(windowMs: number, now: () => number = Date.now): () => boolean {
  let last = Number.NEGATIVE_INFINITY;
  return () => {
    const t = now();
    if (t - last < windowMs) return false;
    last = t;
    return true;
  };
}

const CONTACT_PAGES = ['about', 'privacy-policy', 'terms-of-service', 'rules'] as const;
export type ContactPage = (typeof CONTACT_PAGES)[number];

/** Which page the contact buttons are on, from a `/<locale>/<page>` path. */
export function contactPageFromPath(pathname: string | null): ContactPage | 'other' {
  const segment = (pathname ?? '').split('/')[2] ?? '';
  return (CONTACT_PAGES as readonly string[]).includes(segment) ? (segment as ContactPage) : 'other';
}
