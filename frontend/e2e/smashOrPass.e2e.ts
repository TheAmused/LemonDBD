// frontend/e2e/smashOrPass.e2e.ts
//
// Smash or Pass as a guest: the safety dialog comes first, a smash and a pass are both sent to the
// server and counted in the header (cards left, smashes, passes, smash rate), and the session's votes
// survive a reload.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { dismiss, mainShows, mainText, open, sharedBrowser } from './helpers';

const newPage = sharedBrowser();

/** The header tally: "<left> left | <smashes> | <passes> | <rate>%". */
async function tally(page: Page) {
  const text = await mainText(page);
  const m = text.match(/(\d+) left \| (\d+) \| (\d+) \| (\d+)%/);
  assert.ok(m, `tally not found in: ${text.slice(0, 300)}`);
  const [left, smashes, passes, rate] = m.slice(1).map(Number);
  return { left, smashes, passes, rate };
}

/** Vote on the top card and wait for the server to accept it. */
async function vote(page: Page, choice: 'Smash' | 'Pass'): Promise<void> {
  const sent = page.waitForResponse((r) => r.url().endsWith('/api/v1/smash-or-pass/vote') && r.request().method() === 'POST');
  await page.getByRole('main').getByRole('button', { name: choice, exact: true }).last().click();
  assert.equal((await sent).status(), 200);
}

describe('smash or pass journey', () => {
  it('a smash and a pass are counted, sent, and still there after a reload', async () => {
    const page = await newPage();
    await open(page, '/en/smash-or-pass');
    await page.getByRole('dialog', { name: 'Trial Safety & Atmosphere' }).waitFor();
    await dismiss(page.getByRole('dialog', { name: 'Trial Safety & Atmosphere' }), 'I Understand & Enter Trial');

    const start = await tally(page);
    assert.deepEqual([start.smashes, start.passes], [0, 0], 'a new guest has not voted');

    await vote(page, 'Smash');
    await mainShows(page, `${start.left - 1} left`);
    assert.deepEqual(await tally(page), { left: start.left - 1, smashes: 1, passes: 0, rate: 100 });

    await vote(page, 'Pass');
    await mainShows(page, `${start.left - 2} left`);
    assert.deepEqual(await tally(page), { left: start.left - 2, smashes: 1, passes: 1, rate: 50 });

    await page.reload({ waitUntil: 'load' });
    await mainShows(page, `${start.left - 2} left`);
    assert.deepEqual(await tally(page), { left: start.left - 2, smashes: 1, passes: 1, rate: 50 });
  });
});
