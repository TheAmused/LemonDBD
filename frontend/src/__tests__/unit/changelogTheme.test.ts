// frontend/src/__tests__/unit/changelogTheme.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  CHANGELOG_TAG_THEME,
  CHANGELOG_TAGS,
  CHANGELOG_TEXT_COLORS,
  CHANGELOG_HIGHLIGHT_COLORS,
} from '@/components/changelog/changelogTheme';
import type { ChangelogTag } from '@/types/changelog';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const RGBA_RE = /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[\d.]+\s*\)$/;

test('changelogTheme: tag/theme data integrity', async (t) => {
  await t.test('CHANGELOG_TAGS lists exactly the keys of CHANGELOG_TAG_THEME, no more no less', () => {
    const themeKeys = Object.keys(CHANGELOG_TAG_THEME).sort();
    const tagList = [...CHANGELOG_TAGS].sort();
    assert.deepStrictEqual(tagList, themeKeys);
  });

  await t.test('every tag theme has a non-empty label, badgeClass, and dotClass', () => {
    for (const tag of CHANGELOG_TAGS) {
      const theme = CHANGELOG_TAG_THEME[tag];
      assert.ok(theme.label.length > 0, `${tag} missing label`);
      assert.ok(theme.badgeClass.length > 0, `${tag} missing badgeClass`);
      assert.ok(theme.dotClass.length > 0, `${tag} missing dotClass`);
    }
  });

  await t.test('every tag theme label is unique (no two tags render identically)', () => {
    const labels = CHANGELOG_TAGS.map((t) => CHANGELOG_TAG_THEME[t].label);
    assert.strictEqual(new Set(labels).size, labels.length);
  });

  await t.test('CHANGELOG_TAG_THEME has no entries for tags outside the ChangelogTag union', () => {
    const validTags: ChangelogTag[] = ['feature', 'bugfix', 'balance', 'event', 'announcement'];
    for (const key of Object.keys(CHANGELOG_TAG_THEME)) {
      assert.ok(validTags.includes(key as ChangelogTag), `unexpected tag key: ${key}`);
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
