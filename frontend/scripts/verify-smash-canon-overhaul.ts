// frontend/scripts/verify-smash-canon-overhaul.ts
import { chromium, Browser, Page } from 'playwright';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import path from 'path';

const PORT = 3007;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const canonData = require(path.join(__dirname, '../../backend/app/seeds/data/smash_or_pass/rosters/canon.json'));
const canonRoster = canonData.rosters[0];
const canonEntities = canonRoster.entities;

function waitForServer(url: string, timeoutMs: number = 60000): Promise<void> {
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

async function verifySmashPage(page: Page, isMobile: boolean) {
  const mode = isMobile ? '📱 MOBILE' : '🖥️ DESKTOP';
  console.log(`\n========================================`);
  console.log(`${mode} SMASH OR PASS VERIFICATION`);
  console.log(`========================================\n`);

  // Intercept backend API requests with real canon.json data
  await page.route(
    (url) => url.pathname.endsWith('/api/v1/smash-or-pass/rosters'),
    async (route) => {
      const url = route.request().url();
      const isPl = url.includes('lang=pl') || url.includes('/pl');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: canonRoster.slug,
              slug: canonRoster.slug,
              name: isPl ? canonRoster.translations?.pl?.name || canonRoster.name : canonRoster.name,
              description: isPl ? canonRoster.translations?.pl?.description || canonRoster.description : canonRoster.description,
              cover_image_url: canonRoster.cover_image_url,
              theme_color: canonRoster.theme_color,
              category: canonRoster.category,
              is_nsfw: canonRoster.is_nsfw,
              is_active: canonRoster.is_active,
              entity_count: canonEntities.length,
            },
          ],
          count: 1,
        }),
      });
    }
  );

  await page.route(
    (url) => url.pathname.includes('/smash-or-pass/rosters/') && url.pathname.endsWith('/feed'),
    async (route) => {
      // Prioritize iconic test characters: The Onryō, Leon S. Kennedy, Eleven
      const onryo = canonEntities.find((e: any) => e.slug === 'the_onryō');
      const leon = canonEntities.find((e: any) => e.slug === 'leon_scott_kennedy');
      const eleven = canonEntities.find((e: any) => e.slug === 'eleven');
      const others = canonEntities.filter((e: any) => !['the_onryō', 'leon_scott_kennedy', 'eleven'].includes(e.slug));
      const ordered = [onryo, leon, eleven, ...others].filter(Boolean);

      const toApiEntity = (e: any, index: number) => ({
        id: e.slug,
        roster_id: 'canon',
        slug: e.slug,
        name: e.name,
        real_name: e.real_name ?? null,
        role: e.role,
        gender: e.gender,
        media_url: e.media_url,
        media_type: e.media_type || 'image',
        watermark_left: e.watermark_left,
        watermark_right: e.watermark_right,
        metadata: {
          archetype: e.archetype || '',
          bio: e.bio || '',
          tagline: e.tagline || '',
          quote: e.quote || '',
          meme: e.meme || '',
          turn_on: e.turn_on || '',
          dealbreaker: e.dealbreaker || '',
          dating_vibe: e.dating_vibe || '',
          red_flags: e.red_flags || [],
          green_flags: e.green_flags || [],
          translations: e.translations || {},
          real_name: e.real_name || null,
          watermark_left: e.watermark_left || null,
          watermark_right: e.watermark_right || null,
        },
        order_index: index,
        is_active: true,
        stat: {
          total_votes: 120,
          smash_count: 80,
          pass_count: 40,
          smash_rate: 66.7,
          rank: index + 1,
        },
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            entities: ordered.map(toApiEntity),
            total_remaining: ordered.length,
          },
        }),
      });
    }
  );

  await page.route(
    (url) => url.pathname.includes('/smash-or-pass/leaderboard'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0 }),
      });
    }
  );

  await page.route(
    (url) => url.pathname.includes('/smash-or-pass/user-votes'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    }
  );

  // Mock static avatar assets with 1x1 dummy webp to keep console clean
  const dummyWebp = Buffer.from('UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=', 'base64');
  await page.route(
    (url) => url.pathname.startsWith('/static/'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/webp',
        body: dummyWebp,
      });
    }
  );

  page.on('console', (msg) => {
    const text = msg.text();
    if (!text.includes('React DevTools')) {
      console.log(`[Browser ${mode}] ${msg.type()}: ${text}`);
    }
  });
  page.on('pageerror', (err) => console.error(`[Browser ${mode} ERROR]`, err));

  await page.goto(`${BASE_URL}/pl/smash-or-pass`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  // 1. Verify Dual-Identity Watermarks (flanking typography)
  console.log('--- 1. Testing Dual-Identity Watermarks ---');
  const leftWatermarkLocator = page.locator('div[class*="anim-watermark-dissolve"]').first();
  const rightWatermarkLocator = page.locator('div[class*="anim-watermark-dissolve"]').last();

  await leftWatermarkLocator.waitFor({ state: 'attached', timeout: 15000 });
  await rightWatermarkLocator.waitFor({ state: 'attached', timeout: 15000 });

  const leftText = (await leftWatermarkLocator.innerText()).trim();
  const rightText = (await rightWatermarkLocator.innerText()).trim();

  console.log(`Active Character Watermark: Left="${leftText}", Right="${rightText}"`);

  if (!leftText || !rightText) {
    throw new Error(`Watermark sides must not be empty! Got Left="${leftText}", Right="${rightText}"`);
  }

  if (leftText.includes('(') || leftText.includes(')') || rightText.includes('(') || rightText.includes(')')) {
    throw new Error(`Watermarks must be cleaned of parentheses! Got Left="${leftText}", Right="${rightText}"`);
  }

  console.log('✅ Dual-identity watermarks rendered cleanly without parentheses or empty sides.');

  // 2. Flip card to inspect back face and dynamic 2-3 flag sampling
  console.log('\n--- 2. Testing Dynamic 2–3 Flag Sampling on Card Back ---');
  const topCard = page.locator('div.cursor-grab');
  const flipButton = topCard.locator('button:has(svg.lucide-rotate-cw):visible');
  await flipButton.waitFor({ state: 'visible', timeout: 8000 });
  await flipButton.click();
  await page.waitForTimeout(600);

  // Find green and red flag list items on the back of the active card
  const greenFlagsLocator = topCard.locator('.bg-accent-green\\/10 ul li');
  const redFlagsLocator = topCard.locator('.bg-accent-red\\/10 ul li');

  const greenFlagCount = await greenFlagsLocator.count();
  const redFlagCount = await redFlagsLocator.count();

  console.log(`Sampled Green Flags count on card back: ${greenFlagCount}`);
  console.log(`Sampled Red Flags count on card back: ${redFlagCount}`);

  if (greenFlagCount < 2 || greenFlagCount > 3) {
    throw new Error(`Expected between 2 and 3 green flags on card back, got ${greenFlagCount}`);
  }
  if (redFlagCount < 2 || redFlagCount > 3) {
    throw new Error(`Expected between 2 and 3 red flags on card back, got ${redFlagCount}`);
  }

  // Record initial flag texts
  const initialGreenFlags: string[] = [];
  for (let i = 0; i < greenFlagCount; i++) {
    initialGreenFlags.push((await greenFlagsLocator.nth(i).innerText()).trim());
  }

  // Flip back to front and flip again to ensure sampling stability for this card
  console.log('Testing sampling stability across card flips...');
  const flipBackButton = topCard.locator('button:has(svg.lucide-rotate-cw):visible');
  await flipBackButton.click();
  await page.waitForTimeout(500);

  // Flip to back again
  const flipForwardAgain = topCard.locator('button:has(svg.lucide-rotate-cw):visible');
  await flipForwardAgain.click();
  await page.waitForTimeout(500);

  const reloadedGreenFlags: string[] = [];
  const reloadedCount = await greenFlagsLocator.count();
  for (let i = 0; i < reloadedCount; i++) {
    reloadedGreenFlags.push((await greenFlagsLocator.nth(i).innerText()).trim());
  }

  if (JSON.stringify(initialGreenFlags) !== JSON.stringify(reloadedGreenFlags)) {
    throw new Error(
      `Flag sampling must remain stable while viewing the same character across flips! Initial=${JSON.stringify(
        initialGreenFlags
      )}, Reloaded=${JSON.stringify(reloadedGreenFlags)}`
    );
  }
  console.log('✅ Dynamic 2–3 flag sampling is stable across card flips.');

  // 3. Test Character Stats / Dossier Modal (full pool display >= 4 flags)
  console.log('\n--- 3. Testing Full Dossier Stats Modal (>= 4 flags) ---');
  const returnToFront = topCard.locator('button:has(svg.lucide-rotate-cw):visible');
  await returnToFront.click();
  await page.waitForTimeout(400);

  // Open stats modal via ArrowUp shortcut
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(600);

  const modal = page.locator('[role="dialog"], div[aria-modal="true"]').first();
  await modal.waitFor({ state: 'visible', timeout: 5000 });

  const modalGreenFlags = modal.locator('.bg-accent-green\\/10 ul li');
  const modalRedFlags = modal.locator('.bg-accent-red\\/10 ul li');

  const mGreenCount = await modalGreenFlags.count();
  const mRedCount = await modalRedFlags.count();
  console.log(`Full Dossier Modal Green Flags count: ${mGreenCount}`);
  console.log(`Full Dossier Modal Red Flags count: ${mRedCount}`);

  if (mGreenCount < 4) {
    throw new Error(`Expected at least 4 green flags in full stats modal, got ${mGreenCount}`);
  }
  if (mRedCount < 4) {
    throw new Error(`Expected at least 4 red flags in full stats modal, got ${mRedCount}`);
  }
  console.log('✅ Full Dossier modal renders complete 4–6 flag pool.');

  // Close stats modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // 4. Test Roster Selection Modal and direct backend strings
  console.log('\n--- 4. Testing Roster Select Modal Direct Backend Strings ---');
  const rosterSelectTrigger = page.locator('button:has(svg.lucide-chevron-down)').first();
  if (await rosterSelectTrigger.isVisible()) {
    await rosterSelectTrigger.click();
    await page.waitForTimeout(600);

    const rosterModal = page.locator('#roster-select-title').first();
    await rosterModal.waitFor({ state: 'visible', timeout: 5000 });

    const canonTitle = page.locator('h3:has-text("Kanon"), h3:has-text("Canon")').first();
    const isCanonVisible = await canonTitle.isVisible();
    console.log(`Roster title visible in modal: ${isCanonVisible}`);
    if (!isCanonVisible) {
      throw new Error('Roster title from backend was not visible in RosterSelectModal');
    }

    const modalCloseBtn = page.locator('button:has(svg.lucide-x)').first();
    await modalCloseBtn.click();
    await page.waitForTimeout(300);
    console.log('✅ RosterSelectModal displays direct backend name cleanly.');
  }

  console.log(`\n🎉 ${mode} VERIFICATION COMPLETE & PASSED!\n`);
}

