// frontend/src/services/scoreboardApi.ts
// Scoreboard screenshot check. The image is sent to the backend, analysed in
// memory and discarded; only the derived report comes back. Nothing is stored.
// Nothing has to be filled in: the server compares the screenshot with the
// logged-in user's alias (or login) and reads everything else from the image.
import { ApiError, apiUrl, authFetch } from '@/utils/api';

export type ScoreboardStatus = 'escaped' | 'dead' | 'surrendered' | 'in_trial' | 'killer' | 'unknown';
export type ScoreboardVerdict = 'survivor_win' | 'draw' | 'killer_win' | 'incomplete';
export type ScoreboardOutcome = 'escaped' | 'died' | 'surrendered' | 'killer' | 'in_trial' | 'unknown';
export type ScoreboardResult = 'won' | 'lost' | 'draw';

/** One loadout slot. `name` is null when the slot is empty or the icon was not recognised. */
export interface LoadoutSlot {
  name: string | null;
  empty: boolean;
  confidence: number;
  /** A close runner-up or a weak match: `candidates` lists the best guesses. */
  uncertain: boolean;
  candidates?: string[];
  /** Items only: the item class (Flashlight, Med-Kit, ...). */
  category?: string;
  /** Items, add-ons, offerings: the rarity read from the slot's background colour. */
  rarity?: 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Ultra Rare' | 'Event';
}

export interface Loadout {
  perks: LoadoutSlot[];
  offering: LoadoutSlot;
  /** null for the killer, whose slot shows their power. */
  item: LoadoutSlot | null;
  addons: LoadoutSlot[];
  empty: boolean;
  /** The killer's loadout is only revealed once the match is over. */
  hidden?: boolean;
}

export interface ScoreboardRow {
  role: 'survivor' | 'killer';
  character: string | null;
  character_matched: boolean;
  player_name: string | null;
  is_bot: boolean;
  prestige: number | null;
  bloodpoints: number | null;
  status: ScoreboardStatus;
  loadout: Loadout | null;
}

export interface ScoreboardFacts {
  match_ended: boolean;
  verdict: ScoreboardVerdict;
  verdict_final: boolean;
  /** Survivor screenshots: settled as soon as the owner escaped or died. */
  survived: boolean | null;
  own_result: ScoreboardResult | null;
  own_result_final: boolean;
  /** Exact only when the match ended; `kills_at_least` is always a safe lower bound. */
  kills: number | null;
  kills_at_least: number;
  escapes: number | null;
  escapes_at_least: number;
  settled: { own_outcome: boolean; match_result: boolean; kill_count: boolean };
}

export interface ScoreboardReport {
  ok: boolean;
  error?: string;
  scoreboard?: { is_final: boolean; has_spectate_button: boolean; panel_located: boolean };
  owner_name?: string | null;
  pov?: {
    player_name: string | null;
    role: 'survivor' | 'killer';
    character: string | null;
    character_matched: boolean;
    status: ScoreboardStatus;
    row: number;
    found_by: 'highlight' | 'account_name' | 'expected_player' | null;
    name_match: number;
    outcome: ScoreboardOutcome;
    result: ScoreboardResult | null;
    /** true when the owner's own result can already be counted. */
    result_final: boolean;
    loadout: Loadout | null;
  } | null;
  /** The logged-in user's alias (or login) compared with the screenshot. */
  identity?: { expected: string | null; matched: boolean | null; similarity: number | null; via: string | null };
  rows?: ScoreboardRow[];
  summary?: {
    kills: number;
    escapes: number;
    in_trial: number;
    unknown: number;
    verdict: ScoreboardVerdict;
  };
  match?: {
    ended: boolean;
    verdict: ScoreboardVerdict;
    /** true also before the end when the remaining survivors can no longer change it. */
    verdict_final: boolean;
    kills_at_least: number;
    kills_at_most: number;
  };
  facts?: ScoreboardFacts;
  /** true = the screenshot owner won (survivor: escaped), false = lost, null = not known yet. */
  pov_won: boolean | null;
  checks?: Record<string, boolean | null>;
  /** true only when the owner demonstrably won and the screenshot is the logged-in user's. */
  passed?: boolean;
  /** Hash of the scoreboard contents, so the server can refuse a re-used screenshot. */
  fingerprint?: string;
  /** Same for every screenshot of one match (any player's, before or after the end). */
  match_key?: string;
  warnings?: string[];
}

export async function fetchScoreboardAvailable(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl('/api/v1/scoreboard/status'));
    return res.ok && Boolean((await res.json()).available);
  } catch {
    return false;
  }
}

export async function analyzeScoreboard(image: File | Blob): Promise<ScoreboardReport> {
  const form = new FormData();
  form.append('image', image, 'scoreboard');

  const res = await authFetch(apiUrl('/api/v1/scoreboard/analyze'), { method: 'POST', body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body?.error || 'Could not analyze the screenshot.', res.status, body?.code);
  }
  return body as ScoreboardReport;
}
