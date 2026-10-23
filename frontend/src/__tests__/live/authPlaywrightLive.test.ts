// frontend/src/__tests__/live/authPlaywrightLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "https://localhost").replace(/\/+$/, '');

test("Live Frontend Playwright E2E: Sign In, Admin Demo, Registration & Button Enablement", async () => {
  const browser: Browser = await chromium.launch({
    headless: true,
    args: ["--ignore-certificate-errors"],
  });
  const context: BrowserContext = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 },
  });
  const page: Page = await context.newPage();

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Navigate to Home and Open Sign In Modal
    // -------------------------------------------------------------------------
    await page.goto(`${BASE_URL}/en`, { waitUntil: "networkidle" });

    const signInNavBtn = page.getByRole("button", { name: "Sign In" }).first();
    await signInNavBtn.waitFor({ state: "visible" });
    await signInNavBtn.click();

    const modal = page.getByRole('dialog');
    await modal.waitFor({ state: "visible" });

    // -------------------------------------------------------------------------
    // Phase 2: Admin Demo Sign-In & Button State Verification
    // -------------------------------------------------------------------------
    const adminDemoBtn = page.getByRole("button", { name: /Admin/i });
    await adminDemoBtn.waitFor({ state: "visible" });
    await adminDemoBtn.click();

    const submitBtn = page.locator('form button[type="submit"]');
    await submitBtn.waitFor({ state: "attached" });

    // Verify the submit button is NOT disabled once ALTCHA PoW completes
    await page.waitForFunction(
      (btn) => !btn.hasAttribute("disabled"),
      await submitBtn.elementHandle(),
      { timeout: 8000 }
    );
    const isDisabled = await submitBtn.getAttribute("disabled");
    assert.strictEqual(isDisabled, null, "Sign in submit button must be enabled");

    // Click Sign In
    await submitBtn.click();

    // Verify that the user is authenticated as 'lemon' with 'admin' role in the sidebar
    const adminBadge = page.locator('span:has-text("admin")');
    await adminBadge.waitFor({ state: "visible", timeout: 8000 });
    const userText = page.locator('text=lemon').first();
    assert.ok(await userText.isVisible(), "Lemon admin username must be visible in sidebar");

    // -------------------------------------------------------------------------
    // Phase 3: Sign-Out Flow
    // -------------------------------------------------------------------------
    const signOutBtn = page.locator('button[aria-label="Sign Out"], button[aria-label="Wyloguj się"]');
    await signOutBtn.waitFor({ state: "visible" });
    await signOutBtn.click();

    // Confirm sidebar returns to guest state with "Sign In" button visible
    await signInNavBtn.waitFor({ state: "visible", timeout: 8000 });

    // -------------------------------------------------------------------------
    // Phase 4: Registration Flow via Modal & Legal Gate
    // -------------------------------------------------------------------------
    await signInNavBtn.click();
    await modal.waitFor({ state: "visible" });

    const registerSwitchBtn = page.locator('button:has-text("Register"), button:has-text("Zarejestruj")').first();
    await registerSwitchBtn.click();

    const ts = Date.now();
    const newLogin = `e2e_user_${ts}`;
    const newUsername = `Survivor_${ts}`;
    const newEmail = `e2e_${ts}@example.com`;
    const newPassword = "Password123!Secure";

    // Fill form inputs
    const inputs = page.locator('form input[type="text"], form input[type="email"], form input[type="password"]');
    await inputs.nth(0).fill(newLogin);
    await inputs.nth(1).fill(newUsername);
    await inputs.nth(2).fill(newEmail);
    await inputs.nth(3).fill(newPassword);

    // Accept legal terms
    const legalCheckbox = page.locator('input[type="checkbox"]').first();
    await legalCheckbox.check({ force: true });

    // Wait for the Create Account button to become enabled
    const createAccountBtn = page.locator('form button[type="submit"]');
    await page.waitForFunction(
      (btn) => !btn.hasAttribute("disabled"),
      await createAccountBtn.elementHandle(),
      { timeout: 8000 }
    );
    assert.strictEqual(await createAccountBtn.getAttribute("disabled"), null, "Create account button must be enabled");

    // Submit registration
    await createAccountBtn.click();
    await page.waitForTimeout(2000);

    // -------------------------------------------------------------------------
    // Phase 5: Invalid Credentials Handling & Button Re-Enablement
    // -------------------------------------------------------------------------
    // Return to main page and ensure signed out
    await page.goto(`${BASE_URL}/en`, { waitUntil: "networkidle" });
    const signOutIfPresent = page.locator('button[aria-label="Sign Out"], button[aria-label="Wyloguj się"]');
    if (await signOutIfPresent.count() > 0 && await signOutIfPresent.first().isVisible()) {
      await signOutIfPresent.first().click();
    }
    await signInNavBtn.waitFor({ state: "visible", timeout: 8000 });
    await signInNavBtn.click();
    await modal.waitFor({ state: "visible" });

    // Fill bad credentials for lemon
    await page.locator('form input[type="text"]').first().fill("lemon");
    await page.locator('form input[type="password"]').first().fill("definitelyWrongPassword999!");

    // Wait for PoW and submit
    await page.waitForFunction(
      (btn) => !btn.hasAttribute("disabled"),
      await submitBtn.elementHandle(),
      { timeout: 8000 }
    );
    await submitBtn.click();

    // Verify error banner is rendered
    const alertBox = page.locator('[role="alert"]');
    await alertBox.waitFor({ state: "visible", timeout: 8000 });
    assert.ok(await alertBox.isVisible(), "Error alert must be displayed on invalid credentials");

    // Verify submit button re-enables for next attempt (not stuck)
    await page.waitForFunction(
      (btn) => !btn.hasAttribute("disabled"),
      await submitBtn.elementHandle(),
      { timeout: 8000 }
    );
    assert.strictEqual(await submitBtn.getAttribute("disabled"), null, "Submit button must re-enable after failed login");

  } finally {
    await browser.close();
  }
});
