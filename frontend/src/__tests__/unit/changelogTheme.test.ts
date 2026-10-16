// frontend/src/__tests__/unit/changelogTheme.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  CHANGELOG_SECTIONS,
  CHANGELOG_TEXT_COLORS,
  CHANGELOG_HIGHLIGHT_COLORS,
} from '@/components/changelog/changelogTheme';
import { en, es, pl, de, ja } from '@/locales';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const RGBA_RE = /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[\d.]+\s*\)$/;

test('changelogTheme: section and swatch data integrity', async (t) => {
  await t.test('every section has a unique, non-empty label in every locale', () => {
    for (const [locale, dict] of Object.entries({ en, es, pl, de, ja })) {
      assert.deepStrictEqual(Object.keys(dict.changelog.sections).sort(), [...CHANGELOG_SECTIONS].sort(), locale);
      const labels = CHANGELOG_SECTIONS.map((section) => dict.changelog.sections[section]);
      assert.ok(labels.every((label) => label.length > 0), `${locale} has an empty section label`);
      assert.strictEqual(new Set(labels).size, labels.length, `${locale} repeats a section label`);
    }
  });

  await t.test('CHANGELOG_TEXT_COLORS entries are all valid 6-digit hex colors', () => {
    assert.ok(CHANGELOG_TEXT_COLORS.length > 0);
    for (const swatch of CHANGELOG_TEXT_COLORS) {
      assert.match(swatch.value, HEX_COLOR_RE, `${swatch.name} (${swatch.value}) is not a valid hex color`);
    }
  });

  await t.test('CHANGELOG_HIGHLIGHT_COLORS entries are all valid rgba() colors', () => {
    assert.ok(CHANGELOG_HIGHLIGHT_COLORS.length > 0);
    for (const swatch of CHANGELOG_HIGHLIGHT_COLORS) {
      assert.match(swatch.value, RGBA_RE, `${swatch.name} (${swatch.value}) is not a valid rgba() color`);
    }
  });

  await t.test('no duplicate swatch names within the text-color or highlight-color palettes', () => {
    const textNames = CHANGELOG_TEXT_COLORS.map((c) => c.name);
    const highlightNames = CHANGELOG_HIGHLIGHT_COLORS.map((c) => c.name);
    assert.strictEqual(new Set(textNames).size, textNames.length);
    assert.strictEqual(new Set(highlightNames).size, highlightNames.length);
  });
});
