// frontend/scripts/verify-creator-features.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = (process.env.TIER_LISTS_BASE_URL || 'https://localhost').replace(/\/+$/, '');
const OUT_DIR = path.join(__dirname, '..', '..', 'playwright', 'tier-lists-creator-verify');
fs.mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: 'mobile-420', width: 420, height: 800 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'laptop-1280', width: 1280, height: 720 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'ultrawide-2560', width: 2560, height: 1440 },
];

async function noOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

async function run() {
  console.log(`Starting Creator Playwright Verification against ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        ignoreHTTPSErrors: true,
      });
      const page = await context.newPage();

      // Clear any prior draft
      await page.goto(`${BASE_URL}/en/tier-lists/new`, { waitUntil: 'networkidle' });
      await page.evaluate(() => localStorage.removeItem('lemondbd_tier_list_draft'));
      await page.reload({ waitUntil: 'networkidle' });

      // 1. Verify No Horizontal Overflow
      const overflowOk = await noOverflow(page);
      assert.ok(overflowOk, `Horizontal overflow detected at ${vp.width}x${vp.height}`);
      console.log(`  ✓ No horizontal overflow at ${vp.width}px`);

      // 2. Verify Header: No border-b, includes Navigation, Preview, and Create
      const header = page.locator('main header').first();
      await header.waitFor({ state: 'visible' });
      const headerClasses = await header.getAttribute('class');
      assert.ok(!headerClasses?.includes('border-b'), 'Header must not have border-b divider line');
      console.log('  ✓ Header has no horizontal line');

      const navLink = header.locator('a[href*="/tier-lists"]:visible').first();
      assert.ok(await navLink.isVisible(), 'Header must contain visible link to tier lists');

      const previewBtn = header.locator('button:has-text("Preview"):visible').first();
      assert.ok(await previewBtn.isVisible(), 'Header must contain visible Preview button');

      const createBtn = header.locator('[data-tier-create]:visible').first();
      assert.ok(await createBtn.isVisible(), 'Header must contain visible Create button');
      const createText = (await createBtn.textContent())?.trim();
      assert.equal(createText, 'Create', 'Create button label must be shortened to "Create"');
      console.log('  ✓ Header contains in-line Navigation, Preview, and shortened Create button');

      // 3. Verify Action Buttons: Ensure NO duplicate buttons exist on the page
      const visiblePreviewButtons = await page.locator('button:has-text("Preview"):visible').count();
      assert.equal(visiblePreviewButtons, 1, 'Only 1 Preview button must be visible on the page (duplicate removed)');

      const visibleCreateButtons = await page.locator('[data-tier-create]:visible').count();
      assert.equal(visibleCreateButtons, 1, 'Only 1 Create button must be visible on the page (duplicate removed)');
      console.log('  ✓ No duplicate buttons (exactly 1 Preview and 1 Create button visible on page)');

      // 4. Test Item Creation & Item Editing (on 1280px)
      if (vp.name === 'laptop-1280') {
        console.log('  Testing Item Addition and Full Editing (Name + Image URL)...');
        // Add an item via Links source
        const nameInput = page.locator('label').filter({ hasText: /^Name$/ }).locator('input').first();
        const urlInput = page.locator('label').filter({ hasText: /^Image URL$/ }).locator('input').first();
        const addBtn = page.getByRole('button', { name: 'Add an item' });

        await nameInput.fill('Original Item');
        await urlInput.fill('https://example.com/original.png');
        await addBtn.click();
        await page.waitForTimeout(300);

        // Verify item card is present in CreatorItems
        const itemCard = page.locator('main ul > li').first();
        await itemCard.waitFor({ state: 'visible' });
        const initialCardName = await itemCard.locator('input').inputValue();
        assert.equal(initialCardName, 'Original Item');

        // Click edit button on the item card
        const editBtn = itemCard.locator('button[aria-label^="Edit "]').first();
        await editBtn.click();

        // Verify TierItemEditModal opens
        const editModal = page.locator('div[role="dialog"]');
        await editModal.waitFor({ state: 'visible' });
        await editModal.screenshot({ path: path.join(OUT_DIR, 'edit-modal.png') });
        console.log('  ✓ TierItemEditModal opened successfully');

        // Verify prefilled values
        const modalNameInput = editModal.locator('input[type="text"]');
        const modalUrlInput = editModal.locator('input[type="url"]');
        assert.equal(await modalNameInput.inputValue(), 'Original Item');
        assert.equal(await modalUrlInput.inputValue(), 'https://example.com/original.png');

        // Edit both name and image URL
        await modalNameInput.fill('Edited Item Name');
        await modalUrlInput.fill('https://example.com/edited.png');

        // Save
        const modalSaveBtn = editModal.getByRole('button', { name: 'Save', exact: true });
        await modalSaveBtn.click();
        await editModal.waitFor({ state: 'hidden' });
        console.log('  ✓ TierItemEditModal saved changes');

        // Verify item card in CreatorItems now reflects the edited name
        const updatedCardName = await itemCard.locator('input').inputValue();
        assert.equal(updatedCardName, 'Edited Item Name', 'Item name was not updated');

        // Re-open edit modal to verify new image URL persisted in draft
        await editBtn.click();
        await editModal.waitFor({ state: 'visible' });
        assert.equal(await modalUrlInput.inputValue(), 'https://example.com/edited.png', 'Item image URL was not updated');
        await editModal.getByRole('button', { name: 'Cancel', exact: true }).click();
        await page.locator('section').nth(2).screenshot({ path: path.join(OUT_DIR, 'items-section.png') });
        console.log('  ✓ Both Item Name and Image URL / Avatar edited successfully and verified');
      }

      // 5. Test Draft Restored Toast (on 1280px)
      if (vp.name === 'laptop-1280') {
        console.log('  Testing Restored Draft Toast...');
        // Set draft
        await page.evaluate(() => {
          localStorage.setItem(
            'lemondbd_tier_list_draft',
            JSON.stringify({
              title: 'Draft Test',
              description: '',
              tiers: [{ id: 's', label: 'S', color: 's' }],
              items: [{ id: 'item-1', name: 'Item 1' }],
            })
          );
        });

        await page.reload({ waitUntil: 'networkidle' });

        // Toast must appear in top-right fixed position
        const toast = page.locator('div[role="status"]').first();
        await toast.waitFor({ state: 'visible', timeout: 5000 });
        const toastClasses = await toast.getAttribute('class');
        assert.ok(toastClasses?.includes('fixed top-5 right-5'), 'Toast must be fixed in the top-right');
        assert.ok(toastClasses?.includes('z-50'), 'Toast must have z-50 floating elevation');

        const toastText = await toast.textContent();
        assert.ok(toastText?.includes('Your unfinished draft was restored.'), 'Toast must show restored message');
        console.log('  ✓ Restored draft toast appears in top-right corner');

        // Click dismiss button
        const dismissBtn = toast.getByRole('button', { name: 'Dismiss', exact: true });
        if (await dismissBtn.isVisible()) {
          await dismissBtn.click();
          await toast.waitFor({ state: 'hidden', timeout: 3000 });
          console.log('  ✓ Restored draft toast dismissed cleanly');
        }
      }

      // Take screenshot per viewport
      await page.screenshot({
        path: path.join(OUT_DIR, `${vp.name}.png`),
        fullPage: false,
      });

      await context.close();
    }

    console.log('\nAll Playwright verification checks PASSED successfully!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('\nVerification FAILED:', err);
  process.exit(1);
});
