// frontend/scripts/verify-sidebar-all-pages.ts
import { chromium, Browser, Page } from 'playwright';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';

const PORT = 3005;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const ROUTES = [
  '/pl',
  '/pl/perks',
  '/pl/randomizer',
  '/pl/characters',
  '/pl/characters/the-trapper',
  '/pl/maps',
  '/pl/smash-or-pass',
  '/pl/streaks',
  '/pl/achievements',
  '/pl/about',
];

function waitForServer(url: string, timeoutMs: number = 30000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode && res.statusCode < 500) {
            resolve();
          } else {
            retry();
          }
        })
        .on('error', () => {
          retry();
        });
    };

    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`));
      } else {
        setTimeout(check, 500);
      }
    };

    check();
  });
}

async function runDesktopTests(browser: Browser) {
  console.log('\n========================================');
  console.log('🖥️  RUNNING DESKTOP (PC 1280x800) TESTS');
  console.log('========================================\n');

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  for (const route of ROUTES) {
    const url = `${BASE_URL}${route}`;
    process.stdout.write(`Testing desktop route ${route.padEnd(28)} `);

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    // 1. Verify Desktop Sidebar is visible and 256px wide (16rem)
    const sidebar = page.locator('aside.lemon-shell-aside');
    await sidebar.waitFor({ state: 'visible', timeout: 5000 });
    const sidebarBox = await sidebar.boundingBox();

    if (!sidebarBox) {
      throw new Error(`[${route}] Sidebar bounding box not found`);
    }

    if (Math.abs(sidebarBox.width - 256) > 2) {
      throw new Error(`[${route}] Expected sidebar width 256px, got ${sidebarBox.width}px`);
    }

    if (sidebarBox.x > 2) {
      throw new Error(`[${route}] Expected sidebar x close to 0, got ${sidebarBox.x}px`);
    }

    // 2. Verify main starts at >= 256px (no overlap)
    const main = page.locator('main').first();
    const mainBox = await main.boundingBox();
    if (!mainBox) {
      throw new Error(`[${route}] Main bounding box not found`);
    }

    if (mainBox.x < 254) {
      throw new Error(`[${route}] Main content overlaps sidebar! main.x=${mainBox.x}px, expected >= 256px`);
    }

    // 3. Test Sidebar Collapse Toggle
    const toggleButton = page.locator('[data-testid="sidebar-toggle-button"]');
    await toggleButton.click();
    await page.waitForTimeout(350); // wait for 300ms CSS width transition

    // Verify root has data-sidebar="collapsed"
    const isCollapsed = await page.evaluate(
      () => document.documentElement.getAttribute('data-sidebar') === 'collapsed'
    );
    if (!isCollapsed) {
      throw new Error(`[${route}] html attribute data-sidebar="collapsed" not set after clicking toggle`);
    }

    const collapsedSidebarBox = await sidebar.boundingBox();
    if (collapsedSidebarBox && collapsedSidebarBox.width > 2) {
      throw new Error(`[${route}] Expected collapsed sidebar width <= 2px, got ${collapsedSidebarBox.width}px`);
    }

    const expandedMainBox = await main.boundingBox();
    if (expandedMainBox && expandedMainBox.x > 2) {
      throw new Error(`[${route}] Expected main to expand to x <= 2px when collapsed, got ${expandedMainBox.x}px`);
    }

    // Re-expand sidebar for clean state
    await toggleButton.click();
    await page.waitForTimeout(350);

    const reExpandedBox = await sidebar.boundingBox();
    if (!reExpandedBox || Math.abs(reExpandedBox.width - 256) > 2) {
      throw new Error(`[${route}] Expected sidebar to restore to 256px after second toggle`);
    }

    console.log('✅ PASS (Expanded 256px -> Collapsed 0px -> Restored 256px)');
  }

  // Extra dedicated test on /pl/maps for FullscreenMapEngine
  console.log('\n--- 🗺️  Testing Maps Tactical Viewer (FullscreenMapEngine) on Desktop ---');

  const mockMaps = [
    {
      id: 1,
      name: 'Ormond Lake Mine',
      realm: 'Mount Ormond Resort',
      realm_id: 1,
      source: 'hens333',
      source_label: 'Hens333 12-Clock Callouts',
      layout_type: 'Outdoor',
      is_shack: true,
      is_main_building: true,
      size_sq_tiles: 150,
      size_sq_meters: 9600,
      callout_image_url: 'https://hens333.com/img/dbd/callouts/Other/Ormond.gif',
    },
  ];
  const mockRealms = [
    {
      id: 1,
      name: 'Mount Ormond Resort',
      maps_count: 1,
    },
  ];

  await context.route('**/api/**/maps*', (route) => {
    const url = route.request().url();
    if (url.includes('/maps/realms')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ realms: mockRealms }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ maps: mockMaps }),
    });
  });

  await page.goto(`${BASE_URL}/pl/maps`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Click the realm card to expand maps
  const realmCard = page.locator('button:has-text("Mount Ormond Resort"), [role="button"]:has-text("Mount Ormond Resort")').first();
  await realmCard.waitFor({ state: 'visible', timeout: 5000 });
  await realmCard.click();
  await page.waitForTimeout(400);

  // Click the tactical callout / map card to open FullscreenMapEngine
  const mapTrigger = page.locator('[data-testid="map-card-1"]');
  await mapTrigger.waitFor({ state: 'visible', timeout: 5000 });
  await mapTrigger.click();
  await page.waitForTimeout(500);

  const mapEngine = page.locator('[data-testid="fullscreen-map-engine"]');
  await mapEngine.waitFor({ state: 'visible', timeout: 5000 });

  const engineBox = await mapEngine.boundingBox();
  const sidebarBox = await page.locator('aside.lemon-shell-aside').boundingBox();

  if (!engineBox || !sidebarBox) {
    throw new Error('Bounding box for MapEngine or Sidebar not found');
  }

  console.log(`MapEngine position: x=${engineBox.x}px, width=${engineBox.width}px (Sidebar width=${sidebarBox.width}px)`);

  // 1. Verify MapEngine starts beside the sidebar (at 256px)
  if (Math.abs(engineBox.x - 256) > 5) {
    throw new Error(`MapEngine expected to start at 256px beside sidebar, got x=${engineBox.x}px`);
  }

  // 2. Verify sidebar toggle button is VISIBLE and NOT obscured by MapEngine
  const toggleButton = page.locator('[data-testid="sidebar-toggle-button"]');
  const isToggleVisible = await toggleButton.isVisible();
  if (!isToggleVisible) {
    throw new Error('Sidebar toggle button is not visible when MapEngine is open!');
  }

  // Clicking toggle must succeed without pointer event interception
  await toggleButton.click();
  await page.waitForTimeout(350);

  // 3. Verify MapEngine expanded to x=0 when sidebar collapsed
  const engineExpandedBox = await mapEngine.boundingBox();
  if (!engineExpandedBox || engineExpandedBox.x > 5) {
    throw new Error(`MapEngine expected to expand to x=0 when sidebar collapsed, got x=${engineExpandedBox?.x}px`);
  }
  console.log(`MapEngine expanded on collapse: x=${engineExpandedBox.x}px, width=${engineExpandedBox.width}px`);

  // 4. Toggle button is still visible and clickable at x=0
  await toggleButton.click();
  await page.waitForTimeout(350);

  const engineRestoredBox = await mapEngine.boundingBox();
  if (!engineRestoredBox || Math.abs(engineRestoredBox.x - 256) > 5) {
    throw new Error(`MapEngine expected to restore to x=256px when sidebar expanded, got x=${engineRestoredBox?.x}px`);
  }

  // Close MapEngine with Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const isStillOpen = await mapEngine.isVisible();
  if (isStillOpen) {
    throw new Error('MapEngine did not close on Escape key');
  }
  console.log('✅ FullscreenMapEngine desktop positioning, toggle button visibility & collapse verified successfully!');

  // Verify Desktop Voice Mode
  console.log('Testing Desktop Voice Mode UI...');
  const voiceTabDesktop = page.locator('button:has-text("Głos")').first();
  await voiceTabDesktop.click();
  await page.waitForTimeout(400);

  const kbdVDesktop = page.locator('kbd:has-text("V")');
  await kbdVDesktop.waitFor({ state: 'visible', timeout: 5000 });
  console.log('✅ Desktop Voice Mode [V] key verified visible!');

  await context.close();
}

async function runMobileTests(browser: Browser) {
  console.log('\n========================================');
  console.log('📱 RUNNING MOBILE (375x667) TESTS');
  console.log('========================================\n');

  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();

  for (const route of ROUTES) {
    const url = `${BASE_URL}${route}`;
    process.stdout.write(`Testing mobile route ${route.padEnd(28)} `);

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    // 1. Verify Desktop Sidebar is NOT visible on mobile
    const desktopAside = page.locator('aside.lemon-shell-aside');
    const isDesktopVisible = await desktopAside.isVisible();
    if (isDesktopVisible) {
      throw new Error(`[${route}] Desktop sidebar should be hidden on mobile (hidden lg:flex)`);
    }

    // 2. Verify Mobile Header exists and is visible
    const mobileHeader = page.locator('header.lg\\:hidden');
    const isHeaderVisible = await mobileHeader.isVisible();
    if (!isHeaderVisible) {
      throw new Error(`[${route}] Mobile header should be visible on mobile screen`);
    }

    // 3. Test Mobile Drawer (Open & Close)
    const hamburger = mobileHeader.locator('[data-testid="mobile-drawer-toggle"]');
    await hamburger.click();
    await page.waitForTimeout(300);

    // Drawer dialog
    const drawerDialog = page.locator('div[role="dialog"].lg\\:hidden');
    const isDrawerOpen = await drawerDialog.isVisible();
    if (!isDrawerOpen) {
      throw new Error(`[${route}] Mobile drawer failed to open on hamburger click`);
    }

    // Verify WhatsNewLauncher is NOT inside the mobile drawer (it should only be in the mobile header, no duplicate)
    const whatsNewInDrawer = drawerDialog.locator('button[title*="nowego"], button[aria-label*="nowego"], button[title*="What\'s new"]');
    if (await whatsNewInDrawer.isVisible()) {
      throw new Error(`[${route}] 'What\\'s new?' launcher should not be inside mobile drawer (duplicate of header)`);
    }

    // Close drawer
    const closeDrawerBtn = drawerDialog.locator('[data-testid="mobile-drawer-close"]');
    await closeDrawerBtn.click();
    await page.waitForTimeout(300);

    const isDrawerStillOpen = await drawerDialog.isVisible();
    if (isDrawerStillOpen) {
      throw new Error(`[${route}] Mobile drawer failed to close`);
    }

    console.log('✅ PASS (Header visible, desktop sidebar hidden, drawer toggle ok)');
  }

  // Extra dedicated test on /pl/maps for Mobile FullscreenMapEngine
  console.log('\n--- 🗺️  Testing Maps Tactical Viewer (FullscreenMapEngine) on Mobile ---');

  const mockMaps = [
    {
      id: 1,
      name: 'Ormond Lake Mine',
      realm: 'Mount Ormond Resort',
      realm_id: 1,
      source: 'hens333',
      source_label: 'Hens333 12-Clock Callouts',
      layout_type: 'Outdoor',
      is_shack: true,
      is_main_building: true,
      size_sq_tiles: 150,
      size_sq_meters: 9600,
      callout_image_url: 'https://hens333.com/img/dbd/callouts/Other/Ormond.gif',
    },
  ];
  const mockRealms = [
    {
      id: 1,
      name: 'Mount Ormond Resort',
      maps_count: 1,
    },
  ];

  await context.route('**/api/**/maps*', (route) => {
    const url = route.request().url();
    if (url.includes('/maps/realms')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ realms: mockRealms }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ maps: mockMaps }),
    });
  });

  await page.goto(`${BASE_URL}/pl/maps`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Click realm card
  const realmCard = page.locator('button:has-text("Mount Ormond Resort"), [role="button"]:has-text("Mount Ormond Resort")').first();
  await realmCard.waitFor({ state: 'visible', timeout: 5000 });
  await realmCard.click();
  await page.waitForTimeout(400);

  // Click map card to open viewer
  const mapTrigger = page.locator('[data-testid="map-card-1"]');
  await mapTrigger.waitFor({ state: 'visible', timeout: 5000 });
  await mapTrigger.click();
  await page.waitForTimeout(500);

  const mapEngine = page.locator('[data-testid="fullscreen-map-engine"]');
  await mapEngine.waitFor({ state: 'visible', timeout: 5000 });

  const engineBox = await mapEngine.boundingBox();
  if (!engineBox) throw new Error('Mobile map engine bounding box missing');

  console.log(`Mobile MapEngine position: x=${engineBox.x}, y=${engineBox.y}, w=${engineBox.width}, h=${engineBox.height}`);

  // Should take 100% of mobile screen: x=0, width=375
  if (engineBox.x !== 0 || engineBox.width < 360) {
    throw new Error(`Expected mobile map engine to fill full width 375px at x=0, got x=${engineBox.x}, w=${engineBox.width}`);
  }

  // Close button
  const closeBtn = mapEngine.locator('header button').last();
  await closeBtn.click();
  await page.waitForTimeout(300);
  const stillOpen = await mapEngine.isVisible();
  if (stillOpen) throw new Error('Mobile map engine did not close on X button');

  console.log('✅ Mobile FullscreenMapEngine 100% fullscreen coverage verified!');

  // --- Test Mobile Voice Mode Layout & Non-Clipping Hint ---
  console.log('\n--- 📱 Testing Mobile Voice Mode UI ---');
  const voiceTab = page.locator('button:has-text("Głos")').first();
  await voiceTab.click();
  await page.waitForTimeout(400);

  // 1. Mobile hint must be visible: "Stuknij mikrofon i powiedz nazwę mapy"
  const mobileHint = page.locator('text="Stuknij mikrofon i powiedz nazwę mapy"');
  await mobileHint.waitFor({ state: 'visible', timeout: 5000 });

  // 2. Keyboard key [V] must NOT be visible on mobile
  const kbdV = page.locator('kbd:has-text("V")');
  const isKbdVisible = await kbdV.isVisible();
  if (isKbdVisible) {
    throw new Error('Keyboard key [V] should NOT be visible on mobile screens!');
  }

  // 3. Hint bounding box must NOT overflow viewport (width <= 375, x >= 0, x + width <= 375)
  const hintBox = await mobileHint.boundingBox();
  if (!hintBox) throw new Error('Mobile hint bounding box not found');
  if (hintBox.x < 0 || hintBox.x + hintBox.width > 375) {
    throw new Error(`Mobile hint is clipped or overflowing: x=${hintBox.x}, width=${hintBox.width}`);
  }
  console.log(`Mobile hint bounds: x=${hintBox.x.toFixed(1)}, width=${hintBox.width.toFixed(1)} (contained within 375px)`);

  // 4. Mic button is present and visible
  const micBtn = page.locator('#voice-command-mic-btn');
  const isMicVisible = await micBtn.isVisible();
  if (!isMicVisible) throw new Error('Microphone button is not visible on mobile');

  console.log('✅ Mobile Voice Mode layout and non-clipping hint verified successfully!');

  await context.close();
}

async function main() {
  console.log('Starting Next.js production server for Playwright verification...');
  const serverProcess: ChildProcess = spawn(
    'npx',
    ['next', 'start', '-p', String(PORT)],
    {
      cwd: process.cwd(),
      shell: true,
      stdio: 'pipe',
    }
  );

  serverProcess.stdout?.on('data', (data) => {
    // console.log(`[Next.js] ${data}`);
  });

  serverProcess.stderr?.on('data', (data) => {
    console.error(`[Next.js err] ${data}`);
  });

  try {
    console.log(`Waiting for ${BASE_URL} to be ready...`);
    await waitForServer(BASE_URL, 30000);
    console.log('✅ Server ready!\n');

    const browser = await chromium.launch({ headless: true });

    await runDesktopTests(browser);
    await runMobileTests(browser);

    await browser.close();

    console.log('\n🎉 ALL DESKTOP & MOBILE PLAYWRIGHT TESTS PASSED CLEANLY!\n');
    process.exitCode = 0;
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exitCode = 1;
  } finally {
    console.log('Shutting down test server...');
    if (serverProcess.pid) {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
      } else {
        serverProcess.kill('SIGTERM');
      }
    }
  }
}

main();
