// frontend/src/__tests__/unit/tierListCodec.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeSharePayload,
  encodeSharePayload,
  exportFileName,
  parseTierListJson,
  readShareFragment,
  sanitizeImageUrl,
  serializeTierListDocument,
  tierInk,
  validateTierListDocument,
} from '@/utils/tierLists/codec';
import { DEFAULT_TIERS, TIER_LIST_LIMITS } from '@/utils/tierLists/constants';

describe('sanitizeImageUrl', () => {
  it('keeps https URLs and normalizes them', () => {
    assert.equal(sanitizeImageUrl(' https://cdn.example.com/a.png '), 'https://cdn.example.com/a.png');
  });

  it('rejects script, insecure, credentialed and protocol-relative sources', () => {
    for (const bad of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'http://example.com/a.png',
      'https://user:pass@example.com/a.png',
      '//evil.example/a.png',
      'data:text/html;base64,PHNjcmlwdD4=',
      'data:image/svg+xml;base64,PHN2Zz4=',
      'vbscript:msgbox',
      '',
      42,
      null,
    ]) {
      assert.equal(sanitizeImageUrl(bad), null, `should reject ${String(bad)}`);
    }
  });

  it('accepts raster data URIs up to the cap only', () => {
    assert.equal(sanitizeImageUrl('data:image/png;base64,iVBORw0KGgo='), 'data:image/png;base64,iVBORw0KGgo=');
    const huge = `data:image/png;base64,${'A'.repeat(TIER_LIST_LIMITS.maxDataImageChars)}`;
    assert.equal(sanitizeImageUrl(huge), null);
  });

  it('accepts backend static paths but not traversal', () => {
    assert.equal(sanitizeImageUrl('/static/icons/perks/x.webp'), '/static/icons/perks/x.webp');
    assert.equal(sanitizeImageUrl('/static/../secret'), null);
    assert.equal(sanitizeImageUrl('/static//evil.example/x'), null);
  });
});

describe('validateTierListDocument', () => {
  it('imports a minimal hand-written custom list with dynamic icon URL spellings', () => {
    const result = validateTierListDocument({
      title: 'Snacks',
      items: [
        { name: 'Chips', icon: 'https://x.test/chips.png' },
        { name: 'Chips', image_url: 'https://x.test/chips2.png' },
        { id: 'cake', name: 'Cake', image: 'javascript:alert(1)' },
      ],
      placements: { s: ['chips', 'cake', 'ghost'], zzz: ['chips-2'] },
    });
    assert.ok(result.ok);
    const { doc, warnings } = result;
    assert.equal(doc.format, 'lemondbd-tier-list');
    assert.equal(doc.template, null);
    assert.deepEqual(doc.tiers.map((t) => t.id), DEFAULT_TIERS.map((t) => t.id));
    assert.deepEqual(doc.items?.map((i) => i.id), ['chips', 'chips-2', 'cake']);
    assert.equal(doc.items?.[2].image, undefined, 'the javascript: image is dropped, the item kept');
    assert.deepEqual(doc.placements.s, ['chips', 'cake']);
    const codes = Object.fromEntries(warnings.map((w) => [w.code, w.count]));
    assert.equal(codes.droppedImages, 1);
    assert.equal(codes.droppedPlacements, 2);
  });

  it('places each key at most once, first tier wins', () => {
    const result = validateTierListDocument({
      items: [{ id: 'a', name: 'A' }],
      placements: { s: ['a'], a: ['a'] },
    });
    assert.ok(result.ok);
    assert.deepEqual(result.doc.placements.s, ['a']);
    assert.deepEqual(result.doc.placements.a, []);
  });

  it('keeps template rankings keyed by catalog keys, without items', () => {
    const result = validateTierListDocument({
      format: 'lemondbd-tier-list',
      version: 1,
      template: 'survivors',
      tiers: [{ id: 'god', label: 'God', color: '#123456' }, { id: 'meh', label: 'Meh', color: 'not-a-color' }],
      items: [{ id: 'x', name: 'ignored' }],
      placements: { god: ['survivor:7', 'bad key!'] },
    });
    assert.ok(result.ok);
    assert.equal(result.doc.template, 'survivors');
    assert.equal(result.doc.items, undefined);
    assert.equal(result.doc.tiers[0].color, '#123456');
    assert.notEqual(result.doc.tiers[1].color, 'not-a-color');
    assert.deepEqual(result.doc.placements.god, ['survivor:7']);
  });

  it('refuses other formats, newer versions, non-objects and empty custom lists', () => {
    assert.deepEqual(validateTierListDocument({ format: 'tiermaker' }), { ok: false, error: 'wrongFormat' });
    assert.deepEqual(validateTierListDocument({ version: 99, items: [{ name: 'a' }] }), {
      ok: false,
      error: 'unsupportedVersion',
    });
    assert.deepEqual(validateTierListDocument([1, 2]), { ok: false, error: 'notAnObject' });
    assert.deepEqual(validateTierListDocument({ title: 'Empty' }), { ok: false, error: 'noItems' });
  });

  it('caps tiers, items and text lengths', () => {
    const result = validateTierListDocument({
      title: 'T'.repeat(500),
      tiers: Array.from({ length: 40 }, (_, i) => ({ id: `t${i}`, label: `T${i}` })),
      items: Array.from({ length: TIER_LIST_LIMITS.maxItems + 25 }, (_, i) => ({ id: `i${i}`, name: `Item ${i}` })),
    });
    assert.ok(result.ok);
    assert.equal(result.doc.tiers.length, TIER_LIST_LIMITS.maxTiers);
    assert.equal(result.doc.items?.length, TIER_LIST_LIMITS.maxItems);
    assert.equal(result.doc.title.length, TIER_LIST_LIMITS.maxTitle);
    const codes = warningsOf(result);
    assert.equal(codes.droppedTiers, 20);
    assert.equal(codes.droppedItems, 25);
    assert.equal(codes.truncated, 1);
  });

  it('strips control characters from text', () => {
    const result = validateTierListDocument({ title: 'a\u0000b\nc', items: [{ name: 'x\u0007y' }] });
    assert.ok(result.ok);
    assert.equal(result.doc.title, 'a b c');
    assert.equal(result.doc.items?.[0].name, 'x y');
  });
});

