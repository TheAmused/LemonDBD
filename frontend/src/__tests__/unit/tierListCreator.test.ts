// frontend/src/__tests__/unit/tierListCreator.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  LADDER_PRESETS,
  appendItems,
  buildLadder,
  estimateStoredBytes,
  nameFromFileName,
  nameFromUrl,
  parseLinkLines,
} from '@/utils/tierLists/creator';
import { TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import enDict from '@/locales/en';

const feelings = (k: 'love' | 'like' | 'meh' | 'hate') => enDict.tierLists.creator.feelings[k];

describe('creator: ladder presets', () => {
  it('builds every preset with unique ids and valid colors', () => {
    for (const preset of LADDER_PRESETS) {
      const tiers = buildLadder(preset.id, feelings);
      assert.equal(tiers.length, preset.labels.length);
      assert.equal(new Set(tiers.map((t) => t.id)).size, tiers.length, `${preset.id} ids must be unique`);
      for (const tier of tiers) assert.ok(tier.label.length > 0);
    }
  });

  it('translates the feelings preset and keeps stable ids across languages', () => {
    const tiers = buildLadder('feelings', feelings);
    assert.deepEqual(tiers.map((t) => t.label), ['Love it', 'Like it', 'Meh', 'Hate it']);
    assert.deepEqual(tiers.map((t) => t.id), ['love', 'like', 'meh', 'hate']);
  });

  it('every preset has a label in all 5 locales', async () => {
    for (const code of ['en', 'de', 'es', 'ja', 'pl']) {
      const dict = (await import(`@/locales/${code}`)).default;
      for (const preset of LADDER_PRESETS) assert.ok(dict.tierLists.creator.presets[preset.id]);
    }
  });
});

describe('creator: names from files and links', () => {
  it('derives readable names', () => {
    assert.equal(nameFromFileName('the_trapper-portrait.webp'), 'the trapper portrait');
    assert.equal(nameFromFileName('Meg Thomas.PNG'), 'Meg Thomas');
    assert.equal(nameFromUrl('https://cdn.test/img/leon%20kennedy.png?v=2'), 'leon kennedy');
    assert.equal(nameFromUrl('not a url'), '');
  });

  it('parses every accepted line shape and reports disallowed links', () => {
    const { items, invalidLines } = parseLinkLines(
      [
        'Meg Thomas | https://cdn.test/meg.png',
        '',
        'https://cdn.test/the-trapper.png',
        'Just a name',
        'Bad | http://insecure.test/x.png',
        'Evil | javascript:alert(1)',
        'Tabbed\thttps://cdn.test/tab.png',
        'Dashed - https://cdn.test/dash.png',
        'Local | /static/icons/perks/x.webp',
      ].join('\n')
    );
    assert.deepEqual(items, [
      { name: 'Meg Thomas', image: 'https://cdn.test/meg.png' },
      { name: 'the trapper', image: 'https://cdn.test/the-trapper.png' },
      { name: 'Just a name' },
      { name: 'Tabbed', image: 'https://cdn.test/tab.png' },
      { name: 'Dashed', image: 'https://cdn.test/dash.png' },
      { name: 'Local', image: '/static/icons/perks/x.webp' },
    ]);
    assert.deepEqual(invalidLines, [5, 6]);
  });

  it('a hyphenated name is not split into name and link', () => {
    assert.deepEqual(parseLinkLines('Jill-Valentine - fan favourite').items, [{ name: 'Jill-Valentine - fan favourite' }]);
  });
});

describe('creator: adding items', () => {
  it('keeps ids unique, keeps catalog ids, and stops at the item cap', () => {
    let { items } = appendItems([], [{ name: 'Chips' }, { name: 'Chips' }, { name: 'Leon', id: 'survivor:24' }]);
    assert.deepEqual(items.map((i) => i.id), ['chips', 'chips-2', 'survivor:24']);

    ({ items } = appendItems(items, [{ name: 'Leon again', id: 'survivor:24' }]));
    assert.equal(items[3].id, 'leon-again', 'a clashing catalog id falls back to a fresh one');

    const many = Array.from({ length: TIER_LIST_LIMITS.maxItems + 5 }, (_, i) => ({ name: `n${i}` }));
    const result = appendItems([], many);
    assert.equal(result.items.length, TIER_LIST_LIMITS.maxItems);
    assert.equal(result.skipped, 5);
  });

  it('skips blank names and estimates storage from inline images', () => {
    const { items, skipped } = appendItems([], [{ name: '   ' }, { name: 'A', image: `data:image/png;base64,${'A'.repeat(1000)}` }]);
    assert.equal(skipped, 1);
    assert.ok(estimateStoredBytes(items) > 2000);
  });
});

describe('creator: page wiring', () => {
  const SRC = path.resolve(__dirname, '../..');
  it('/tier-lists/new renders the creator through PageShell with a loading state', () => {
    const page = fs.readFileSync(path.join(SRC, 'app/[locale]/tier-lists/new/page.tsx'), 'utf-8');
    assert.ok(page.includes('<PageShell') && page.includes('<TierListCreator'));
    assert.ok(fs.existsSync(path.join(SRC, 'app/[locale]/tier-lists/new/loading.tsx')));
  });

  it('the hub sends "New custom list" to the creator', () => {
    const hub = fs.readFileSync(path.join(SRC, 'components/tier-lists/TierListHub.tsx'), 'utf-8');
    assert.ok(hub.includes('/tier-lists/new'));
  });

  it('every creator button and label key exists in all 5 locales with shortened create label', async () => {
    const expectedCreate: Record<string, string> = {
      en: 'Create',
      pl: 'Stwórz',
      de: 'Erstellen',
      es: 'Crear',
      ja: '作成',
    };

    for (const code of ['en', 'de', 'es', 'ja', 'pl']) {
      const dict = (await import(`@/locales/${code}`)).default;
      const c = dict.tierLists.creator;
      assert.equal(c.create, expectedCreate[code], `${code} create label must be shortened to "${expectedCreate[code]}"`);
      assert.ok(c.editItem, `${code} missing editItem key`);
      assert.ok(c.editItemAria, `${code} missing editItemAria key`);
      assert.ok(c.removeImage, `${code} missing removeImage key`);
      assert.ok(c.closeToast, `${code} missing closeToast key`);
    }
  });

  it('TierListCreator puts one centered Preview + Save row under all the sections', () => {
    const creator = fs.readFileSync(path.join(SRC, 'components/tier-lists/creator/TierListCreator.tsx'), 'utf-8');
    assert.ok(!creator.includes('border-b border-border-color pb-4'), 'must not have a horizontal border under the header');
    assert.ok(creator.includes('fixed top-5 right-5 z-50'), 'restored draft must render as fixed top-right toast');
    assert.equal(creator.split('setPreviewOpen(true)').length - 1, 1, 'exactly one Preview button');
    assert.equal(creator.split('submitButton(').length - 1, 1, 'the save button is rendered once');
    const items = creator.indexOf('c.stepItems');
    const actions = creator.indexOf('setPreviewOpen(true)');
    assert.ok(items !== -1 && actions > items, 'the buttons come after the last section');
    assert.ok(creator.slice(actions - 400, actions).includes('justify-center'), 'and are centered');
    assert.ok(creator.includes('c.stepBasics'));
    // CreatorItems wires onUpdateItem
    assert.ok(creator.includes('onUpdateItem='), 'CreatorItems must receive onUpdateItem handler');
  });

  it('TierItemEditModal exists and allows editing both name and image URL', () => {
    const modal = fs.readFileSync(path.join(SRC, 'components/tier-lists/creator/TierItemEditModal.tsx'), 'utf-8');
    assert.ok(modal.includes('c.editItem'));
    assert.ok(modal.includes('t.itemName'));
    assert.ok(modal.includes('t.itemImage'));
    assert.ok(modal.includes('c.removeImage'));
  });
});

