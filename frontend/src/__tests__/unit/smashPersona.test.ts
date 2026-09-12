// frontend/src/__tests__/unit/smashPersona.test.ts

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRomancePersona,
  reconstructSharedPersona,
  encodeArchetypeShare,
  decodeArchetypeShare,
  buildArchetypeShareUrl,
  copyTextWithFallback,
  type VoteRecord,
} from '../../utils/smashPersona';
import type { EntityItem } from '../../types/smashOrPass';

const mockEntity = (overrides: Partial<EntityItem> = {}): EntityItem => ({
  id: 'test-id',
  roster_id: 'test-roster',
  slug: 'test_character',
  name: 'Test Character',
  role: 'Killer',
  gender: 'male',
  stat: {
    // No `id`: the stats table is 1:1 with entities, so `entity_id` is the key.
    entity_id: 'test-id',
    smash_count: 10,
    pass_count: 5,
    super_smash_count: 2,
    total_votes: 17,
    smash_rate: 65,
    chaos_rating: 50,
  },
  ...overrides,
});

test('SmashPersona: Archetype Calculation Rules', async (t) => {
  const mockArchetypes = {
    untappedSoul: { title: 'The Untapped Soul', desc: 'Empty votes' },
    eldritchDevotee: { title: 'Eldritch Devotee', desc: 'Monsters devotee' },
    redStainAddict: { title: 'Red Stain Addict', desc: 'Loves killers' },
    campfireSoulmate: { title: 'Campfire Soulmate', desc: 'Loves survivors' },
    entitysParamour: { title: 'Entity\'s Paramour', desc: 'Smashes almost everyone' },
    coldHeartedPragmatist: { title: 'Cold-Hearted Pragmatist', desc: 'Passes almost everyone' },
    fogRomantic: { title: 'The Fog Romantic', desc: 'Balanced lover' },
  };

  await t.test('returns untappedSoul when votes array is empty', () => {
    const result = calculateRomancePersona([], mockArchetypes);
    assert.strictEqual(result.archKey, 'untappedSoul');
    assert.strictEqual(result.title, 'The Untapped Soul');
    assert.strictEqual(result.smashRate, 0);
    assert.strictEqual(result.killerAffinity, 0);
    assert.strictEqual(result.survivorAffinity, 0);
    assert.strictEqual(result.favoriteChar, null);
    assert.strictEqual(result.iconName, 'compass');
  });

  await t.test('classifies as eldritchDevotee when 2 or more monsters are smashed', () => {
    const votes: VoteRecord[] = [
      { character: mockEntity({ gender: 'monster_other', role: 'Killer' }), vote: 'smash', timestamp: 1 },
      { character: mockEntity({ gender: 'monster_other', role: 'Killer' }), vote: 'super_smash', timestamp: 2 },
      { character: mockEntity({ gender: 'male', role: 'Survivor' }), vote: 'pass', timestamp: 3 },
    ];
    const result = calculateRomancePersona(votes, mockArchetypes);
    assert.strictEqual(result.archKey, 'eldritchDevotee');
    assert.strictEqual(result.title, 'Eldritch Devotee');
    assert.strictEqual(result.iconName, 'skull');
  });

  await t.test('classifies as redStainAddict when killer affinity >= 75%', () => {
    const votes: VoteRecord[] = [
      { character: mockEntity({ role: 'Killer', gender: 'male' }), vote: 'smash', timestamp: 1 },
      { character: mockEntity({ role: 'Killer', gender: 'female' }), vote: 'smash', timestamp: 2 },
      { character: mockEntity({ role: 'Killer', gender: 'male' }), vote: 'smash', timestamp: 3 },
      { character: mockEntity({ role: 'Survivor', gender: 'female' }), vote: 'pass', timestamp: 4 },
    ];
    const result = calculateRomancePersona(votes, mockArchetypes);
    assert.strictEqual(result.archKey, 'redStainAddict');
    assert.strictEqual(result.killerAffinity, 100);
    assert.strictEqual(result.survivorAffinity, 0);
    assert.strictEqual(result.iconName, 'flame');
  });

  await t.test('classifies as campfireSoulmate when survivor affinity >= 75%', () => {
    const votes: VoteRecord[] = [
      { character: mockEntity({ role: 'Survivor', gender: 'male' }), vote: 'smash', timestamp: 1 },
      { character: mockEntity({ role: 'Survivor', gender: 'female' }), vote: 'smash', timestamp: 2 },
      { character: mockEntity({ role: 'Survivor', gender: 'male' }), vote: 'smash', timestamp: 3 },
      { character: mockEntity({ role: 'Killer', gender: 'male' }), vote: 'pass', timestamp: 4 },
    ];
    const result = calculateRomancePersona(votes, mockArchetypes);
    assert.strictEqual(result.archKey, 'campfireSoulmate');
    assert.strictEqual(result.killerAffinity, 0);
    assert.strictEqual(result.survivorAffinity, 100);
    assert.strictEqual(result.iconName, 'shield');
  });

  await t.test('classifies as entitysParamour when smash rate >= 85% and balanced roles', () => {
    const votes: VoteRecord[] = [
      { character: mockEntity({ role: 'Killer', gender: 'male' }), vote: 'smash', timestamp: 1 },
      { character: mockEntity({ role: 'Survivor', gender: 'female' }), vote: 'smash', timestamp: 2 },
      { character: mockEntity({ role: 'Killer', gender: 'female' }), vote: 'smash', timestamp: 3 },
      { character: mockEntity({ role: 'Survivor', gender: 'male' }), vote: 'smash', timestamp: 4 },
      { character: mockEntity({ role: 'Killer', gender: 'male' }), vote: 'smash', timestamp: 5 },
      { character: mockEntity({ role: 'Survivor', gender: 'female' }), vote: 'smash', timestamp: 6 },
    ];
    const result = calculateRomancePersona(votes, mockArchetypes);
    assert.strictEqual(result.archKey, 'entitysParamour');
    assert.strictEqual(result.smashRate, 100);
    assert.strictEqual(result.iconName, 'heart');
  });

  await t.test('classifies as coldHeartedPragmatist when smash rate <= 20%', () => {
    const votes: VoteRecord[] = [
      { character: mockEntity({ role: 'Killer', gender: 'male' }), vote: 'pass', timestamp: 1 },
      { character: mockEntity({ role: 'Survivor', gender: 'female' }), vote: 'pass', timestamp: 2 },
      { character: mockEntity({ role: 'Killer', gender: 'female' }), vote: 'pass', timestamp: 3 },
      { character: mockEntity({ role: 'Survivor', gender: 'male' }), vote: 'pass', timestamp: 4 },
      { character: mockEntity({ role: 'Killer', gender: 'male' }), vote: 'pass', timestamp: 5 },
      { character: mockEntity({ role: 'Survivor', gender: 'female' }), vote: 'smash', timestamp: 6 },
    ];
    const result = calculateRomancePersona(votes, mockArchetypes);
    assert.strictEqual(result.archKey, 'coldHeartedPragmatist');
    assert.strictEqual(result.smashRate, 17); // 1 / 6 = 16.66% -> 17%
    assert.strictEqual(result.iconName, 'zap');
  });

  await t.test('classifies as fogRomantic when rates and roles are balanced', () => {
    const votes: VoteRecord[] = [
      { character: mockEntity({ role: 'Killer', gender: 'male' }), vote: 'smash', timestamp: 1 },
      { character: mockEntity({ role: 'Survivor', gender: 'female' }), vote: 'smash', timestamp: 2 },
      { character: mockEntity({ role: 'Killer', gender: 'female' }), vote: 'pass', timestamp: 3 },
      { character: mockEntity({ role: 'Survivor', gender: 'male' }), vote: 'pass', timestamp: 4 },
    ];
    const result = calculateRomancePersona(votes, mockArchetypes);
    assert.strictEqual(result.archKey, 'fogRomantic');
    assert.strictEqual(result.smashRate, 50);
    assert.strictEqual(result.killerAffinity, 50);
    assert.strictEqual(result.survivorAffinity, 50);
    assert.strictEqual(result.iconName, 'sparkles');
  });

  await t.test('correctly preserves favoriteChar as the first smashed candidate', () => {
    const votes: VoteRecord[] = [
      { character: mockEntity({ name: 'Pass One' }), vote: 'pass', timestamp: 1 },
      { character: mockEntity({ name: 'The Trapper', slug: 'trapper', role: 'Killer' }), vote: 'smash', timestamp: 2 },
      { character: mockEntity({ name: 'Dwight Fairfield', slug: 'dwight', role: 'Survivor' }), vote: 'smash', timestamp: 3 },
    ];
    const result = calculateRomancePersona(votes, mockArchetypes);
    assert.ok(result.favoriteChar);
    assert.strictEqual(result.favoriteChar?.name, 'The Trapper');
    assert.strictEqual(result.favoriteChar?.slug, 'trapper');
  });

  await t.test('handles 100% pass rate safely without division by zero', () => {
    const votes: VoteRecord[] = [
      { character: mockEntity({ role: 'Killer' }), vote: 'pass', timestamp: 1 },
      { character: mockEntity({ role: 'Survivor' }), vote: 'pass', timestamp: 2 },
    ];
    const result = calculateRomancePersona(votes, mockArchetypes);
    assert.strictEqual(result.smashRate, 0);
    assert.strictEqual(result.killerAffinity, 50); // Default balanced fallback
    assert.strictEqual(result.survivorAffinity, 50);
    assert.strictEqual(result.favoriteChar, null);
  });
});

