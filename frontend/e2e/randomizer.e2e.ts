// frontend/e2e/randomizer.e2e.ts
//
// The perk randomizer as a guest: a roll fills the four slots with four different perks, no-repeat
// mode takes them out of the pool (the counter drops by four and the next roll deals none of them
// again), and switching to Killer rolls from the killer pool.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { clickUntil, open, sharedBrowser } from './helpers';

const newPage = sharedBrowser();

const slotButtons = (page: Page) => page.getByRole('main').getByRole('button', { name: / - / });

/** The rolled perks, read from the slot buttons' names ("Sprint Burst - Meg Thomas"). */
async function rolledPerks(page: Page): Promise<string[]> {
  await slotButtons(page).nth(3).waitFor();
  return slotButtons(page).evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? el.textContent ?? ''));
}

const counter = (page: Page) => page.getByRole('button', { name: 'Toggle No-Repeat Perks' });

/** The no-repeat counter, "remaining/total". */
async function pool(page: Page): Promise<{ left: number; total: number }> {
  const [left, total] = (await counter(page).innerText()).trim().split('/').map(Number);
  return { left, total };
}

/** Wait until the counter shows `left` perks remaining. */
async function poolReaches(page: Page, left: number): Promise<void> {
  const button = await counter(page).elementHandle();
  await page.waitForFunction(([el, n]) => (el as HTMLElement).innerText.trim().startsWith(`${n}/`), [button, left] as const);
}

describe('randomizer journey', () => {
  it('rolls four different perks and no-repeat keeps them out of the next roll', async () => {
    const page = await newPage();
    await open(page, '/en/randomizer');
    const roll = page.getByRole('button', { name: 'Roll 4-Perk Loadout' });
    const before = await pool(page);
    assert.equal(before.left, before.total, 'a fresh guest starts with the full survivor pool');

    await clickUntil(roll, slotButtons(page).nth(3));
    await poolReaches(page, before.total - 4);
    const first = await rolledPerks(page);
    assert.equal(new Set(first).size, 4, `four different perks: ${first.join(' | ')}`);

    await roll.click();
    await poolReaches(page, before.total - 8);
    const second = await rolledPerks(page);
    assert.equal(second.filter((p) => first.includes(p)).length, 0, 'no perk dealt twice');
  });

  it('switching to Killer rolls from the killer pool', async () => {
    const page = await newPage();
    await open(page, '/en/randomizer');
    const survivorTotal = (await pool(page)).total;
    await clickUntil(
      page.getByRole('radiogroup', { name: 'Select Role' }).getByText('Killer', { exact: true }),
      page.getByRole('radio', { name: 'Killer', checked: true })
    );
    const killerPool = await pool(page);
    assert.notEqual(killerPool.total, survivorTotal, 'the killer pool is a different set');
    assert.equal(killerPool.left, killerPool.total);
    await page.getByRole('button', { name: 'Roll 4-Perk Loadout' }).click();
    await poolReaches(page, killerPool.total - 4);
    assert.equal(new Set(await rolledPerks(page)).size, 4);
  });
});
