// frontend/src/__tests__/unit/utils/rewardedAd.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRewardedAdProvider, showRewardedAd, type RewardedAdProvider } from '@/utils/rewardedAd';

function providerShowing(show: RewardedAdProvider['show']): RewardedAdProvider {
  return { watchReady: () => () => undefined, show };
}

describe('showRewardedAd', () => {
  it('reports an ad that ran to the end as rewarded', async () => {
    assert.equal(await showRewardedAd(providerShowing(async () => 'rewarded')), 'rewarded');
  });

  it('reports an ad closed early as dismissed', async () => {
    assert.equal(await showRewardedAd(providerShowing(async () => 'dismissed')), 'dismissed');
  });

  it('turns an error from the ad network into failed instead of throwing', async () => {
    const broken = providerShowing(async () => {
      throw new Error('ad network unreachable');
    });
    assert.equal(await showRewardedAd(broken), 'failed');
  });
});

describe('showRewardedAd timeout', () => {
  it('gives up on an ad that never reports back', async () => {
    const silent = providerShowing(() => new Promise<never>(() => undefined));
    assert.equal(await showRewardedAd(silent, 10), 'failed');
  });

  it('does not cut a quick ad short', async () => {
    assert.equal(await showRewardedAd(providerShowing(async () => 'rewarded'), 1000), 'rewarded');
  });
});

describe('getRewardedAdProvider', () => {
  it('has no provider until an ad network is wired in, so the support dialog shows no ad', () => {
    assert.equal(getRewardedAdProvider(), null);
  });
});
