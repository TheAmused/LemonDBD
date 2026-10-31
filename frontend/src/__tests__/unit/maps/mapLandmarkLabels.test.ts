// frontend/src/__tests__/unit/maps/mapLandmarkLabels.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { KNOWN_FEATURE_CODES, getFeatureLandmarkName } from '@/utils/mapLandmarkLabels';
import en from '@/locales/en';
import de from '@/locales/de';
import es from '@/locales/es';
import ja from '@/locales/ja';
import pl from '@/locales/pl';

test('KNOWN_FEATURE_CODES defines all 10 competitive feature codes', () => {
  assert.deepStrictEqual(KNOWN_FEATURE_CODES, [
    'C|H',
    'H/FB',
    'WT',
    'CT',
    'GARDEN',
    'STATUE',
    'H',
    'T',
    'P',
    'UFO',
  ]);
});

test('getFeatureLandmarkName translates all codes across all languages', () => {
  const codeToEnKey: Record<string, string> = {
    'C|H': en.maps.landmarkCowTreeHarvester,
    'H/FB': en.maps.landmarkHouseFallBuilding,
    'WT': en.maps.landmarkWaterTower,
    'CT': en.maps.landmarkCourtyard,
    'GARDEN': en.maps.landmarkGarden,
    'STATUE': en.maps.landmarkStatue,
    'H': en.maps.landmarkHill,
    'T': en.maps.landmarkTower,
    'P': en.maps.landmarkPagoda,
    'UFO': en.maps.landmarkShuttle,
  };

  for (const code of KNOWN_FEATURE_CODES) {
    assert.strictEqual(getFeatureLandmarkName(code, en), codeToEnKey[code]);
  }

  // Check other locales
  assert.strictEqual(getFeatureLandmarkName('C|H', de), 'Kuhbaum / Mähdrescher');
  assert.strictEqual(getFeatureLandmarkName('WT', ja), '給水塔');
  assert.strictEqual(getFeatureLandmarkName('UFO', de), 'Abgestürztes Shuttle');
  assert.strictEqual(getFeatureLandmarkName('H/FB', pl), 'Dom / Budynek z Zeskokiem');
});

test('getFeatureLandmarkName defensive edge cases', () => {
  assert.strictEqual(getFeatureLandmarkName('UNKNOWN_CODE', en), 'UNKNOWN_CODE');
  assert.strictEqual(getFeatureLandmarkName('C|H', null), 'C|H');
  assert.strictEqual(getFeatureLandmarkName('C|H', undefined), 'C|H');
  assert.strictEqual(getFeatureLandmarkName('WT', {} as any), 'WT');
});

test('all 5 locales provide translations for landmark and legend keys', () => {
  const locales = [
    { name: 'en', dict: en },
    { name: 'de', dict: de },
    { name: 'es', dict: es },
    { name: 'ja', dict: ja },
    { name: 'pl', dict: pl },
  ];

  const requiredKeys = [
    'landmarkCowTreeHarvester',
    'landmarkHouseFallBuilding',
    'landmarkWaterTower',
    'landmarkCourtyard',
    'landmarkGarden',
    'landmarkStatue',
    'landmarkHill',
    'landmarkTower',
    'landmarkPagoda',
    'landmarkShuttle',
    'legendTitle',
    'legendToggleAria',
    'legendClockTitle',
    'legendClockDesc',
    'legendFeatures',
  ] as const;

  for (const { name, dict } of locales) {
    for (const key of requiredKeys) {
      const val = dict.maps[key as keyof typeof dict.maps];
      assert.ok(
        typeof val === 'string' && val.length > 0,
        `Locale ${name} is missing key ${key}`
      );
    }
  }
});