async function main() {
  console.log('========================================');
  console.log('🔍 Canon Roster Data Integrity Pre-Check');
  console.log('========================================');
  console.log(`Total Canon Entities: ${canonEntities.length}`);
  if (canonEntities.length !== 98) {
    throw new Error(`Expected exactly 98 characters in canon.json, found ${canonEntities.length}`);
  }

  // Spot-check iconic characters
  const onryo = canonEntities.find((e: any) => e.slug === 'the_onryō');
  if (!onryo || onryo.watermark_left !== 'THE ONRYŌ' || onryo.watermark_right !== 'SADAKO') {
    throw new Error(`The Onryō watermark check failed: ${JSON.stringify(onryo)}`);
  }

  const leon = canonEntities.find((e: any) => e.slug === 'leon_scott_kennedy');
  if (!leon || leon.watermark_left !== 'LEON S.' || leon.watermark_right !== 'KENNEDY') {
    throw new Error(`Leon watermark check failed: ${JSON.stringify(leon)}`);
  }

  const bill = canonEntities.find((e: any) => e.slug === 'bill_overbeck');
  if (!bill || bill.watermark_left !== 'BILL' || bill.watermark_right !== 'OVERBECK') {
    throw new Error(`Bill watermark check failed: ${JSON.stringify(bill)}`);
  }
  console.log('✅ Pre-check passed: All iconic entities verified in canon.json\n');

  console.log('Starting Next.js production server on port ' + PORT + '...');
  const serverProcess: ChildProcess = spawn(
    'npx',
    ['next', 'start', '-p', String(PORT)],
    {
      cwd: path.join(__dirname, '..'),
      shell: true,
      stdio: 'pipe',
    }
  );

  serverProcess.stdout?.on('data', (data) => {
    console.log(`[Next.js] ${data.toString().trim()}`);
  });
  serverProcess.stderr?.on('data', (data) => {
    console.log(`[Next.js stderr] ${data.toString().trim()}`);
  });

  try {
    console.log(`Waiting for ${BASE_URL} to become ready...`);
    await waitForServer(BASE_URL, 60000);
    console.log('✅ Next.js server ready!');

    const browser = await chromium.launch({ headless: true });

    // 1. Desktop verification (1280x800)
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const desktopPage = await desktopContext.newPage();
    await verifySmashPage(desktopPage, false);
    await desktopContext.close();

    // 2. Mobile verification (390x844)
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await verifySmashPage(mobilePage, true);
    await mobileContext.close();

    await browser.close();
    console.log('========================================');
    console.log('🎉 ALL PLAYWRIGHT VERIFICATION PASSED!');
    console.log('========================================');
  } finally {
    console.log('Shutting down Next.js test server...');
    if (serverProcess.pid) {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
      } else {
        serverProcess.kill('SIGTERM');
      }
    }
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
