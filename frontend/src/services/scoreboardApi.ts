// frontend/src/services/scoreboardApi.ts
// Scoreboard screenshot check. The image is sent to the backend, analysed in
// memory and discarded; only the derived report comes back. Nothing is stored.
import { ApiError, apiUrl, authFetch } from '@/utils/api';

export type ScoreboardStatus = 'escaped' | 'dead' | 'in_trial' | 'killer' | 'unknown';

export interface ScoreboardRow {
  role: 'survivor' | 'killer';
  character: string | null;
  player_name: string | null;
  bloodpoints: number | null;
  status: ScoreboardStatus;
}

export interface ScoreboardReport {
  ok: boolean;
  error?: string;
  scoreboard?: { is_final: boolean; has_spectate_button: boolean };
  owner_name?: string | null;
  pov?: { player_name: string | null; role: string | null; character: string | null; status: ScoreboardStatus | null };
  rows?: ScoreboardRow[];
  summary?: {
    kills: number;
    escapes: number;
    in_trial: number;
    unknown: number;
    verdict: 'survivor_win' | 'draw' | 'killer_win' | 'incomplete';
  };
  /** true = the screenshot owner won, false = lost, null = could not tell. */
  pov_won: boolean | null;
  checks?: Record<string, boolean | null>;
  /** true only when the owner demonstrably won and every requested check matched. */
  passed?: boolean;
  /** Hash of the scoreboard contents, so the server can refuse a re-used screenshot. */
  fingerprint?: string;
  warnings?: string[];
}

export interface ScoreboardCheckOptions {
  expectedPlayer?: string;
  expectedRole?: 'survivor' | 'killer';
  expectedCharacter?: string;
  killsForWin?: number;
}

export async function fetchScoreboardAvailable(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl('/api/v1/scoreboard/status'));
    return res.ok && Boolean((await res.json()).available);
  } catch {
    return false;
  }
}

export async function analyzeScoreboard(
  image: File | Blob,
  opts: ScoreboardCheckOptions = {}
): Promise<ScoreboardReport> {
  const form = new FormData();
  form.append('image', image, 'scoreboard');
  if (opts.expectedPlayer) form.append('expected_player', opts.expectedPlayer);
  if (opts.expectedRole) form.append('expected_role', opts.expectedRole);
  if (opts.expectedCharacter) form.append('expected_character', opts.expectedCharacter);
  if (opts.killsForWin) form.append('kills_for_win', String(opts.killsForWin));

  const res = await authFetch(apiUrl('/api/v1/scoreboard/analyze'), { method: 'POST', body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body?.error || 'Could not analyze the screenshot.', res.status, body?.code);
  }
  return body as ScoreboardReport;
}
