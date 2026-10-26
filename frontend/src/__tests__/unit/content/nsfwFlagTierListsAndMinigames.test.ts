// frontend/src/__tests__/unit/content/nsfwFlagTierListsAndMinigames.test.ts
//
// Tier lists and minigames carry the same NSFW flag smash or pass rosters have. The flag is part of
// the content itself: it survives export, share links and storage, it is hashed with the rest (so
// stripping it from an exported file breaks the author's account mark), and a viewer confirms once
// before a flagged item opens. The gate, the badges and the exported file are rendered / captured in
// nsfwGate.test.tsx.
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { signingPayload } from '@/utils/contentPayload';
import { minigameSigningPayload } from '@/utils/contentSigning';
import { buildCustomTierListDoc } from '@/utils/tierLists/customDoc';
import { migrateTierListState } from '@/utils/tierLists/storage';
import {
  decodeSharePayload,
  encodeSharePayload,
  parseTierListJson,
  serializeTierListDocument,
  validateTierListDocument,
} from '@/utils/tierLists/codec';
import { DEFAULT_TIERS } from '@/utils/tierLists/constants';
import { importChallengeFromJson } from '@/utils/minigames/jsonExportImport';
import { decodeChallengeShare, encodeChallengeShare } from '@/utils/minigames/shareLink';
import { saveCustomChallenge, getCustomChallenges } from '@/utils/minigames/storage';
import { acknowledgeNsfwContent, hasAcknowledgedNsfwContent } from '@/utils/nsfwAck';
import type { ChallengeDefinition } from '@/types/minigame';

function createMockLocalStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  };
}

const baseList = {
  format: 'lemondbd-tier-list',
  version: 1,
  title: 'Spicy picks',
  template: null,
  tiers: DEFAULT_TIERS,
  items: [{ id: 'a', name: 'A' }],
  placements: { s: ['a'] },
};

describe('tier list NSFW flag', () => {
  it('keeps a true flag through validation and drops anything else', () => {
    const flagged = validateTierListDocument({ ...baseList, is_nsfw: true });
    assert.ok(flagged.ok && flagged.doc.is_nsfw === true);

    for (const value of [false, 'true', 1, null, undefined]) {
      const result = validateTierListDocument({ ...baseList, is_nsfw: value });
      assert.ok(result.ok);
      assert.equal('is_nsfw' in result.doc, false, `value ${String(value)} must not set the flag`);
    }
  });

  it('only a self-contained custom list can be flagged, not a ranking of an official list', () => {
    const result = validateTierListDocument({ ...baseList, template: 'survivors', items: undefined, is_nsfw: true });
    assert.ok(result.ok);
    assert.equal('is_nsfw' in result.doc, false);
  });

  it('survives export, parse, share link and storage', async () => {
    const stored = migrateTierListState({
      version: 1,
      rankings: {},
      custom: { a: { id: 'a', title: 'Spicy picks', tiers: DEFAULT_TIERS, items: baseList.items, placements: {}, is_nsfw: true } },
    }).custom.a;
    assert.equal(stored.is_nsfw, true);

    const doc = buildCustomTierListDoc(stored, stored.tiers, { s: ['a'] });
    assert.equal(doc.is_nsfw, true);

    const parsed = parseTierListJson(serializeTierListDocument(doc));
    assert.ok(parsed.ok && parsed.doc.is_nsfw === true);

    const shared = await decodeSharePayload(await encodeSharePayload(doc));
    assert.ok(shared.ok && shared.doc.is_nsfw === true);
  });

  it('an unflagged list never gains the key anywhere', () => {
    const stored = migrateTierListState({
      version: 1,
      rankings: {},
      custom: { a: { id: 'a', title: 'T', tiers: DEFAULT_TIERS, items: baseList.items, placements: {}, is_nsfw: 'yes' } },
    }).custom.a;
    assert.equal('is_nsfw' in stored, false);
    assert.equal('is_nsfw' in buildCustomTierListDoc(stored, stored.tiers, {}), false);
  });

  it('is hashed: removing the flag from a signed export changes the signed payload', () => {
    const withFlag = signingPayload('tier_list', { ...baseList, is_nsfw: true });
    const without = signingPayload('tier_list', baseList);
    assert.equal(withFlag.is_nsfw, true);
    assert.equal('is_nsfw' in without, false);
    assert.notDeepEqual(withFlag, without);
  });
});

