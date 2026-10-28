// frontend/e2e/tierList.e2e.ts
//
// Ranking on an official tier list as a guest: dragging a killer from Unranked into tier S moves it
// there (the unranked count drops), the ranking survives a reload, and Reset (after its confirmation)
// puts it back.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Locator, Page } from 'playwright';
import { mainShows, open, sharedBrowser } from './helpers';

const newPage = sharedBrowser();

/** Drag `item` onto `target` with real pointer moves (the board uses dnd-kit's pointer sensor). */
async function drag(page: Page, item: Locator, target: Locator): Promise<void> {
  const from = await item.boundingBox();
  const to = await target.boundingBox();
  assert.ok(from && to, 'both ends of the drag are on screen');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 5 }); // past the activation distance
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 });
  await page.mouse.up();
}

describe('tier list journey', () => {
  it('a killer dragged into tier S stays there after a reload, and Reset unranks it', async () => {
    const page = await newPage();
    await open(page, '/en/tier-lists/killers');
    const tierS = page.getByRole('region', { name: 'Tier S' });
    const unranked = page.getByRole('complementary', { name: 'Unranked' });
    const nurse = (scope: Locator) => scope.getByRole('button', { name: 'The Nurse', exact: true });
    const total = Number(((await unranked.innerText()).match(/(\d+) left/i) ?? [])[1]);
    assert.ok(total > 40, `unranked count: ${total}`);

    for (let attempt = 0; attempt < 5 && (await nurse(tierS).count()) === 0; attempt++) {
      await drag(page, nurse(unranked), tierS); // a drag before hydration does nothing: try again
      await page.waitForTimeout(500);
    }
    await nurse(tierS).waitFor();
    assert.equal(await nurse(unranked).count(), 0);
    await mainShows(page, `${total - 1} left`);

    await page.reload({ waitUntil: 'load' });
    await nurse(tierS).waitFor();
    await mainShows(page, `${total - 1} left`);

    await page.getByRole('toolbar', { name: 'Tier list actions' }).getByRole('button', { name: 'Reset' }).click();
    await page.getByRole('dialog', { name: 'Reset this tier list?' }).getByRole('button', { name: 'Reset' }).click();
    await nurse(unranked).waitFor();
    await mainShows(page, `${total} left`);
  });
});
