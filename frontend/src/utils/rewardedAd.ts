// frontend/src/utils/rewardedAd.ts
//
// The seam between the support dialog and the ad network that serves its rewarded ad. The dialog only
// knows this interface, so wiring in AdSense (or swapping it later) changes this file and nothing else.

/** How an ad the visitor asked for ended. Only `rewarded` earns the thank-you; `failed` is a provider error. */
export type RewardedAdResult = 'rewarded' | 'dismissed' | 'failed';

export interface RewardedAdProvider {
  /** Reports whether an ad can be shown right now, and again whenever that changes. Returns the unsubscribe. */
  watchReady: (onChange: (ready: boolean) => void) => () => void;
  /** Plays the ad. Resolves `rewarded` only when it ran to the end, `dismissed` when the visitor closed it early. */
  show: () => Promise<'rewarded' | 'dismissed'>;
}

/**
 * The AdSense rewarded ad unit plugs in here once the site runs on a domain AdSense has approved.
 * Until then there is no provider, and the support dialog shows no ad.
 */
export function getRewardedAdProvider(): RewardedAdProvider | null {
  return null;
}

/** Longest an ad may take to report back (a 30 second ad plus loading, with room to spare). */
const AD_TIMEOUT_MS = 120_000;

/**
 * Plays the ad and says how it ended. Never throws: a network that errors out is just `failed`, and so is
 * one that never reports back within `timeoutMs` (an ad closed by an extension, a backgrounded tab), so the
 * visitor is not left with a button that stays disabled.
 */
export async function showRewardedAd(provider: RewardedAdProvider, timeoutMs: number = AD_TIMEOUT_MS): Promise<RewardedAdResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<'failed'>((resolve) => {
    timer = setTimeout(() => resolve('failed'), timeoutMs);
  });
  try {
    return await Promise.race([provider.show(), timedOut]);
  } catch {
    return 'failed';
  } finally {
    clearTimeout(timer);
  }
}
