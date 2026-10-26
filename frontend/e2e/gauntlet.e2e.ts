// frontend/e2e/gauntlet.e2e.ts
//
// A Gauntlet streak run for a new account: start a run, win a match (the streak and the best go up,
// one killer is completed), reload (the run is kept on the server), lose (the streak resets, the
// best stays, progress starts over).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { clickUntil, mainShows, mainText, open, signUpFresh, sharedBrowser } from './helpers';

const newPage = sharedBrowser();

/** Click WON or LOST and wait until the server has recorded it. */
async function report(page: Page, outcome: 'WON' | 'LOST'): Promise<void> {
  const saved = page.waitForResponse((r) => r.url().endsWith('/api/v1/gauntlet-streak/result'));
  await page.getByRole('button', { name: outcome, exact: true }).click();
  assert.equal((await saved).status(), 200);
}

describe('gauntlet journey', () => {
  it('a win counts, survives a reload, and a loss resets the streak but keeps the best', async () => {
    const page = await newPage();
    await open(page, '/en');
    await signUpFresh(page, 'e2e_gauntlet');
    await open(page, '/en/streaks/killer/gauntlet-streak');

    await mainShows(page, 'Current 0');
    const progress = (await mainText(page)).match(/completed: 0 \/ (\d+)/);
    assert.ok(progress, 'a new account has completed no killer');
    const owned = Number(progress[1]);
    assert.ok(owned > 0, 'a new account owns the free killers');

    await clickUntil(page.getByRole('button', { name: 'START GAME' }), page.getByRole('button', { name: 'WON', exact: true }));
    await report(page, 'WON');
    await mainShows(page, `Current 1 Best 1`);
    await mainShows(page, `Completed: 1 / ${owned}`);

    await page.reload({ waitUntil: 'load' });
    await mainShows(page, `Completed: 1 / ${owned}`);
    await mainShows(page, `Current 1 Best 1`);

    await page.getByRole('button', { name: 'LOST', exact: true }).waitFor();
    await report(page, 'LOST');
    await mainShows(page, `Current 0 Best 1`);
    await mainShows(page, `Completed: 0 / ${owned}`);
  });
});