test('SmashPersona: Deep-Link Encoding, Decoding, and URL Construction', async (t) => {
  await t.test('encodes and decodes shared archetype payload losslessly', () => {
    const payload = {
      k: 'redStainAddict',
      r: 80,
      s: 20,
      ka: 80,
      v: 25,
      fn: 'The Trapper',
      fs: 'trapper',
      fr: 'Killer',
    };

    const encoded = encodeArchetypeShare(payload);
    assert.ok(typeof encoded === 'string');
    assert.ok(encoded.length > 0);

    const decoded = decodeArchetypeShare(encoded);
    assert.ok(decoded !== null);
    assert.strictEqual(decoded.k, payload.k);
    assert.strictEqual(decoded.r, payload.r);
    assert.strictEqual(decoded.s, payload.s);
    assert.strictEqual(decoded.ka, payload.ka);
    assert.strictEqual(decoded.v, payload.v);
    assert.strictEqual(decoded.fn, payload.fn);
    assert.strictEqual(decoded.fs, payload.fs);
    assert.strictEqual(decoded.fr, payload.fr);
  });

  await t.test('buildArchetypeShareUrl appends shared_archetype query parameter to existing URL', () => {
    const base = 'https://lemondbd.com/en/smash-or-pass?ref=nav';
    const payload = {
      k: 'campfireSoulmate',
      r: 60,
      s: 80,
      ka: 20,
      v: 10,
      fn: 'Claudette Morel',
    };

    const shareUrl = buildArchetypeShareUrl(base, payload);
    const parsed = new URL(shareUrl);
    assert.strictEqual(parsed.origin, 'https://lemondbd.com');
    assert.strictEqual(parsed.pathname, '/en/smash-or-pass');
    assert.strictEqual(parsed.searchParams.get('ref'), 'nav');
    const param = parsed.searchParams.get('shared_archetype');
    assert.ok(param);

    const decoded = decodeArchetypeShare(param);
    assert.ok(decoded);
    assert.strictEqual(decoded.k, 'campfireSoulmate');
    assert.strictEqual(decoded.fn, 'Claudette Morel');
  });

  await t.test('decodeArchetypeShare handles malformed strings gracefully without throwing', () => {
    assert.strictEqual(decodeArchetypeShare(''), null);
    assert.strictEqual(decodeArchetypeShare('!not-base64!'), null);
    assert.strictEqual(decodeArchetypeShare('YWJj'), null); // 'abc' is not valid JSON
    assert.strictEqual(decodeArchetypeShare(encodeURIComponent('{}')), null); // missing k
  });

  await t.test('reconstructSharedPersona produces full persona marked as isShared: true', () => {
    const payload = {
      k: 'entitysParamour',
      r: 95,
      s: 50,
      ka: 50,
      v: 30,
      fn: 'Feng Min',
      fs: 'feng_min',
      fr: 'Survivor',
    };
    const mockArchetypes = {
      entitysParamour: { title: 'Paramour of the Entity', desc: 'Shared passion' },
    };

    const persona = reconstructSharedPersona(payload, mockArchetypes);
    assert.strictEqual(persona.isShared, true);
    assert.strictEqual(persona.archKey, 'entitysParamour');
    assert.strictEqual(persona.title, 'Paramour of the Entity');
    assert.strictEqual(persona.smashRate, 95);
    assert.strictEqual(persona.totalVotes, 30);
    assert.strictEqual(persona.favoriteChar?.name, 'Feng Min');
    assert.strictEqual(persona.iconName, 'heart');
  });
});

