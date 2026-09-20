// frontend/scripts/verify-perks-page.mjs
//
// Cross-browser / cross-resolution verification for the Perks Vault page,
// written to confirm the list-view toggle was fully removed and the grid
// layout holds up everywhere. Run this against a live stack (e.g. after
// `docker compose up -d --build`):
//
//   cd frontend
//   npx playwright install chromium firefox webkit   # once, if not installed
//   node scripts/verify-perks-page.mjs
//
// Optional env vars:
//   PERKS_BASE_URL   (default: https://localhost)
//   PERKS_PATH       (default: /en/perks)

import { chromium, firefox, webkit } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.PERKS_BASE_URL || 'https://localhost';
const PERKS_PATH = process.env.PERKS_PATH || '/en/perks';
const URL = `${BASE_URL}${PERKS_PATH}`;
const OUT_DIR = path.join(__dirname, '..', 'playwright-perks-check');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Common real-world resolutions: mobile, tablet, and desktop.
const VIEWPORTS = [
  { name: 'mobile-iphone-se', width: 375, height: 667 },
  { name: 'mobile-iphone-12-13-14', width: 390, height: 844 },
  { name: 'mobile-iphone-14-pro-max', width: 430, height: 932 },
  { name: 'mobile-android-common', width: 360, height: 800 },
  { name: 'mobile-pixel-7', width: 412, height: 915 },
  { name: 'tablet-ipad', width: 768, height: 1024 },
  { name: 'tablet-ipad-pro', width: 1024, height: 1366 },
  { name: 'laptop-1280x720', width: 1280, height: 720 },
  { name: 'laptop-1366x768', width: 1366, height: 768 },
  { name: 'laptop-1440x900', width: 1440, height: 900 },
  { name: 'desktop-1536x864', width: 1536, height: 864 },
  { name: 'desktop-1920x1080', width: 1920, height: 1080 },
  { name: 'desktop-2560x1440', width: 2560, height: 1440 },
];

const ENGINES = [
  { name: 'chromium', launcher: chromium },
  { name: 'firefox', launcher: firefox },
  { name: 'webkit', launcher: webkit },
];

const results = [];

function log(line) {
  console.log(line);
}

async function checkOne(browserName, browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  const entry = {
    browser: browserName,
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
  };

  try {
    const response = await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    entry.httpStatus = response ? response.status() : null;

    // Wait for either the perks grid or the empty state to settle.
    await page
      .waitForSelector('section[aria-label] .grid, [role="status"], [class*="EmptyState"], main', {
        timeout: 15000,
      })
      .catch(() => {});
    await page.waitForTimeout(400);

    entry.listViewToggleGroupCount = await page.locator('[role="group"]').count();
    entry.gridContainerCount = await page.locator('.grid.grid-cols-5.grid-rows-3').count();
    entry.perkCardCount = await page
      .locator('.grid.grid-cols-5.grid-rows-3 > div > button')
      .count();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth + 1,
      };
    });
    entry.hasHorizontalOverflow = overflow.hasHorizontalOverflow;
    entry.scrollWidth = overflow.scrollWidth;
    entry.clientWidth = overflow.clientWidth;
    entry.consoleErrors = consoleErrors.slice(0, 10);

    const screenshotPath = path.join(OUT_DIR, `${browserName}__${viewport.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    entry.screenshot = path.relative(path.join(__dirname, '..'), screenshotPath);
    entry.ok =
      entry.httpStatus != null &&
      entry.httpStatus < 400 &&
      entry.listViewToggleGroupCount === 0 &&
      !entry.hasHorizontalOverflow;
  } catch (err) {
    entry.error = String(err);
    entry.ok = false;
  } finally {
    await context.close();
  }

  return entry;
}

async function main() {
  log(`Target URL: ${URL}\n`);

  for (const engine of ENGINES) {
    let browser;
    try {
      browser = await engine.launcher.launch({ headless: true });
    } catch (err) {
      log(`[${engine.name}] SKIPPED — could not launch (${err.message.split('\n')[0]})`);
      log(`  -> run: npx playwright install ${engine.name}`);
      continue;
    }

    log(`=== ${engine.name} ===`);
    for (const vp of VIEWPORTS) {
      const entry = await checkOne(engine.name, browser, vp);
      results.push(entry);
      const status = entry.ok ? 'PASS' : 'FAIL';
      log(
        `[${status}] ${engine.name} ${vp.name} (${vp.width}x${vp.height}) ` +
          `http=${entry.httpStatus ?? 'n/a'} listToggleGroups=${entry.listViewToggleGroupCount ?? 'n/a'} ` +
          `overflow=${entry.hasHorizontalOverflow ?? 'n/a'} perks=${entry.perkCardCount ?? 'n/a'}` +
          (entry.error ? ` error=${entry.error.split('\n')[0]}` : '')
      );
    }
    await browser.close();
  }

  const reportPath = path.join(OUT_DIR, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  const total = results.length;
  const passed = results.filter((r) => r.ok).length;
  log(`\n${passed}/${total} checks passed. Full report: ${path.relative(process.cwd(), reportPath)}`);
  log(`Screenshots: ${path.relative(process.cwd(), OUT_DIR)}/`);

  if (passed !== total) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
