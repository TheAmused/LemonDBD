// frontend/scripts/site-tour.mjs
// Automated cross-viewport screenshot runner for LemonDBD.
// Captures responsive pages and interactive modals across desktop, laptop, tablet, and mobile,
// generating an offline visual manifest and HTML5 explorer.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { VIEWPORTS, PAGE_ROUTES, MODAL_TARGETS, CATEGORIES } from './site-tour-catalog.mjs';
import { writeGalleryFile } from './site-tour-gallery.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SCREENSHOTS_DIR = path.resolve(PROJECT_ROOT, 'additions/screenshots');

export function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    update: false,
    page: null,
    category: null,
    modalsOnly: false,
    pagesOnly: false,
    viewports: null,
    baseUrl: (process.env.PLAYWRIGHT_BASE_URL || 'https://localhost').replace(/\/+$/, ''),
    headless: true,
    timeout: 15000,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') options.help = true;
    else if (a === '--update') options.update = true;
    else if (a === '--modals-only') options.modalsOnly = true;
    else if (a === '--pages-only') options.pagesOnly = true;
    else if (a === '--quick') options.viewports = ['desktop', 'mobile'];
    else if (a === '--no-headless' || a === '--headless=false') options.headless = false;
    else if (a === '--headless' || a === '--headless=true') options.headless = true;
    else if (a.startsWith('--page=')) options.page = a.slice(7).trim();
    else if (a === '--page' && i + 1 < argv.length) options.page = argv[++i].trim();
    else if (a.startsWith('--category=')) options.category = a.slice(11).trim();
    else if (a === '--category' && i + 1 < argv.length) options.category = argv[++i].trim();
    else if (a.startsWith('--viewports=')) options.viewports = a.slice(12).split(',').map((v) => v.trim()).filter(Boolean);
    else if (a === '--viewports' && i + 1 < argv.length) options.viewports = argv[++i].split(',').map((v) => v.trim()).filter(Boolean);
    else if (a.startsWith('--base-url=')) options.baseUrl = a.slice(11).trim().replace(/\/+$/, '');
    else if (a === '--base-url' && i + 1 < argv.length) options.baseUrl = argv[++i].trim().replace(/\/+$/, '');
    else if (a.startsWith('--timeout=')) options.timeout = Number.parseInt(a.slice(10), 10) || 15000;
  }
  return options;
}

export function printHelp() {
  console.log(`
LemonDBD Playwright Automated Site Tour Suite

Usage:
  node scripts/site-tour.mjs [options]

Options:
  --update             Overwrite existing screenshots and re-capture
  --page=<id|route>    Filter to a single page route or id (e.g. --page=landing)
  --category=<id>      Filter to items matching category
                       (${CATEGORIES.map((c) => c.id).join(', ')})
  --pages-only         Capture only full-page routes (skip modals)
  --modals-only        Capture only interactive modal dialogs (skip pages)
  --viewports=<list>   Comma-separated viewport list (desktop,laptop,tablet,mobile)
  --quick              Shortcut for --viewports=desktop,mobile
  --base-url=<url>     Target application URL (default: https://localhost)
  --headless[=false]   Run browser in headless mode (default: true)
  --timeout=<ms>       Navigation & wait timeout in ms (default: 15000)
  --help, -h           Show this help message and exit

Examples:
  node scripts/site-tour.mjs --quick
  node scripts/site-tour.mjs --page=landing --viewports=desktop
  node scripts/site-tour.mjs --update --modals-only
`);
}

export async function solveAltchaChallenge(request, baseUrl) {
  try {
    const res = await request.get(`${baseUrl}/api/v1/auth/altcha-challenge`, { timeout: 5000 });
    if (!res.ok()) return null;
    const ch = await res.json();
    const max = ch.maxnumber || 50000;
    for (let n = 0; n <= max; n++) {
      const hash = crypto.createHash('sha256').update(`${ch.salt}${n}`).digest('hex');
      if (hash === ch.challenge) {
        return {
          algorithm: ch.algorithm,
          challenge: ch.challenge,
          number: n,
          salt: ch.salt,
          signature: ch.signature,
          expires: ch.expires,
          maxnumber: ch.maxnumber,
        };
      }
    }
  } catch (_err) {
    // Challenge optional if ALTCHA disabled
  }
  return null;
}