test('SmashPersona: Clipboard Copy With Fallback', async (t) => {
  await t.test('copyTextWithFallback succeeds using navigator.clipboard when available', async () => {
    let written = '';
    const originalClipboard = (globalThis as any).navigator?.clipboard;
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: {
        writeText: async (str: string) => {
          written = str;
        },
      },
      configurable: true,
    });

    try {
      const ok = await copyTextWithFallback('Test share string');
      assert.strictEqual(ok, true);
      assert.strictEqual(written, 'Test share string');
    } finally {
      if (originalClipboard) {
        Object.defineProperty(globalThis.navigator, 'clipboard', {
          value: originalClipboard,
          configurable: true,
        });
      }
    }
  });

  await t.test('copyTextWithFallback falls back to execCommand when clipboard.writeText fails', async () => {
    let execCommandCalled = false;
    const originalClipboard = (globalThis as any).navigator?.clipboard;
    const originalDocument = (globalThis as any).document;

    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: {
        writeText: async () => {
          throw new Error('Permission denied');
        },
      },
      configurable: true,
    });

    const fakeElements: any[] = [];
    (globalThis as any).document = {
      createElement: (tag: string) => {
        const el = {
          style: {},
          setAttribute: () => {},
          focus: () => {},
          select: () => {},
          value: '',
        };
        fakeElements.push(el);
        return el;
      },
      body: {
        appendChild: () => {},
        removeChild: () => {},
      },
      execCommand: (cmd: string) => {
        if (cmd === 'copy') {
          execCommandCalled = true;
          return true;
        }
        return false;
      },
    };

    try {
      const ok = await copyTextWithFallback('Fallback string');
      assert.strictEqual(ok, true);
      assert.strictEqual(execCommandCalled, true);
      assert.strictEqual(fakeElements[0].value, 'Fallback string');
    } finally {
      if (originalClipboard) {
        Object.defineProperty(globalThis.navigator, 'clipboard', {
          value: originalClipboard,
          configurable: true,
        });
      }
      (globalThis as any).document = originalDocument;
    }
  });
});
