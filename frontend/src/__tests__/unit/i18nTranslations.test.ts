// frontend/src/__tests__/unit/i18nTranslations.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { getDictionary } from '@/utils/../i18n/get-dictionary';
import { i18n, type Locale } from '@/utils/../i18n/config';
import { en, es, pl, de, ja } from '@/utils/../locales';
import type { Dictionary } from '@/utils/../locales/types';

const allLocales: Locale[] = ['en', 'es', 'pl', 'de', 'ja'];
const expectedNamespaces = [
  'app',
  'landing',
  'generator',
  'stats',
  'filters',
  'pagination',
  'card',
  'modal',
  'empty',
  'guesser',
  'voice',
  'characterDetail',
  'sidebar',
  'smashOrPass',
  'user',
  'swf',
  'draft',
  'streaks',
] as const;

test('i18n Config: supported locales list', () => {
  assert.deepStrictEqual(i18n.locales, ['en', 'es', 'pl', 'de', 'ja']);
  assert.strictEqual(i18n.defaultLocale, 'en');
});

test('getDictionary resolves valid Dictionary object for each supported locale', async () => {
  for (const locale of allLocales) {
    const dict = await getDictionary(locale);
    assert.ok(dict, `Dictionary for ${locale} must be defined`);
    assert.strictEqual(typeof dict, 'object');

    for (const ns of expectedNamespaces) {
      assert.ok((dict as any)[ns], `Namespace "${ns}" must exist in ${locale}`);
      assert.strictEqual(typeof (dict as any)[ns], 'object', `Namespace "${ns}" in ${locale} must be an object`);
    }
  }
});

test('getDictionary falls back to English for unknown locales', async () => {
  const fallbackDict = await getDictionary('fr' as unknown as Locale);
  assert.ok(fallbackDict);
  assert.strictEqual(fallbackDict.app.title, en.app.title);
  assert.strictEqual(fallbackDict.landing.enterButton, en.landing.enterButton);
});

test('Locales export parity: all 5 locales conform to English dictionary shape', () => {
  const localeDicts: Record<Locale, Dictionary> = { en, es, pl, de, ja };

  function verifyKeysRecursive(baseline: Record<string, any>, target: Record<string, any>, path: string, loc: string) {
    for (const [key, value] of Object.entries(baseline)) {
      const currentPath = path ? `${path}.${key}` : key;
      assert.ok(key in target, `Missing translation key "${currentPath}" in ${loc}`);

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        assert.strictEqual(typeof target[key], 'object', `Key "${currentPath}" in ${loc} must be an object`);
        verifyKeysRecursive(value, target[key], currentPath, loc);
      } else if (typeof value === 'string') {
        assert.strictEqual(typeof target[key], 'string', `Key "${currentPath}" in ${loc} must be a string`);
        assert.ok((target[key] as string).length > 0, `Key "${currentPath}" in ${loc} cannot be empty`);
      }
    }
  }

  for (const loc of allLocales) {
    const dict = localeDicts[loc];
    verifyKeysRecursive(en, dict, '', loc);
  }
});

test('Interpolation placeholders: {page}, {slot}, {drawn}, {total} preserved across all locales', () => {
  const localeDicts: Record<Locale, Dictionary> = { en, es, pl, de, ja };

  for (const loc of allLocales) {
    const dict = localeDicts[loc];

    assert.ok(dict.generator.spinWheels.includes('{slot}'), `generator.spinWheels in ${loc} must include {slot}`);
    assert.ok(dict.generator.selectedPage.includes('{page}'), `generator.selectedPage in ${loc} must include {page}`);
    assert.ok(dict.generator.slotBadge.includes('{page}'), `generator.slotBadge in ${loc} must include {page}`);
    assert.ok(dict.generator.slotBadge.includes('{slot}'), `generator.slotBadge in ${loc} must include {slot}`);
    assert.ok(dict.generator.drawnBadge.includes('{drawn}'), `generator.drawnBadge in ${loc} must include {drawn}`);
    assert.ok(dict.generator.drawnBadge.includes('{total}'), `generator.drawnBadge in ${loc} must include {total}`);
  }
});

test('Smash or Pass locale coverage: all roster categories and tiers present in all locales', () => {
  const localeDicts: Record<Locale, Dictionary> = { en, es, pl, de, ja };
  const expectedTiers = ['godTier', 'fatalAttraction', 'friendzone', 'eldritchVoid'] as const;
  const expectedControls = ['pass', 'smash', 'superSmash', 'stats', 'reset', 'keybindings'] as const;
  const expectedRosters = ['canon', 'hoy', 'legendary', 'cyberpunk', 'anime', 'gothic'] as const;

  for (const loc of allLocales) {
    const sop = localeDicts[loc].smashOrPass;
    assert.ok(sop, `smashOrPass must exist in ${loc}`);

    for (const tier of expectedTiers) {
      assert.ok((sop as any)[tier], `Tier "${tier}" must exist in ${loc}.smashOrPass`);
    }

    for (const ctrl of expectedControls) {
      assert.ok((sop.controls as any)[ctrl], `Control "${ctrl}" must exist in ${loc}.smashOrPass`);
    }

    for (const roster of expectedRosters) {
      assert.ok((sop.rosters as any)[roster], `Roster "${roster}" must exist in ${loc}.smashOrPass`);
      assert.ok((sop.rosters as any)[roster].name, `Roster "${roster}.name" must exist in ${loc}`);
    }

    assert.ok(sop.chaosRating, `chaosRating must exist in ${loc}`);
    assert.ok(sop.dangerLevel, `dangerLevel must exist in ${loc}`);
    assert.ok(sop.compatibilityScore, `compatibilityScore must exist in ${loc}`);
  }
});