export async function authenticateRole(context, baseUrl, role, demoAccounts = null) {
  const creds = demoAccounts?.[role] || (role === 'admin' ? { login: 'lemon', password: 'lemon' } : { login: 'user', password: 'user' });

  try {
    const altchaPayload = await solveAltchaChallenge(context.request, baseUrl);
    const postBody = { login: creds.login, login_or_email: creds.login, password: creds.password };
    if (altchaPayload) postBody.altcha = altchaPayload;

    const res = await context.request.post(`${baseUrl}/api/v1/auth/login`, { data: postBody, timeout: 8000 });
    if (res.ok()) return true;
    console.warn(`[Auth] Login attempt for role '${role}' returned status ${res.status()}`);
    return false;
  } catch (err) {
    console.warn(`[Auth] Could not authenticate as '${role}':`, err.message);
    return false;
  }
}

export async function setDismissSmashPromptPreState(page) {
  await page.evaluate(() => {
    try { localStorage.setItem('smash-preferences-prompt-dismissed', 'true'); } catch (_e) {}
  }).catch(() => {});
}

async function stabilize(page, ms = 500) {
  await page.waitForTimeout(ms);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
}

function recordItem(itemsMap, target, vp, type, relPath, stat) {
  const itemId = `${target.id}-${vp.id}`;
  itemsMap.set(itemId, {
    id: itemId,
    name: target.title,
    title: target.title,
    route: target.route,
    type,
    category: target.category || 'other',
    device: vp.id,
    viewport: vp.id,
    width: vp.width,
    height: vp.height,
    path: relPath,
    filesize: formatFileSize(stat.size),
    timestamp: new Date(stat.mtimeMs || Date.now()).toISOString(),
  });
}

export function printSummaryTable(summary) {
  const line = '='.repeat(82);
  console.log(`\n${line}`);
  console.log('                        LemonDBD Site Tour Runner Summary');
  console.log(line);
  console.log(`Target Base URL   : ${summary.baseUrl}`);
  console.log(`Viewports         : ${summary.viewports.join(', ')}`);
  console.log(`Pages Processed   : ${summary.pageCount}`);
  console.log(`Modals Processed  : ${summary.modalCount}`);
  console.log(`Total Screenshots : ${summary.totalScreenshots}`);
  console.log(`  -> Captured     : ${summary.capturedCount}`);
  console.log(`  -> Cached       : ${summary.cachedCount}`);
  console.log(`  -> Failed       : ${summary.failedCount}`);
  console.log(`Elapsed Time      : ${(summary.elapsedMs / 1000).toFixed(2)}s`);
  console.log(`Manifest Location : ${summary.manifestPath}`);
  console.log(`Visual Explorer   : ${summary.galleryPath}`);
  console.log(`${line}\n`);
}

