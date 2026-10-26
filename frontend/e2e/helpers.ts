// frontend/e2e/helpers.ts
//
// Shared setup for the browser journeys in this folder. They drive the real site through the front
// door (nginx in the Docker stack) with Playwright: one browser per file, a fresh context per test.
// Run them with `npm run test:e2e`: scripts/run-e2e.ts switches ALTCHA and e-mail verification off for
// the run and deletes the accounts the journeys register.
//
// Env: E2E_BASE_URL, else NEXT_PUBLIC_API_URL, else https://localhost.
import { after, before } from 'node:test';
import { chromium, type Browser, type Locator, type Page } from 'playwright';

export const BASE_URL = (process.env.E2E_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'https://localhost').replace(/\/+$/, '');

/** A fresh page (own cookies and storage) per call; the browser is shared by the file. */
export function sharedBrowser(): () => Promise<Page> {
  let browser: Browser;
  before(async () => {
    browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
  });
  after(async () => {
    await browser?.close();
  });
  return async () => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
    context.setDefaultTimeout(15_000);
    return context.newPage();
  };
}

/** Open `path` (e.g. '/en/randomizer') and wait until the page has settled. */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
}

/** A login, username and e-mail no other run uses. The domain is one run-e2e.ts cleans up. */
export function freshAccount(prefix: string) {
  const id = `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return { login: id, username: id, email: `${id}@example.com`, password: 'E2e-Password-123!' };
}

/**
 * Click `target` until `expected` shows up. A click that lands before the page has hydrated does
 * nothing (slow in `next dev`), so a single click is not enough to rely on.
 */
export async function clickUntil(target: Locator, expected: Locator, attempts = 10): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    if (await expected.isVisible()) return;
    await target.click({ timeout: 2_000 }).catch(() => undefined);
    await expected.waitFor({ timeout: 2_000 }).catch(() => undefined); // not hydrated yet: click again
  }
  await expected.waitFor();
}

/** Close `dialog` with its `button`, retrying like clickUntil until the dialog is gone. */
export async function dismiss(dialog: Locator, button: string, attempts = 10): Promise<void> {
  for (let i = 0; i < attempts && (await dialog.isVisible()); i++) {
    await dialog.getByRole('button', { name: button }).click({ timeout: 2_000 }).catch(() => undefined);
    await dialog.waitFor({ state: 'hidden', timeout: 2_000 }).catch(() => undefined);
  }
  await dialog.waitFor({ state: 'hidden' });
}

/** The main region's visible text, whitespace collapsed and lower-cased (CSS may upper-case it). */
export async function mainText(page: Page): Promise<string> {
  return (await page.getByRole('main').innerText()).replace(/\s+/g, ' ').toLowerCase();
}

/** Wait until the main region shows `text` (compared like mainText). */
export async function mainShows(page: Page, text: string): Promise<void> {
  await page.waitForFunction(
    (t) => ((document.querySelector('main') as HTMLElement | null)?.innerText ?? '').replace(/\s+/g, ' ').toLowerCase().includes(t),
    text.replace(/\s+/g, ' ').toLowerCase()
  );
}

/** Open the sign-in dialog from the sidebar. */
export async function openSignIn(page: Page): Promise<Locator> {
  const dialog = page.getByRole('dialog', { name: 'Sign In' });
  await clickUntil(page.getByRole('complementary').getByRole('button', { name: 'Sign In' }), dialog);
  return dialog;
}

/**
 * Register a fresh account through the API in the page's own context, so the session cookie the
 * server sets signs the page in. Returns the account. (Signing up through the dialog is auth.e2e.ts.)
 */
export async function signUpFresh(page: Page, prefix: string) {
  const account = freshAccount(prefix);
  const res = await page.request.post(`${BASE_URL}/api/v1/auth/register`, { data: account, ignoreHTTPSErrors: true });
  if (res.status() !== 201) throw new Error(`register ${account.login}: ${res.status()} ${await res.text()}`);
  return account;
}

/** Sign in with the demo admin account (lemon) through the dialog's quick-fill button. */
export async function signInAsDemoAdmin(page: Page): Promise<void> {
  const dialog = await openSignIn(page);
  await dialog.getByRole('button', { name: 'Admin (lemon)' }).click();
  await dialog.getByRole('button', { name: 'Sign In' }).click();
  await dialog.waitFor({ state: 'hidden' });
}