test('Modal and Hover i18n coverage: all inspection and role keys present in all locales', () => {
  const localeDicts: Record<Locale, Dictionary> = { en, es, pl, de, ja };
  const expectedModalKeys = [
    'close',
    'character',
    'role',
    'copySlug',
    'slugCopied',
    'perkDescription',
    'generalPerk',
    'alias',
    'clickToInspectPerk',
    'clickToInspect',
    'killerPerk',
    'survivorPerk',
    'unownedPerk',
    'equipment',
    'clickOutsideToClose',
  ] as const;

  for (const loc of allLocales) {
    const modalDict = localeDicts[loc].modal;
    assert.ok(modalDict, `modal must exist in ${loc}`);
    for (const key of expectedModalKeys) {
      assert.ok(key in modalDict, `Key "${key}" must exist in ${loc}.modal`);
      assert.strictEqual(typeof (modalDict as any)[key], 'string');
      assert.ok((modalDict as any)[key].length > 0);
    }
  }
});

test('Sidebar Bug Report and Buy Coffee i18n coverage across all locales', () => {
  const localeDicts: Record<Locale, Dictionary> = { en, es, pl, de, ja };
  const expectedSidebarKeys = [
    'bugReportModalTitle',
    'bugReportModalSubtitle',
    'bugCategoryPerks',
    'bugCategoryCharacters',
    'bugCategoryMaps',
    'bugCategoryChallenges',
    'bugCategoryDraftSwf',
    'bugCategoryUiTranslations',
    'bugCategoryOther',
    'bugTitleLabel',
    'bugTitlePlaceholder',
    'bugCategoryLabel',
    'bugDescriptionLabel',
    'bugDescriptionPlaceholder',
    'bugGuestEmailLabel',
    'bugGuestEmailPlaceholder',
    'bugLoggedInAs',
    'bugScreenshotsLabel',
    'bugUploadImage',
    'bugSecurityVerification',
    'bugSubmitButton',
    'bugSubmitting',
    'bugSuccessMessage',
    'bugErrorMessage',
    'bugCloseButton',
    'bugAltchaVerifying',
    'bugAltchaVerified',
    'coffeeTitle',
    'coffeeSubtitle',
    'coffeeFuelNotice',
    'coffeeDonationMessage',
    'coffeeBuyMeCoffeeTagline',
    'coffeeKofiTagline',
    'coffeePatreonTagline',
    'coffeeVisit',
    'coffeeClose',
  ] as const;

  for (const loc of allLocales) {
    const sidebarDict = localeDicts[loc].sidebar;
    assert.ok(sidebarDict, `sidebar must exist in ${loc}`);
    for (const key of expectedSidebarKeys) {
      assert.ok(key in sidebarDict, `Key "${key}" must exist in ${loc}.sidebar`);
      assert.strictEqual(typeof (sidebarDict as any)[key], 'string');
      assert.ok((sidebarDict as any)[key].length > 0);
    }
  }
});

test('Character Detail combat, terror radius, codex and sort options i18n coverage across all locales', () => {
  const localeDicts: Record<Locale, Dictionary> = { en, es, pl, de, ja };
  const expectedDetailKeys = [
    'combatAttributes',
    'clickTerrorRadiusVisualizer',
    'clickOutsideToClose',
    'acousticRange',
    'entityArchives',
    'codex',
    'enteredTheFog',
    'currentBaseTerrorRadius',
    'lullaby',
    'audible',
    'chase',
    'killerBase',
    'survivorSprint',
    'straightGapClose',
    'straightLine',
    'clickOfferingForDetails',
    'clickAddonForDetails',
    'clickItemForDetails',
    'clickToInspectPerk',
    'killerPerk',
    'survivorPerk',
    'unownedPerk',
    'immediateChaseDesc',
    'dangerZoneDesc',
    'approachingDesc',
    'audibleRangeDesc',
    'generalPerk',
    'alias',
  ] as const;

  for (const loc of allLocales) {
    const detailDict = localeDicts[loc].characterDetail;
    assert.ok(detailDict, `characterDetail must exist in ${loc}`);
    for (const key of expectedDetailKeys) {
      assert.ok(key in detailDict, `Key "${key}" must exist in ${loc}.characterDetail`);
      assert.strictEqual(typeof (detailDict as any)[key], 'string');
      assert.ok((detailDict as any)[key].length > 0);
    }
  }
});