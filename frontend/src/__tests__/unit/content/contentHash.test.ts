// frontend/src/__tests__/unit/content/contentHash.test.ts
// The browser must hash saved content exactly like the server (backend/app/services/content_crypto.py),
// or a moderation ban never matches the copies people already have. The expected hashes below were
// produced by the Python side: json.dumps(payload, sort_keys=True, separators=(",", ":"),
// ensure_ascii=False) of the payload as sent over the wire, then SHA-256.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson, contentHash, contentIdentity, storedContentHashes } from '@/utils/contentHash';
import { signingPayload } from '@/utils/contentPayload';
import { smashRosterExportDoc } from '@/utils/smashOrPass/exportDoc';
import { DEFAULT_TIERS } from '@/utils/tierLists/constants';
import type { StoredCustomRoster } from '@/types/smashOrPass';

const control = String.fromCharCode(1) + String.fromCharCode(31) + '\t\n"\\';

const tricky = {
  zeta: 1,
  alpha: [0.5, 0.0001, 0.00001, 1.5e-7, 123.456, 1e16, 1.5e16, 1e21, 12345678901234567000, -0.25, -3e-9, 2],
  'Ünïcode ключ': 'Łódź — ✓ 鬼 🎃',
  emojiKey: { '🎃': 1, z: 2, '': 3, 'ﬀ': 4 },
  nested: { b: null, a: true, c: false, list: [{ y: 1, x: 2 }] },
  control,
  dropped: undefined,
};

const storedTierList = {
  id: 'list-1',
  title: 'Chase partners',
  description: 'Who I want in a chase',
  tiers: DEFAULT_TIERS,
  items: [{ id: 'a', name: 'Dwight' }, { id: 'b', name: 'Meg' }],
  placements: { s: ['a'], a: ['b'] },
  createdAt: 1000,
  updatedAt: 2000,
  ownerId: 7,
};

const storedMinigame = {
  id: 'custom_1',
  title: '  Guess the killer  ',
  description: 'Three rounds',
  game_mode: 'custom',
  rounds: [{ round_number: 4, mode: 'emoji', target_id: 3, target_type: 'killer', max_attempts: 3 }],
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-02T00:00:00Z',
};

describe('contentHash parity with the server', () => {
  it('prints numbers the way Python prints the int or float it parsed', () => {
    const json = canonicalJson(tricky);
    assert.ok(
      json.startsWith(
        '{"alpha":[0.5,0.0001,1e-05,1.5e-07,123.456,10000000000000000,15000000000000000,1e+21,12345678901234567000,-0.25,-3e-09,2]'
      ),
      json
    );
  });

  it('sorts keys by code point, not by UTF-16 unit, and drops undefined like the wire does', () => {
    const json = canonicalJson(tricky);
    assert.ok(json.includes('"emojiKey":{"":3,"z":2,"ﬀ":4,"🎃":1}'), json);
    assert.ok(json.includes('"nested":{"a":true,"b":null,"c":false,"list":[{"x":2,"y":1}]}'), json);
    assert.ok(!json.includes('dropped'));
    assert.ok(json.endsWith('"zeta":1,"Ünïcode ключ":"Łódź — ✓ 鬼 🎃"}'), json);
  });

  it('matches the hash Python computes for the same payload', async () => {
    assert.equal(await contentHash(tricky), 'de3eb5e07f369ef1af2a97923761acdf1bf8ff728068aef98abf19dfb7d49017');
  });

  it('hashes a saved tier list without its ranking, plus the whole document for older bans', async () => {
    const identity = '7ef9b85b56837977af9a2db04645ffc64d67ad6e5a0a31d75949cd7ea07b281f';
    const whole = 'c74f39853cd3d331a654f503f292d6ca414262daceb8973b51ab03d66c2d2203';
    assert.deepEqual(await storedContentHashes('tier_list', storedTierList), [identity, whole]);
    // The author stamp and storage-only fields do not change the hashes.
    const restamped = { ...storedTierList, id: 'other', updatedAt: 9, _manifest: { content_hash: 'x' } };
    assert.deepEqual(await storedContentHashes('tier_list', restamped), [identity, whole]);
  });

  it('a re-ranked list is the same list; an edited one is new content', async () => {
    const [identity] = await storedContentHashes('tier_list', storedTierList);
    const reranked = await storedContentHashes('tier_list', { ...storedTierList, placements: { s: ['b', 'a'] } });
    assert.equal(reranked[0], identity);
    const edited = await storedContentHashes('tier_list', { ...storedTierList, title: 'Chase partners, reworked' });
    assert.notEqual(edited[0], identity);
  });

  it('leaves out usage fields of tier lists only, like the server', () => {
    assert.equal('placements' in contentIdentity({ format: 'lemondbd-tier-list', placements: {} }), false);
    const trial = { title: 'Trial', placements: {} };
    assert.equal(contentIdentity(trial), trial);
  });

  it('hashes a saved minigame as the document a report of it would send', async () => {
    assert.deepEqual(await storedContentHashes('minigame', storedMinigame), [
      'a900688dcb146a632e0b7ed296ba679744fc09f8d10fdc07833f1ed1afb31b8b',
    ]);
  });

  it('hashes a saved roster as its exported document', async () => {
    const roster = {
      id: 'r1',
      createdAt: 1,
      updatedAt: 2,
      format: 'lemondbd-smash-roster',
      version: 1,
      name: 'Roster',
      entities: [],
    } as unknown as StoredCustomRoster;
    assert.deepEqual(await storedContentHashes('smash_roster', roster), [
      await contentHash(signingPayload('smash_roster', smashRosterExportDoc(roster))),
    ]);
  });

  it('gives no hash for something that is not a document', async () => {
    assert.deepEqual(await storedContentHashes('tier_list', null), []);
    assert.deepEqual(await storedContentHashes('minigame', 'text'), []);
  });
});
