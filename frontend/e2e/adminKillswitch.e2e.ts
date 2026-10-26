// frontend/e2e/adminKillswitch.e2e.ts
//
// An admin action end to end: the admin switches the Gauntlet off in Admin > Availability with a
// reason, a player opening the Gauntlet sees that reason instead of the game, and switching it back on
// gives the player the game again. The mode is switched back on at the end even if a step fails.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { BASE_URL, clickUntil, mainShows, open, signInAsDemoAdmin, signUpFresh, sharedBrowser } from './helpers';

const newPage = sharedBrowser();

/** Wait for the admin panel's save of the Gauntlet switch and check it went through. */
async function savedGauntlet(admin: Page, act: () => Promise<void>): Promise<void> {
  const saved = admin.waitForResponse((r) => r.url().endsWith('/api/v1/admin/challenge-modes/gauntlet') && r.request().method() === 'PUT');
  await act();
  assert.equal((await saved).status(), 200);
}

describe('admin killswitch journey', () => {
  it('a mode switched off in the admin panel shows its reason to players until switched back on', async () => {
    const admin = await newPage();
    await open(admin, '/en');
    await signInAsDemoAdmin(admin);
    const reason = `E2E maintenance ${Date.now().toString(36)}`;
    try {
      await open(admin, '/en/admin');
      await clickUntil(admin.getByRole('tab', { name: 'Availability' }), admin.getByRole('switch', { name: 'Gauntlet' }));
      assert.equal(await admin.getByRole('switch', { name: 'Gauntlet' }).isChecked(), true, 'the Gauntlet starts enabled');

      await admin.getByRole('switch', { name: 'Gauntlet' }).click();
      const dialog = admin.getByRole('dialog', { name: 'Disable Gauntlet?' });
      await dialog.getByRole('textbox', { name: 'Reason (shown to players)' }).fill(reason);
      await savedGauntlet(admin, () => dialog.getByRole('button', { name: 'Disable' }).click());
      await admin.getByRole('switch', { name: 'Gauntlet', checked: false }).waitFor();

      const player = await newPage();
      await open(player, '/en');
      await signUpFresh(player, 'e2e_killswitch');
      await open(player, '/en/streaks/killer/gauntlet-streak');
      await mainShows(player, reason);
      assert.equal(await player.getByRole('button', { name: 'START GAME' }).count(), 0, 'no way to start a run');

      await savedGauntlet(admin, () => admin.getByRole('switch', { name: 'Gauntlet' }).click());
      await admin.getByRole('switch', { name: 'Gauntlet', checked: true }).waitFor();
      await player.reload({ waitUntil: 'load' });
      await player.getByRole('button', { name: 'START GAME' }).waitFor();
    } finally {
      // Never leave the dev stack with the Gauntlet off, whatever failed above.
      const res = await admin.request.put(`${BASE_URL}/api/v1/admin/challenge-modes/gauntlet`, { data: { is_enabled: true } });
      if (!res.ok()) console.error(`could not switch the Gauntlet back on (${res.status()}): do it in Admin > Availability`);
    }
  });
});
