// frontend/src/utils/analytics.ts
//
// The one place Umami custom events are sent from. Analytics is best effort: it must never
// throw, block or change the UI, and it does nothing when the Umami script is missing
// (ad blocker, not loaded yet, server render).
import { safeGetItem, safeSetItem } from '@/utils/safeStorage';
import type { PerkType } from '@/utils/perkTypes';
import type { TierListKind } from '@/types/tierList';
import type { LadderPresetId } from '@/utils/tierLists/creator';

/** What Umami accepts as event data: flat primitives only. */
export type EventProps = Record<string, string | number | boolean>;

type Role = 'survivor' | 'killer';

export type ChallengeId = 'gauntlet' | 'chaos' | 'history' | 'page_streak' | 'id_please';
/** Who plays: the side, or `mixed` for ID, Please's combined lane. */
export type ChallengeRole = Role | 'mixed';
/** What Gauntlet Lemon's tokens buy: a different target, a chosen one, a free perk slot, or a shield for a lost match. */
export type ChallengeBoost = 'reroll' | 'pick' | 'slot' | 'shield';
/** The themes of the sidebar picker; `system` follows the device. */
export type ThemeName = 'light' | 'light-lemon' | 'dark' | 'system';
export type SettingName = 'campfire' | 'gifs' | 'nsfw' | 'sounds' | 'music' | 'animations';
export type ChallengeUiAction =
  | 'rules'
  | 'stats'
  | 'past_wins'
  | 'animations_on'
  | 'animations_off'
  | 'abandon_open'
  | 'abandon_cancel';
/** What every challenge event says about the run: which challenge, on which side, in which mode (difficulty; Page Streak: the killer). */
export interface ChallengeTag {
  challenge: ChallengeId;
  role: ChallengeRole;
  variant: string;
}

/** What the tier list events say about a list: the slug of an official one (never a title), or `custom` for one the visitor made, and its kind. */
export interface TierListTag {
  list: string;
  kind: TierListKind;
}

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
  legal_link_click: { target: 'about' | 'terms-of-service' | 'privacy-policy' | 'rules' };
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
  // Support (Buy me a coffee modal)
  coffee_modal_open: undefined;
  coffee_link_click: { provider: 'buy_me_a_coffee' | 'ko_fi' };
  coffee_ad_start: undefined;
  /** How a rewarded ad ended: `rewarded` ran to the end, `dismissed` was closed early, `failed` is an ad network error. */
  coffee_ad_result: { result: 'rewarded' | 'dismissed' | 'failed' };
  // Bug report modal
  bug_report_open: { source: 'sidebar' | 'profile'; access: 'member' | 'guest' | 'guest_blocked' };
  bug_report_start: { access: 'member' | 'guest' };
  bug_report_submit: { access: 'member' | 'guest'; screenshots: number };
  // Characters
  ownership_mode_enter: undefined;
  ownership_save: { characters_changed: number; perks_changed: number };
  ownership_blocked: { reason: 'login' | 'verify' };
  // Perks page
  /** `perk` is the English name (stable across site languages), `via` is `search` while a search text is active. */
  perk_open: { perk_id: number; perk: string; role: Role; via: 'grid' | 'search' };
  /** One per settled search text: `query` is the typed term (lower case, max 40 chars). `perk_id` and `perk` are only there when it narrowed to a single perk. */
  perk_search: { role: Role; query: string; results: number; perk_id?: number; perk?: string };
  perk_type_filter: { type: PerkType; role: Role };
  perk_scope_filter: { scope: 'owned' | 'general' };
  perk_sort: { order: 'asc' | 'desc' };
  perk_page_size: { limit: number };
  // Challenges (every streak mode): one run moves through start, checkpoints and loss until it completes or is abandoned
  /** The first match of an attempt. `attempt` counts from 1 within the run, `roster` is how many characters (pages) the run is made of. */
  challenge_start: ChallengeTag & { attempt: number; roster?: number };
  /** A won match; `streak` is how far the attempt is with it. With `challenge_loss` it gives the win rate (a loss spared by a shield is not counted). */
  challenge_win: ChallengeTag & { streak: number };
  challenge_checkpoint: ChallengeTag & { streak: number };
  /** `attempts` is how many attempts it took, the winning one included. */
  challenge_complete: ChallengeTag & { attempts: number };
  /** The attempt ended with a lost match; `streak` is how far it got. */
  challenge_loss: ChallengeTag & { streak: number };
  /** A confirmed reset of an attempt that had a match played in it; `streak` is how far it got. */
  challenge_abandon: ChallengeTag & { streak: number };
  /** Page Streak's "abandon all killers": how many runs it gave up, split into attempts in progress and finished runs. */
  challenge_abandon_all: { challenge: ChallengeId; in_progress: number; completed: number };
  /** Tokens that really landed in the balance after a win (a roll cut short by the cap counts only what fitted). Summed, it is every token players collected. */
  challenge_tokens: ChallengeTag & { earned: number };
  /** A boost bought with tokens; `price` is what it cost. The shield counts only when it was charged, i.e. it saved the attempt. */
  challenge_boost: ChallengeTag & { boost: ChallengeBoost; price: number };
  challenge_mode_change: { challenge: ChallengeId; role: ChallengeRole; from: string; to: string };
  challenge_ui: { challenge: ChallengeId; action: ChallengeUiAction };
  // Tier lists
  /** The first move on a list in a visit. Official lists count by slug, so `list` also says which one is ranked the most. */
  tier_list_rank: TierListTag;
  /** Every item of the list is out of the unranked pool, reached by a move (a list opened already ranked sends nothing). Once per list per visit. */
  tier_list_complete: TierListTag & { items: number };
  /** A confirmed reset of the ranking. */
  tier_list_reset: TierListTag;
  /** `into` is where the import was started: the hub, an official list (a ranking) or an open custom list (replaces it). Only imports that were saved. */
  tier_list_import: { into: 'hub' | 'official' | 'custom'; via: 'link' | 'manual' };
  tier_list_export: { method: 'link' | 'json_copy' | 'file' };
  /** The report dialog of a custom list was opened. */
  tier_list_report_open: undefined;
  /** A new list saved in this browser: `own_items` are the ones added by link or upload (not picked from the catalog), `cover_image` is a background image set, `ladder` is the preset used or `custom` once the tiers were edited. */
  tier_list_create: { items: number; own_items: number; tiers: number; ladder: LadderPresetId | 'custom'; cover_image: boolean; nsfw: boolean };
  /** The creator's Preview button. */
  tier_list_preview: undefined;
  // Settings page
  /** A setting the visitor changed on the Settings page; `value` is where it went (`eco` only for the campfire). */
  setting_change: { setting: SettingName; value: 'on' | 'off' | 'eco' };
  // Language and theme pickers, welcome wizard
  /** A real switch of the site language: `via` is where it was picked, the sidebar menu or the language step of the welcome wizard. */
  language_change: { from: string; to: string; via: 'sidebar' | 'onboarding' };
  /** A real change of the theme in the sidebar picker (picking the current one is not reported). */
  theme_change: { theme: ThemeName };
  /** The welcome wizard was finished and saved. With `signup` and `/welcome` page views it gives the onboarding funnel. `characters_owned` are the non free characters marked as owned. */
  onboarding_complete: { characters_owned: number };
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
