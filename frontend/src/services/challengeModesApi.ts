// frontend/src/services/challengeModesApi.ts
import { backendBase } from '@/utils/staticUrl';

export interface ChallengeModeStatus {
  is_enabled: boolean;
  disabled_reason: string | null;
}

export type ChallengeModeStatusMap = Record<string, ChallengeModeStatus>;

/** Public (unauthenticated) read of each challenge mode's admin kill-switch
 * state, keyed by backend mode name (gauntlet/chaos/history/page_streak).
 * Never rejects -- a network hiccup resolves to {} (treated as "enabled" by
 * every caller) rather than leaving a gate/panel stuck on a rejected promise. */
export async function fetchChallengeModeStatus(): Promise<ChallengeModeStatusMap> {
  try {
    const res = await fetch(`${backendBase}/api/v1/challenge-modes`);
    if (!res.ok) return {};

    const data = await res.json();
    const modes: Array<{ mode: string; is_enabled: boolean; disabled_reason: string | null }> = data.modes || [];

    return modes.reduce<ChallengeModeStatusMap>((acc, m) => {
      acc[m.mode] = { is_enabled: m.is_enabled, disabled_reason: m.disabled_reason };
      return acc;
    }, {});
  } catch {
    return {};
  }
}
