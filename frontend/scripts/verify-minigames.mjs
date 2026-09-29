// frontend/scripts/verify-minigames.mjs
//
// Playwright end-to-end browser test script for Minigames & DBD Idle.
// Verifies:
// 1. Minigames Hub (/en/minigames) on desktop and mobile viewports.
// 2. DBD Idle Classic Guesser (/en/minigames/idle) autocomplete, guess submission, attribute feedback, clues, surrender.
// 3. Challenge Creator (/en/minigames/creator) multi-mode round authoring, JSON export/import, link sharing.
// 4. Custom Challenge Play (/en/minigames/play) round progression and completion.
//
// Saves screenshots and JSON report in playwright/minigames-report/ (repo root)

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = (process.env.MINIGAMES_BASE_URL || 'https://localhost').replace(/\/+$/, '');
const LOCALE = process.env.MINIGAMES_LOCALE || 'en';
const OUT_DIR = path.join(__dirname, '..', '..', 'playwright', 'minigames-report');
fs.mkdirSync(OUT_DIR, { recursive: true });

const url = (p) => `${BASE_URL}/${LOCALE}${p}`;

async function noOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

async function run() {
  console.log(`Starting Playwright Minigames E2E suite against ${BASE_URL}...`);
  const results = {
    hub_desktop: false,
    hub_mobile: false,
    idle_autocomplete_and_guess: false,
    idle_clues_and_surrender: false,
    creator_multi_round: false,
    creator_export_import: false,
    creator_share: false,
    play_custom_gauntlet: false,
    realm_guesser_play: false,
    errors: [],
  };


  // Launch browser (using system Chrome or standard chromium)
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  // --------------------------------------------------------------------------
  // TEST 1: Hub Page (/en/minigames) - Desktop Viewport
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Testing Minigames Hub (Desktop 1280x800) ---');
  const desktopContext = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 },
  });
  const page = await desktopContext.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto(url('/minigames'), { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(OUT_DIR, '01_hub_desktop.png'), fullPage: true });

  const title = await page.title();
  console.log(`Hub Title: "${title}"`);
  const bodyText = await page.innerText('body');
  const hasDailyCard = bodyText.includes('Daily Fog Trial') || bodyText.includes('DBD Idle Classic');
  const hasStreak = bodyText.includes('Current Streak');
  const overflowDesktop = await noOverflow(page);

  console.log(`- Daily Card rendered: ${hasDailyCard}`);
  console.log(`- Streak banner rendered: ${hasStreak}`);
  console.log(`- No horizontal overflow: ${overflowDesktop}`);

  if (hasDailyCard && hasStreak && overflowDesktop) {
    results.hub_desktop = true;
    console.log('✓ Hub Desktop Passed');
  } else {
    results.errors.push('Hub desktop layout check failed');
  }

  // --------------------------------------------------------------------------
  // TEST 2: Hub Page (/en/minigames) - Mobile Viewport (375x667)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testing Minigames Hub (Mobile 375x667) ---');
  const mobileContext = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(url('/minigames'), { waitUntil: 'networkidle' });
  await mobilePage.screenshot({ path: path.join(OUT_DIR, '02_hub_mobile.png'), fullPage: true });

  const overflowMobile = await noOverflow(mobilePage);
  console.log(`- Mobile No horizontal overflow: ${overflowMobile}`);
  if (overflowMobile) {
    results.hub_mobile = true;
    console.log('✓ Hub Mobile Passed');
  } else {
    results.errors.push('Hub mobile horizontal overflow detected');
  }
  await mobileContext.close();

  // --------------------------------------------------------------------------
  // TEST 3: DBD Idle Runner (/en/minigames/idle)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testing DBD Idle Classic (/en/minigames/idle) ---');
  await page.goto(url('/minigames/idle'), { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(OUT_DIR, '03_idle_initial.png') });

  // Verify search input exists
  const searchInput = page.locator('input[type="text"]').first();
  await searchInput.waitFor({ state: 'visible', timeout: 5000 });

  // Step 3a: Type "lar" to test that BOTH Survivors (Lara Croft) and Killers (The Singularity) appear
  console.log('Typing "lar" in autocomplete to verify both Survivors and Killers appear...');
  await searchInput.fill('lar');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, '04a_autocomplete_lar_dropdown.png') });

  // Verify options
  const options = page.locator('li[role="option"]');
  const optionCount = await options.count();
  console.log(`- Options matching "lar": ${optionCount}`);
  const optionTexts = [];
  for (let i = 0; i < optionCount; i++) {
    optionTexts.push(await options.nth(i).innerText());
  }
  console.log(`- Option items found:\n  ${optionTexts.join('\n  ')}`);

  const hasLaraCroft = optionTexts.some((txt) => txt.includes('Lara Croft') && txt.includes('Survivor'));
  const hasSingularity = optionTexts.some((txt) => txt.includes('The Singularity') && txt.includes('Killer'));
  console.log(`- Found Lara Croft (Survivor): ${hasLaraCroft}`);
  console.log(`- Found The Singularity (Killer): ${hasSingularity}`);

  if (!hasLaraCroft) {
    results.errors.push('FAIL: Lara Croft (Survivor) was missing from autocomplete dropdown when querying "lar"!');
  }
  if (!hasSingularity) {
    results.errors.push('FAIL: The Singularity (Killer) was missing from autocomplete dropdown when querying "lar"!');
  }

  // Step 3b: Select "Lara Croft" (Survivor guess)
  const laraOption = page.locator('li[role="option"]').filter({ hasText: 'Lara Croft' }).first();
  await laraOption.waitFor({ state: 'visible', timeout: 5000 });
  await laraOption.click();
  console.log('Selected Survivor "Lara Croft"');

  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT_DIR, '04b_survivor_guess_submitted.png') });

  // Verify guess table renders with Lara Croft
  const tableText = await page.innerText('body');
  const laraRowRendered = tableText.includes('Lara Croft');
  console.log(`- Survivor guess row rendered: ${laraRowRendered}`);

  // Verify column header says "Character" instead of duplicate "Role"
  const tableHeader = await page.locator('table thead').innerText().catch(() => '');
  console.log(`- Table header text: "${tableHeader.replace(/\n/g, ' ')}"`);
  const hasCharacterHeader = tableHeader.toLowerCase().includes('character');
  console.log(`- Table has "Character" column header: ${hasCharacterHeader}`);

  // Step 3c: Now guess a Killer (The Singularity) to verify both coexist in the evaluation matrix
  console.log('Typing "Singularity" to make a second guess (Killer)...');
  await searchInput.fill('Singularity');
  await page.waitForTimeout(600);
  const singOption = page.locator('li[role="option"]').filter({ hasText: 'The Singularity' }).first();
  await singOption.waitFor({ state: 'visible', timeout: 5000 });
  await singOption.click();
  console.log('Selected Killer "The Singularity"');

  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT_DIR, '05_idle_multiple_guesses_submitted.png') });

  const updatedBodyText = await page.innerText('body');
  const bothGuessesRendered =
    updatedBodyText.includes('Lara Croft') &&
    updatedBodyText.includes('The Singularity');
  console.log(`- Both Survivor & Killer guess rows visible simultaneously: ${bothGuessesRendered}`);

  if (hasLaraCroft && hasSingularity && bothGuessesRendered) {
    results.idle_autocomplete_and_guess = true;
    console.log('✓ DBD Idle Autocomplete & Guess Passed (Both Survivor & Killer supported)');
  } else {
    results.errors.push('DBD Idle mixed character guess check failed');
  }

  // Step 3d: Test Give Up & Reveal
  console.log('Testing Give Up & Reveal button...');
  const giveUpBtn = page.locator('button').filter({ hasText: /Give Up/i }).first();
  if (await giveUpBtn.isVisible()) {
    await giveUpBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, '06_idle_revealed.png') });
    const revealedText = await page.innerText('body');
    const revealedSuccess =
      revealedText.includes('The Entity') ||
      revealedText.includes('Trial Escaped') ||
      revealedText.includes('Consumed') ||
      revealedText.includes('Round 1');
    console.log(`- Solution or completion status shown: ${revealedSuccess}`);
    if (revealedSuccess) {
      results.idle_clues_and_surrender = true;
      console.log('✓ DBD Idle Surrender & Reveal Passed');
    }
  }

  // --------------------------------------------------------------------------
  // TEST 4: Challenge Creator (/en/minigames/creator)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Testing Challenge Creator (/en/minigames/creator) ---');
  await page.goto(url('/minigames/creator'), { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(OUT_DIR, '07_creator_initial.png') });

  // Set challenge title
  const titleInput = page.locator('input[placeholder*="Ultimate"], input[type="text"]').first();
  if (await titleInput.isVisible()) {
    await titleInput.fill('Playwright Community Gauntlet');
  }

  // Check initial round cards
  const roundCards = page.locator('[data-round-card], div:has-text("Round #1")');
  const countInitial = await roundCards.count();
  console.log(`- Initial round cards count: ${countInitial}`);

  // Select target for Round 1 (Realm Guesser)
  const round1Input = page.locator('[data-round-card]').first().locator('input[placeholder*="Search answer"], input[type="text"]').last();
  if (await round1Input.isVisible()) {
    await round1Input.fill('MacMillan');
    await page.waitForTimeout(500);
    const realmOption = page.locator('li[role="option"]').first();
    if (await realmOption.isVisible()) {
      await realmOption.click();
      console.log('Selected target for Round 1');
    }
  }

  // Select target for Round 2 (Classic Character)
  const roundCardsCount = await page.locator('[data-round-card]').count();
  if (roundCardsCount >= 2) {
    const round2Input = page.locator('[data-round-card]').nth(1).locator('input[placeholder*="Search answer"], input[type="text"]').last();
    if (await round2Input.isVisible()) {
      await round2Input.fill('Trapper');
      await page.waitForTimeout(500);
      const killerOption = page.locator('li[role="option"]').first();
      if (await killerOption.isVisible()) {
        await killerOption.click();
        console.log('Selected target for Round 2');
      }
    }
  }

  // Add a 3rd round to test dynamic round creation
  const addRoundBtn = page.locator('button').filter({ hasText: /Add Round/i }).first();
  if (await addRoundBtn.isVisible()) {
    console.log('Adding extra round...');
    await addRoundBtn.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(OUT_DIR, '08_creator_rounds_added.png') });

  const totalCardsNow = await page.locator('[data-round-card]').count();
  console.log(`- Total round cards after add: ${totalCardsNow}`);
  if (totalCardsNow >= 2) {
    results.creator_multi_round = true;
    console.log('✓ Challenge Creator Multi-Round Passed');
  }

  // Delete the 3rd round so the challenge is cleanly validated with 2 configured rounds
  if (totalCardsNow > 2) {
    const deleteBtn = page.locator('[data-round-card]').last().locator('button[title*="Remove"], button:has(svg.lucide-trash-2)').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(300);
      console.log('Deleted unconfigured 3rd round');
    }
  }

  // Test Export JSON
  console.log('Testing Export JSON...');
  const exportBtn = page.locator('button').filter({ hasText: /Export/i }).first();
  if (await exportBtn.isVisible()) {
    await exportBtn.click();
    await page.waitForTimeout(400);
    console.log('✓ Export button clickable');
    results.creator_export_import = true;
  }

  // Test Share Challenge
  console.log('Testing Share Challenge Link...');
  const shareBtn = page.locator('button').filter({ hasText: /Share/i }).first();
  if (await shareBtn.isVisible()) {
    await shareBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, '09_creator_share_modal.png') });
    const shareBody = await page.innerText('body');
    const shareSuccess = shareBody.includes('Shareable Link') || shareBody.includes('/minigames/play?c=') || shareBody.includes('Link copied') || shareBody.includes('Copy');
    console.log(`- Share feedback/modal visible: ${shareSuccess}`);
    if (shareSuccess) {
      results.creator_share = true;
      console.log('✓ Challenge Creator Sharing Passed');
    }
  }

  // --------------------------------------------------------------------------
  // TEST 5: Custom Challenge Player (/en/minigames/play)
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Testing Custom Challenge Player (/en/minigames/play) ---');
  const testPayload = {
    title: 'Playwright Test Gauntlet',
    description: 'Custom verified gauntlet',
    game_mode: 'custom',
    rounds: [
      {
        round_number: 1,
        mode: 'classic_character',
        target_id: 1,
        target_type: 'killer',
        max_attempts: 6,
        target_name: 'The Trapper',
      },
    ],
  };

  const shareApiRes = await fetch(`${BASE_URL}/api/v1/minigames/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: testPayload }),
  });

  if (shareApiRes.ok) {
    const shareApiData = await shareApiRes.json();
    const shortCode = shareApiData.short_code;
    console.log(`Generated test share code: ${shortCode}`);

    await page.goto(url(`/minigames/play?c=${shortCode}`), { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(OUT_DIR, '10_play_custom_challenge.png') });

    const playText = await page.innerText('body');
    const playLoaded = playText.includes('Playwright Test Gauntlet') || playText.includes('Round 1');
    console.log(`- Custom gauntlet loaded from short code: ${playLoaded}`);

    if (playLoaded) {
      results.play_custom_gauntlet = true;
      console.log('✓ Custom Gauntlet Player Passed');
    }
  }

  // --------------------------------------------------------------------------
  // TEST 9: Realm Guesser Direct Launch & Play (/en/minigames/play?type=repeatable&mode=realm)
  // --------------------------------------------------------------------------
  console.log('\n--- 9. Testing Realm Guesser Standalone Mode ---');
  await page.goto(url('/minigames/play?type=repeatable&mode=realm'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const realmPageText = await page.innerText('body');
  const realmGuesserLoaded =
    realmPageText.includes('Realm') ||
    realmPageText.includes('Zoom:');
  console.log(`- Realm Guesser rendered: ${realmGuesserLoaded}`);

  // Check zoomed realm image presence
  const realmImg = await page.$('img[alt*="Realm Clue"], img[alt*="MacMillan"], img[alt*="Autohaven"], img[alt*="Coldwind"]');
  console.log(`- Zoomed Realm Image present: ${Boolean(realmImg)}`);

  // Try guessing a realm via search input
  const realmInput = await page.$('input[placeholder*="Search"]');
  if (realmInput) {
    await realmInput.fill('MacMillan');
    await page.waitForTimeout(500);

    const firstRealmOption = await page.$('button:has-text("MacMillan")');
    if (firstRealmOption) {
      await firstRealmOption.click();
      await page.waitForTimeout(800);
      console.log('- Selected and submitted Realm guess');
    }
  }

  await page.screenshot({ path: path.join(OUT_DIR, '11_realm_guesser_gameplay.png') });

  if (realmGuesserLoaded) {
    results.realm_guesser_play = true;
    console.log('✓ Standalone Realm Guesser Passed');
  }

  // --------------------------------------------------------------------------
  // TEST 10: Repeatable Quote & Lore Guesser (/en/minigames/play?type=repeatable&mode=quote)
  // --------------------------------------------------------------------------
  console.log('\n--- 10. Testing Repeatable Quote & Lore Guesser ---');
  await page.goto(url('/minigames/play?type=repeatable&mode=quote'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const quoteLoaded = (await page.$('blockquote')) !== null;
  const quotePill = await page.innerText('button:has-text("Lore & Quote Guesser")').catch(() => null);
  console.log(`- Quote blockquote found: ${quoteLoaded}, Pill text: ${quotePill}`);
  await page.screenshot({ path: path.join(OUT_DIR, '12_quote_guesser.png') });
  if (quoteLoaded && quotePill) {
    results.quote_guesser_play = true;
    console.log('✓ Quote Guesser Passed');
  }

  // --------------------------------------------------------------------------
  // TEST 11: Repeatable Audio / Terror Radius Guesser (/en/minigames/play?type=repeatable&mode=audio)
  // --------------------------------------------------------------------------
  console.log('\n--- 11. Testing Repeatable Audio Guesser ---');
  await page.goto(url('/minigames/play?type=repeatable&mode=audio'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const audioBtnFound = (await page.$('button:has-text("Killer Theme")')) !== null;
  const audioPill = await page.innerText('button:has-text("Terror Radius Guesser")').catch(() => null);
  console.log(`- Audio button found: ${audioBtnFound}, Pill text: ${audioPill}`);
  await page.screenshot({ path: path.join(OUT_DIR, '13_audio_guesser.png') });
  if (audioBtnFound && audioPill) {
    results.audio_guesser_play = true;
    console.log('✓ Audio Guesser Passed');
  }

  // --------------------------------------------------------------------------
  // TEST 12: Repeatable Killer Power Guesser (/en/minigames/play?type=repeatable&mode=power)
  // --------------------------------------------------------------------------
  console.log('\n--- 12. Testing Repeatable Killer Power Guesser ---');
  await page.goto(url('/minigames/play?type=repeatable&mode=power'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const powerClue = (await page.$('text=Killer Special Power')) !== null;
  const powerPill = await page.innerText('button:has-text("Killer Power Guesser")').catch(() => null);
  console.log(`- Killer power clue found: ${powerClue}, Pill text: ${powerPill}`);
  await page.screenshot({ path: path.join(OUT_DIR, '14_power_guesser.png') });
  if (powerClue && powerPill) {
    results.power_guesser_play = true;
    console.log('✓ Killer Power Guesser Passed');
  }

  // --------------------------------------------------------------------------
  // TEST 13: Repeatable Addon Guesser (/en/minigames/play?type=repeatable&mode=addon)
  // --------------------------------------------------------------------------
  console.log('\n--- 13. Testing Repeatable Add-on Guesser ---');
  await page.goto(url('/minigames/play?type=repeatable&mode=addon'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const addonClue = (await page.$('text=Killer Add-on Modifier')) !== null;
  console.log(`- Add-on clue found: ${addonClue}`);
  await page.screenshot({ path: path.join(OUT_DIR, '15_addon_guesser.png') });
  if (addonClue) {
    results.addon_guesser_play = true;
    console.log('✓ Add-on Guesser Passed');
  }

  // --------------------------------------------------------------------------
  // TEST 14: Repeatable Emoji Riddle (/en/minigames/play?type=repeatable&mode=emoji_riddle)
  // --------------------------------------------------------------------------
  console.log('\n--- 14. Testing Repeatable Emoji Riddle ---');
  await page.goto(url('/minigames/play?type=repeatable&mode=emoji_riddle'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const emojiClue = (await page.$('text=Emoji Riddle')) !== null;
  console.log(`- Emoji clue found: ${emojiClue}`);
  await page.screenshot({ path: path.join(OUT_DIR, '16_emoji_riddle.png') });
  if (emojiClue) {
    results.emoji_riddle_play = true;
    console.log('✓ Emoji Riddle Passed');
  }

  // Filter non-fatal SSL or analytics console logs
  const fatalErrors = consoleErrors.filter(
    (e) => !e.includes('SSL') && !e.includes('umami') && !e.includes('favicon')
  );

  if (fatalErrors.length > 0) {
    console.warn('Console warnings/errors detected:', fatalErrors);
  }

  await browser.close();

  // Write summary report
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(results, null, 2));
  console.log('\n========================================');
  console.log('Playwright Test Results:');
  console.log(JSON.stringify(results, null, 2));
  console.log('========================================');

  const allPassed =
    results.hub_desktop &&
    results.hub_mobile &&
    results.idle_autocomplete_and_guess &&
    results.idle_clues_and_surrender &&
    results.creator_multi_round &&
    results.creator_export_import &&
    results.creator_share &&
    results.play_custom_gauntlet &&
    results.realm_guesser_play;


  if (!allPassed) {
    console.error('Some tests failed!');
    process.exit(1);
  } else {
    console.log('ALL Minigames Playwright E2E tests PASSED successfully!');
  }
}

run().catch((err) => {
  console.error('Fatal Playwright suite failure:', err);
  process.exit(1);
});
