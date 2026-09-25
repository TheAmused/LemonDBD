const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\bezie\\.gemini\\antigravity\\brain\\41a1ca0a-7c88-4d77-a909-bca258f80780';

async function run() {
  // 1. Get token
  const loginRes = await fetch('https://localhost/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'lemon', password: 'lemon' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Got token:', Boolean(token));

  const browser = await chromium.launch({
    headless: true,
    args: ['--ignore-certificate-errors'],
  });

  const viewports = [
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'desktop-1920', width: 1920, height: 1080 },
    { name: 'ultrawide-2560', width: 2560, height: 1440 },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    // Set token in localStorage and skip intro/language straight to roster view
    await page.goto('https://localhost/pl/welcome', { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok) => {
      localStorage.setItem('lemondbd_token', tok);
      sessionStorage.setItem('onboarding_view_after_language_redirect', 'roster');
    }, token);
    await page.goto('https://localhost/pl/welcome', { waitUntil: 'networkidle' });

    // Wait for the chapters grid to be rendered
    await page.waitForSelector('button[role="switch"]', { timeout: 10000 });

    const metrics = await page.evaluate(() => {
      const container = document.querySelector('div.min-h-screen > div.mx-auto');
      const card = container ? container.querySelector('div.rounded-2xl') : null;
      const header = card ? card.querySelector('header') : null;
      const legend = card ? card.querySelector('section') : null;
      const allGrids = card ? card.querySelectorAll('div.grid') : [];
      const chaptersGrid = allGrids.length > 1 ? allGrids[1] : allGrids[0] || null;
      const firstChapterCard = chaptersGrid ? chaptersGrid.firstElementChild : null;

      const getBox = (el) => {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          padding: `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`,
          margin: `${style.marginTop} ${style.marginRight} ${style.marginBottom} ${style.marginLeft}`,
        };
      };

      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        bodyScrollHeight: document.body.scrollHeight,
        container: getBox(container),
        card: getBox(card),
        header: getBox(header),
        legend: getBox(legend),
        chaptersGrid: getBox(chaptersGrid),
        firstChapterCard: getBox(firstChapterCard),
      };
    });

    console.log(`\n=== Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    console.log(JSON.stringify(metrics, null, 2));

    const shotPath = path.join(ARTIFACT_DIR, `welcome_${vp.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log('Saved screenshot:', shotPath);

    const fullShotPath = path.join(ARTIFACT_DIR, `welcome_${vp.name}_full.png`);
    await page.screenshot({ path: fullShotPath, fullPage: true });
    console.log('Saved full screenshot:', fullShotPath);

    await context.close();
  }

  await browser.close();
}

run().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
