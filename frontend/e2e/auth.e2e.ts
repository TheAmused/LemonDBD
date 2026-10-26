// frontend/e2e/auth.e2e.ts
//
// Signing in, out and up through the sign-in dialog in a real browser: the demo admin quick-fill, the
// sidebar switching between guest and signed-in state, registration behind the terms checkbox, and a
// wrong password leaving the form usable.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Locator } from 'playwright';
import { freshAccount, open, openSignIn, signInAsDemoAdmin, sharedBrowser } from './helpers';

const newPage = sharedBrowser();

/** The dialog's text fields in order (they are labelled by adjacent text, not <label for>). */
const fields = (dialog: Locator) => dialog.locator('input:not([type="checkbox"])');

describe('auth journeys', () => {
  it('the demo admin signs in, the sidebar shows the account, and signing out returns to guest', async () => {
    const page = await newPage();
    await open(page, '/en');
    await signInAsDemoAdmin(page);

    const sidebar = page.getByRole('complementary');
    await sidebar.getByText('lemon', { exact: true }).first().waitFor();
    await sidebar.getByRole('button', { name: 'Sign Out' }).click();
    await sidebar.getByRole('button', { name: 'Sign In' }).waitFor();
  });

  it('a new account is created only after the terms are accepted', async () => {
    const page = await newPage();
    const account = freshAccount('e2e_signup');
    await open(page, '/en');
    await openSignIn(page);
    await page.getByRole('button', { name: "Don't have an account? Register" }).click();
    const dialog = page.getByRole('dialog', { name: 'Create Account' });
    const inputs = fields(dialog);
    await inputs.nth(0).fill(account.login);
    await inputs.nth(1).fill(account.username);
    await inputs.nth(2).fill(account.email);
    await inputs.nth(3).fill(account.password);

    const create = dialog.getByRole('button', { name: 'Create Account' });
    const sent: string[] = [];
    page.on('request', (r) => r.url().endsWith('/api/v1/auth/register') && sent.push(r.url()));
    await create.click();
    await page.waitForTimeout(500);
    assert.deepEqual(sent, [], 'nothing is sent while the terms are unticked');

    await dialog.getByRole('checkbox').check();
    const registered = page.waitForResponse((r) => r.url().endsWith('/api/v1/auth/register'));
    await create.click();
    assert.equal((await registered).status(), 201);
  });

  it('a wrong password shows an error and leaves the form ready for another try', async () => {
    const page = await newPage();
    await open(page, '/en');
    const dialog = await openSignIn(page);
    await fields(dialog).nth(0).fill('lemon');
    await fields(dialog).nth(1).fill('definitely-not-the-password');
    const submit = dialog.getByRole('button', { name: 'Sign In' });
    await submit.click();
    await dialog.getByRole('alert').waitFor();
    assert.equal(await submit.isEnabled(), true);
    assert.equal(await dialog.isVisible(), true, 'the dialog stays open');
  });
});
