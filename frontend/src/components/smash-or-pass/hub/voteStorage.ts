// frontend/src/components/smash-or-pass/hub/voteStorage.ts
import type { EntityItem } from '@/types/smashOrPass';
import { isLocalRosterSlug } from '@/utils/smashOrPass/localRoster';

/** One persisted vote; older saves put the slug on the vote itself instead of on `character`. */
export type StoredVote = {
  character: EntityItem;
  vote: 'smash' | 'pass';
  timestamp: number;
  slug?: string;
  character_slug?: string;
};

export function voteSlug(v: StoredVote): string | undefined {
  return v.character?.slug || v.slug || v.character_slug;
}

const SELECTED_ROSTER_KEY = 'dbd_smash_selected_roster';
const VOTES_PREFIX = 'dbd_smash_votes_';
const votesKey = (rosterSlug: string) => `${VOTES_PREFIX}${rosterSlug}`;

/** The roster the viewer last picked in this browser, or the canon roster. */
export function rememberedRosterSlug(): string {
  if (typeof window === 'undefined') return 'canon';
  return localStorage.getItem(SELECTED_ROSTER_KEY) || 'canon';
}

export function rememberRoster(slug: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SELECTED_ROSTER_KEY, slug);
}

/**
 * `?roster=<slug>` wins over the remembered choice -- the roster creator lands here with it
 * set right after creating/publishing a roster, so the thing the viewer just built is what
 * they see.
 */
export function initialRosterSlug(): string {
  if (typeof window === 'undefined') return 'canon';
  const fromQuery = new URLSearchParams(window.location.search).get('roster');
  if (fromQuery) {
    rememberRoster(fromQuery);
    return fromQuery;
  }
  return rememberedRosterSlug();
}

/**
 * Votes waiting to be written. Each saved vote carries its whole character (around 9 KB), so
 * rewriting the list on every swipe made fast voting slower with every card; a burst of swipes
 * now costs one write, made once the viewer pauses (or leaves the page).
 */
const pendingWrites = new Map<string, StoredVote[]>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let flushListenersAdded = false;
const WRITE_DELAY_MS = 700;

/** Writes every waiting vote list now. */
export function flushStoredVotes(): void {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  for (const [rosterSlug, votes] of pendingWrites) writeStoredVotes(rosterSlug, votes);
  pendingWrites.clear();
}

/** Saves a roster's votes soon: a newer call for the same roster replaces an older one. */
export function queueStoredVotes(rosterSlug: string, votes: StoredVote[]): void {
  if (typeof window === 'undefined') return;
  if (!flushListenersAdded) {
    flushListenersAdded = true;
    window.addEventListener('pagehide', flushStoredVotes);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) flushStoredVotes();
    });
  }
  pendingWrites.set(rosterSlug, votes);
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(flushStoredVotes, WRITE_DELAY_MS);
}

export function readStoredVotes(rosterSlug: string): StoredVote[] {
  if (typeof window === 'undefined') return [];
  const waiting = pendingWrites.get(rosterSlug);
  if (waiting) return waiting;
  try {
    const raw = localStorage.getItem(votesKey(rosterSlug));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Unreadable or malformed storage reads as "no votes yet".
  }
  return [];
}

export function writeStoredVotes(rosterSlug: string, votes: StoredVote[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(votesKey(rosterSlug), JSON.stringify(votes));
  } catch {
    // Quota or privacy mode: the in-memory history still works for this session.
  }
}

export function clearStoredVotes(rosterSlug: string): void {
  if (typeof window === 'undefined') return;
  pendingWrites.delete(rosterSlug);
  try {
    localStorage.removeItem(votesKey(rosterSlug));
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}


/**
 * Drops the cached vote history of every official roster (pending writes
 * included). Those votes belong to an account or a guest session that this
 * browser has just stopped being; local rosters' votes never left the device
 * and stay.
 */
export function forgetAccountVotes(): void {
  if (typeof window === 'undefined') return;
  for (const slug of [...pendingWrites.keys()]) {
    if (!isLocalRosterSlug(slug)) pendingWrites.delete(slug);
  }
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(VOTES_PREFIX) && !isLocalRosterSlug(key.slice(VOTES_PREFIX.length))) doomed.push(key);
    }
    doomed.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage unavailable: nothing persisted to forget.
  }
}