export async function runTour(options = {}) {
  const startTime = Date.now();
  const config = { ...parseArgs([]), ...options };
  const outDir = SCREENSHOTS_DIR;
  const manifestPath = path.join(outDir, 'manifest.json');
  const galleryPath = path.join(outDir, 'index.html');
  fs.mkdirSync(outDir, { recursive: true });

  const itemsMap = new Map();
  if (fs.existsSync(manifestPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (Array.isArray(existing?.items)) {
        for (const item of existing.items) if (item?.id) itemsMap.set(item.id, item);
      }
    } catch (_e) {
      console.warn(`Could not parse existing manifest at ${manifestPath}, creating fresh.`);
    }
  }

  const activeViewports = config.viewports
    ? VIEWPORTS.filter((v) => config.viewports.some((vpName) => vpName.toLowerCase() === v.id.toLowerCase()))
    : VIEWPORTS;

  if (activeViewports.length === 0) {
    console.error('No matching viewports found for:', config.viewports);
    return { failedCount: 1 };
  }

  const matchesFilter = (item) => {
    if (config.category && item.category.toLowerCase() !== config.category.toLowerCase() && item.category !== 'modals') return false;
    if (config.page) {
      const q = config.page.toLowerCase();
      return item.id.toLowerCase() === q || item.route.toLowerCase() === q || item.id.toLowerCase().includes(q);
    }
    return true;
  };

  const activePages = config.modalsOnly ? [] : PAGE_ROUTES.filter(matchesFilter);
  const activeModals = config.pagesOnly ? [] : MODAL_TARGETS.filter(matchesFilter);

  console.log(`\nStarting LemonDBD Site Tour Automation...`);
  console.log(`Base URL  : ${config.baseUrl}`);
  console.log(`Viewports : ${activeViewports.map((v) => v.id).join(', ')}`);
  console.log(`Pages     : ${activePages.length} routes`);
  console.log(`Modals    : ${activeModals.length} interactive targets\n`);

  const browser = await chromium.launch({
    headless: config.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  let demoAccounts = null;
  try {
    const demoRes = await browser.newContext({ ignoreHTTPSErrors: true }).then((ctx) =>
      ctx.request.get(`${config.baseUrl}/api/v1/auth/demo-accounts`, { timeout: 3000 })
    );
    if (demoRes.ok()) {
      const demoData = await demoRes.json();
      if (demoData?.accounts) {
        demoAccounts = {
          admin: demoData.accounts.find((a) => a.role === 'admin'),
          user: demoData.accounts.find((a) => a.role === 'user'),
        };
      }
    }
  } catch (_e) {}

  let capturedCount = 0;
  let cachedCount = 0;
  let failedCount = 0;

  for (const vp of activeViewports) {
    console.log(`\n--- Viewport: ${vp.name} (${vp.id}: ${vp.width}x${vp.height}) ---`);
    const contextOptions = {
      viewport: { width: vp.width, height: vp.height },
      hasTouch: Boolean(vp.hasTouch ?? vp.touch),
      isMobile: Boolean(vp.isMobile),
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      ignoreHTTPSErrors: true,
    };
    if (vp.userAgent) contextOptions.userAgent = vp.userAgent;

    const context = await browser.newContext(contextOptions);
    let currentAuthRole = null;

    // 1. Capture Full Page Routes
    for (const route of activePages) {
      const pageDir = path.join(outDir, 'pages', route.folder);
      const filePath = path.join(pageDir, `${vp.id}.png`);
      const relPath = `pages/${route.folder}/${vp.id}.png`.replace(/\\/g, '/');

      if (!config.update && fs.existsSync(filePath)) {
        recordItem(itemsMap, route, vp, 'page', relPath, fs.statSync(filePath));
        cachedCount++;
        console.log(`  [CACHED] Page: ${route.id} (${vp.id}) -> ${relPath}`);
        continue;
      }

      fs.mkdirSync(pageDir, { recursive: true });
      const page = await context.newPage();
      try {
        if (route.requiresAuth && currentAuthRole !== route.requiresAuth) {
          await authenticateRole(context, config.baseUrl, route.requiresAuth, demoAccounts);
          currentAuthRole = route.requiresAuth;
        } else if (!route.requiresAuth && currentAuthRole) {
          await context.clearCookies();
          currentAuthRole = null;
        }

        await page.goto(`${config.baseUrl}${route.route}`, { waitUntil: 'domcontentloaded', timeout: config.timeout });
        await setDismissSmashPromptPreState(page);
        if (route.waitForSelector) {
          await page.waitForSelector(route.waitForSelector, { timeout: 8000 }).catch(() => {});
        }
        await stabilize(page, 500);
        await page.screenshot({ path: filePath, fullPage: false });

        recordItem(itemsMap, route, vp, 'page', relPath, fs.statSync(filePath));
        capturedCount++;
        console.log(`  [OK] Page: ${route.id} (${vp.id}) -> ${relPath} (${formatFileSize(fs.statSync(filePath).size)})`);
      } catch (err) {
        failedCount++;
        console.warn(`  [FAIL] Page: ${route.id} (${vp.id}): ${err.message}`);
      } finally {
        await page.close().catch(() => {});
      }
    }

    // 2. Capture Interactive Modals
    for (const target of activeModals) {
      if (target.viewports && !target.viewports.includes(vp.id)) continue;

      const modalDir = path.join(outDir, 'modals', target.folder);
      const filePath = path.join(modalDir, `${vp.id}.png`);
      const relPath = `modals/${target.folder}/${vp.id}.png`.replace(/\\/g, '/');

      if (!config.update && fs.existsSync(filePath)) {
        recordItem(itemsMap, target, vp, 'modal', relPath, fs.statSync(filePath));
        cachedCount++;
        console.log(`  [CACHED] Modal: ${target.id} (${vp.id}) -> ${relPath}`);
        continue;
      }

      fs.mkdirSync(modalDir, { recursive: true });
      const page = await context.newPage();
      try {
        if (target.requiresAuth && currentAuthRole !== target.requiresAuth) {
          await authenticateRole(context, config.baseUrl, target.requiresAuth, demoAccounts);
          currentAuthRole = target.requiresAuth;
        } else if (!target.requiresAuth && currentAuthRole) {
          await context.clearCookies();
          currentAuthRole = null;
        }

        await page.goto(`${config.baseUrl}${target.route}`, { waitUntil: 'domcontentloaded', timeout: config.timeout });

        if (target.setup === 'clearPreferencesDismissed' || target.setup === 'clearSmashPrompt') {
          await page.evaluate(() => { try { localStorage.removeItem('smash-preferences-prompt-dismissed'); } catch (_e) {} }).catch(() => {});
          await page.reload({ waitUntil: 'domcontentloaded', timeout: config.timeout });
        } else if (target.setup === 'enableMapsVoiceMode') {
          await page.evaluate(() => { try { localStorage.setItem('lemondbd_maps_search_mode', 'voice'); } catch (_e) {} }).catch(() => {});
          await page.reload({ waitUntil: 'domcontentloaded', timeout: config.timeout });
        } else if (target.id === 'admin-user-edit') {
          await page.evaluate(() => { try { localStorage.setItem('lemondbd_admin_tab', 'users'); } catch (_e) {} }).catch(() => {});
          const usersTab = page.locator('button[role="tab"]:has-text("Users"), button[role="tab"]:has-text("Użytkownicy"), [data-tab="users"]').first();
          if (await usersTab.isVisible().catch(() => false)) {
            await usersTab.click().catch(() => {});
            await page.waitForTimeout(300);
          }
        } else if (target.id === 'streaks-scoreboard') {
          await page.evaluate(() => { try { localStorage.setItem('lemondbd_admin_tab', 'tools'); } catch (_e) {} }).catch(() => {});
          const toolsTab = page.locator('button[role="tab"]:has-text("Tools"), button[role="tab"]:has-text("Narzędzia"), [data-tab="tools"]').first();
          if (await toolsTab.isVisible().catch(() => false)) {
            await toolsTab.click().catch(() => {});
            await page.waitForTimeout(300);
          }
        }

        await stabilize(page, 500);

        if (target.triggerSelector) {
          if ((vp.id === 'mobile' || vp.id === 'tablet') && target.folder.startsWith('sidebar-')) {
            const hasVisible = (await page.locator(target.triggerSelector).locator('visible=true').count().catch(() => 0)) > 0;
            if (!hasVisible) {
              const drawerToggle = page.locator('[data-testid="mobile-drawer-toggle"], button[aria-label*="menu" i]').first();
              if (await drawerToggle.isVisible().catch(() => false)) {
                await drawerToggle.click().catch(() => {});
                await page.waitForTimeout(400);
              }
            }
          }

          if (target.id === 'admin-user-edit') {
            const hasVisible = (await page.locator(target.triggerSelector).locator('visible=true').count().catch(() => 0)) > 0;
            if (!hasVisible) {
              const actionMenuBtn = page.locator('table button[aria-label*="actions" i], [role="table"] button[aria-label*="actions" i], button[aria-label*="akcj" i]').first();
              if (await actionMenuBtn.isVisible().catch(() => false)) {
                await actionMenuBtn.click().catch(() => {});
                await page.waitForTimeout(350);
              }
            }
          }

          let triggerLocator = page.locator(target.triggerSelector).locator('visible=true').first();
          if ((await triggerLocator.count().catch(() => 0)) === 0) {
            triggerLocator = page.locator(target.triggerSelector).first();
          }

          await triggerLocator.waitFor({ state: 'visible', timeout: 5000 });
          if (target.action === 'dblclick') {
            await triggerLocator.dblclick({ timeout: 5000 });
          } else {
            await triggerLocator.click({ timeout: 5000 });
          }

          if (target.id === 'auth-register' || target.setup === 'openAuthRegister') {
            const regTab = page.locator('button:has-text("Sign Up"), button:has-text("Register"), button:has-text("Rejestracja"), [data-testid="auth-register-tab"]').first();
            if (await regTab.isVisible({ timeout: 2000 }).catch(() => false)) {
              await regTab.click().catch(() => {});
            }
          }
        }

        try {
          await page.waitForSelector(target.modalSelector, { state: 'visible', timeout: 5000 });
        } catch (_firstErr) {
          if (target.triggerSelector) {
            const triggerLocator = page.locator(target.triggerSelector).first();
            await triggerLocator.click({ force: true, timeout: 3000 }).catch(() => {});
          }
          await page.waitForSelector(target.modalSelector, { state: 'visible', timeout: 5000 });
        }

        await stabilize(page, 450);
        await page.screenshot({ path: filePath, fullPage: false });

        recordItem(itemsMap, target, vp, 'modal', relPath, fs.statSync(filePath));
        capturedCount++;
        console.log(`  [OK] Modal: ${target.id} (${vp.id}) -> ${relPath} (${formatFileSize(fs.statSync(filePath).size)})`);

        await page.keyboard.press('Escape').catch(() => {});
      } catch (err) {
        failedCount++;
        console.warn(`  [FAIL] Modal: ${target.id} (${vp.id}): ${err.message}`);
      } finally {
        await page.close().catch(() => {});
      }
    }

    await context.close().catch(() => {});
  }

  await browser.close().catch(() => {});

  const finalItems = Array.from(itemsMap.values());
  const manifest = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalPages: PAGE_ROUTES.length,
      totalModals: MODAL_TARGETS.length,
      viewports: VIEWPORTS.map((v) => v.id),
      totalScreenshots: finalItems.length,
    },
    items: finalItems,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  writeGalleryFile(galleryPath, manifest);

  const elapsedMs = Date.now() - startTime;
  const summary = {
    baseUrl: config.baseUrl,
    viewports: activeViewports.map((v) => v.id),
    pageCount: activePages.length,
    modalCount: activeModals.length,
    totalScreenshots: finalItems.length,
    capturedCount,
    cachedCount,
    failedCount,
    elapsedMs,
    manifestPath,
    galleryPath,
    manifest,
  };

  printSummaryTable(summary);
  return summary;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  runTour(args)
    .then((summary) => {
      if (summary?.failedCount > 0) {
        console.warn(`Site tour finished with ${summary.failedCount} failures.`);
      }
    })
    .catch((err) => {
      console.error('Fatal error during site tour execution:', err);
      process.exit(1);
    });
}
