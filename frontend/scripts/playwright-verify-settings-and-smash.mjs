// frontend/scripts/playwright-verify-settings-and-smash.mjs
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../../playwright/verification');
const ARTIFACT_DIR = 'C:/Users/bezie/.gemini/antigravity/brain/311c8978-4571-4fef-ae7d-d322286a863d/screenshots';

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const BASE_URL = 'http://localhost:3005';

const VIEWPORTS = [
  { name: 'desktop-1920', width: 1920, height: 1080, touch: false, isMobile: false },
  { name: 'laptop-1280', width: 1280, height: 800, touch: false, isMobile: false },
  { name: 'tablet-768', width: 768, height: 1024, touch: true, isMobile: true },
  { name: 'mobile-390', width: 390, height: 844, touch: true, isMobile: true },
  { name: 'mobile-375', width: 375, height: 667, touch: true, isMobile: true },
  { name: 'mobile-320', width: 320, height: 568, touch: true, isMobile: true },
];

async function run() {
  console.log(`Starting Playwright cross-device verification on ${BASE_URL}...`);
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = {
    settings: {},
    smashPopup: {},
  };

  // 1. Test Settings Page across viewports
  for (const vp of VIEWPORTS) {
    console.log(`\n--- [Settings] Testing viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.touch,
      isMobile: vp.isMobile,
    });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/en/settings`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1200);

    // Assert custom icons are in the DOM (check for SVG elements in header cards)
    const svgs = await page.evaluate(() => {
      return document.querySelectorAll('svg').length;
    });
    console.log(`[${vp.name}] Settings SVG count: ${svgs}`);

    const shotPath = path.join(OUT_DIR, `settings-${vp.name}.png`);
    const artifactPath = path.join(ARTIFACT_DIR, `settings-${vp.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });
    fs.copyFileSync(shotPath, artifactPath);
    console.log(`[${vp.name}] Saved Settings screenshot: ${shotPath}`);

    results.settings[vp.name] = { svgCount: svgs, screenshot: shotPath };
    await context.close();
  }

  // 2. Test Smash or Pass popup across viewports
  for (const vp of VIEWPORTS) {
    console.log(`\n--- [Smash or Pass Popup] Testing viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.touch,
      isMobile: vp.isMobile,
    });
    const page = await context.newPage();

    // Clear localStorage before navigation so prompt modal is shown
    await page.goto(`${BASE_URL}/en/smash-or-pass`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/en/smash-or-pass`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);

    // Verify modal is visible
    const modal = page.locator('[data-testid="preferences-prompt-modal"]');
    const isVisible = await modal.isVisible();
    console.log(`[${vp.name}] Prompt Modal is visible: ${isVisible}`);

    // Check modal bounds and overflow
    const bounds = await modal.boundingBox();
    console.log(`[${vp.name}] Modal bounds:`, bounds);

    const shotPath = path.join(OUT_DIR, `smash-prompt-${vp.name}.png`);
    const artifactPath = path.join(ARTIFACT_DIR, `smash-prompt-${vp.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    fs.copyFileSync(shotPath, artifactPath);
    console.log(`[${vp.name}] Saved Smash Prompt screenshot: ${shotPath}`);

    // Verify touch target sizes of buttons
    const buttons = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="preferences-prompt-modal"]');
      if (!modal) return [];
      const btns = Array.from(modal.querySelectorAll('button'));
      return btns.map((b) => {
        const r = b.getBoundingClientRect();
        return { text: b.textContent?.trim(), width: r.width, height: r.height };
      });
    });
    console.log(`[${vp.name}] Modal buttons:`, buttons);

    results.smashPopup[vp.name] = { isVisible, bounds, buttons, screenshot: shotPath };

    // On mobile-375 test button interaction: click "Enter Trial" / "I Understand & Enter Trial"
    if (vp.name === 'mobile-375') {
      const enterBtn = page.getByRole('button', { name: /Enter Trial|Continue with Defaults/i });
      await enterBtn.click();
      await page.waitForTimeout(600);
      const stillVisible = await modal.isVisible();
      console.log(`[mobile-375] Modal visible after clicking Enter Trial: ${stillVisible}`);
      const afterShot = path.join(OUT_DIR, `smash-after-defaults-mobile-375.png`);
      const afterArtifact = path.join(ARTIFACT_DIR, `smash-after-defaults-mobile-375.png`);
      await page.screenshot({ path: afterShot, fullPage: false });
      fs.copyFileSync(afterShot, afterArtifact);
      console.log(`[mobile-375] Saved after-defaults screenshot: ${afterShot}`);
    }

    await context.close();
  }

  await browser.close();
  console.log('\nAll Playwright visual verifications complete!');
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