describe('minigame NSFW flag', () => {
  const trial: ChallengeDefinition = {
    title: 'Spicy trial',
    description: '',
    game_mode: 'custom',
    rounds: [{ round_number: 1, mode: 'classic_character', target_id: 3, target_type: 'killer', max_attempts: 6 }],
  };

  it('is only in the signed payload when set, so trials signed before the flag hash the same', () => {
    const plain = minigameSigningPayload(trial);
    assert.equal('is_nsfw' in plain, false);
    assert.equal('is_nsfw' in minigameSigningPayload({ ...trial, is_nsfw: false }), false);
    assert.equal('is_nsfw' in minigameSigningPayload({ ...trial, is_nsfw: 'true' as unknown as boolean }), false);
    assert.equal(minigameSigningPayload({ ...trial, is_nsfw: true }).is_nsfw, true);
    assert.equal(signingPayload('minigame', { ...trial, is_nsfw: true }).is_nsfw, true);
  });

  it('survives the JSON export file, the import and a share link', async () => {
    const fileText = JSON.stringify({
      lemondbd_version: '1.0',
      type: 'minigame_challenge',
      challenge: { ...trial, is_nsfw: true },
    });
    const imported = importChallengeFromJson(fileText);
    assert.equal(imported.is_nsfw, true);

    const sharedBack = await decodeChallengeShare(await encodeChallengeShare(imported));
    assert.equal(sharedBack.is_nsfw, true);

    const plain = importChallengeFromJson(JSON.stringify({ challenge: trial }));
    assert.equal('is_nsfw' in plain, false);
    const plainShared = await decodeChallengeShare(await encodeChallengeShare(plain));
    assert.equal('is_nsfw' in plainShared, false);
  });

  it('is kept when the trial is saved to this browser and read back', () => {
    (globalThis as unknown as { localStorage: unknown }).localStorage = createMockLocalStorage();
    const saved = saveCustomChallenge({ ...trial, is_nsfw: true });
    assert.equal(saved.is_nsfw, true);
    assert.equal(getCustomChallenges()[0].is_nsfw, true);
  });
});

describe('NSFW confirmation for tier lists and minigames', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: unknown }).localStorage = createMockLocalStorage();
  });

  it('starts unconfirmed, then remembers the confirmation per kind and id', () => {
    assert.equal(hasAcknowledgedNsfwContent('tier_list', 'abc'), false);
    acknowledgeNsfwContent('tier_list', 'abc');
    assert.equal(hasAcknowledgedNsfwContent('tier_list', 'abc'), true);
    assert.equal(hasAcknowledgedNsfwContent('tier_list', 'other'), false);
    assert.equal(hasAcknowledgedNsfwContent('minigame', 'abc'), false, 'a tier list id must not unlock a minigame');
  });

  it('does not collide with the per-roster confirmation key', () => {
    acknowledgeNsfwContent('tier_list', 'legendary_characters');
    const keys = Array.from({ length: (globalThis.localStorage as Storage).length }, (_, i) => (globalThis.localStorage as Storage).key(i));
    assert.ok(keys.every((k) => k && !k.startsWith('dbd_smash_nsfw_ack_')));
  });

  it('a storage failure means the viewer is asked again, never an exception', () => {
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };
    assert.doesNotThrow(() => acknowledgeNsfwContent('minigame', 'x'));
    assert.equal(hasAcknowledgedNsfwContent('minigame', 'x'), false);
  });
});