function warningsOf(result: ReturnType<typeof validateTierListDocument>): Record<string, number> {
  return result.ok ? Object.fromEntries(result.warnings.map((w) => [w.code, w.count])) : {};
}

describe('parseTierListJson', () => {
  it('reports invalid JSON and oversize payloads', () => {
    assert.deepEqual(parseTierListJson('{nope'), { ok: false, error: 'invalidJson' });
    assert.deepEqual(parseTierListJson(' '.repeat(TIER_LIST_LIMITS.maxPayloadChars + 1)), {
      ok: false,
      error: 'tooLarge',
    });
  });

  it('round-trips its own serialization', () => {
    const first = parseTierListJson(JSON.stringify({ title: 'X', items: [{ name: 'A' }], placements: { s: ['a'] } }));
    assert.ok(first.ok);
    const second = parseTierListJson(serializeTierListDocument(first.doc));
    assert.ok(second.ok);
    assert.deepEqual(second.doc, first.doc);
    assert.deepEqual(second.warnings, []);
  });
});

describe('share links', () => {
  it('round-trips a document through the compressed fragment', async () => {
    const parsed = validateTierListDocument({
      title: 'Share me',
      items: Array.from({ length: 60 }, (_, i) => ({ name: `Entity ${i}`, image: `https://img.test/${i}.png` })),
      placements: { s: ['entity-0', 'entity-1'] },
    });
    assert.ok(parsed.ok);
    const payload = await encodeSharePayload(parsed.doc);
    assert.match(payload, /^z\.[A-Za-z0-9_-]+$/);
    assert.ok(payload.length < JSON.stringify(parsed.doc).length, 'compression should shrink the payload');

    const decoded = await decodeSharePayload(payload);
    assert.ok(decoded.ok);
    assert.deepEqual(decoded.doc, parsed.doc);
  });

  it('decodes the uncompressed fallback and rejects garbage without throwing', async () => {
    const json = JSON.stringify({ title: 'Plain', items: [{ name: 'A' }] });
    const b64 = Buffer.from(json).toString('base64url');
    const decoded = await decodeSharePayload(`j.${b64}`);
    assert.ok(decoded.ok);
    assert.equal(decoded.doc.title, 'Plain');

    assert.deepEqual(await decodeSharePayload('z.!!!!'), { ok: false, error: 'invalidShareLink' });
    assert.deepEqual(await decodeSharePayload('q.abcd'), { ok: false, error: 'invalidShareLink' });
    assert.deepEqual(await decodeSharePayload('z.'), { ok: false, error: 'invalidShareLink' });
  });

  it('reads the payload from a location hash', () => {
    assert.equal(readShareFragment('#import=z.abc'), 'z.abc');
    assert.equal(readShareFragment('#other=1'), null);
    assert.equal(readShareFragment(''), null);
  });
});

describe('presentation helpers', () => {
  it('picks readable ink for custom colors', () => {
    assert.equal(tierInk('#ffff80'), 'dark');
    assert.equal(tierInk('#101030'), 'light');
    assert.equal(tierInk('s'), 'dark');
  });

  it('builds safe download names', () => {
    assert.equal(exportFileName({ title: 'Best Killers!! 2026', template: null }), 'lemondbd-tier-list-best-killers-2026.json');
    assert.equal(exportFileName({ title: '', template: 'maps' }), 'lemondbd-tier-list-maps.json');
  });
});
