// frontend/src/__tests__/unit/content/contentRoundTrip.test.ts
//
// The server only accepts a report whose document hashes to the value the author's export was
// signed with. These tests walk each kind of content through the real author -> export -> import ->
// storage -> report path and require the SAME hash at both ends. They would have failed for
// minigames before `signingPayload` existed (the report carried `id`, timestamps and default
// round fields the signed copy lacked).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { signingPayload } from '@/utils/contentPayload';
import { type ContentManifest } from '@/utils/contentSigning';
import { buildCustomTierListDoc } from '@/utils/tierLists/customDoc';
import { migrateTierListState } from '@/utils/tierLists/storage';
import { decodeSharePayload, encodeSharePayload, parseTierListJson, serializeTierListDocument } from '@/utils/tierLists/codec';
import { DEFAULT_TIERS } from '@/utils/tierLists/constants';
import { smashRosterExportDoc } from '@/utils/smashOrPass/exportDoc';
import { migrateSmashRosterState } from '@/utils/smashOrPass/storage';
import { parseSmashRosterJson, serializeSmashRosterDocument, encodeSharePayload as encodeRosterShare, decodeSharePayload as decodeRosterShare } from '@/utils/smashOrPass/codec';
import { SMASH_ROSTER_FORMAT, SMASH_ROSTER_FORMAT_VERSION } from '@/types/smashOrPass';
import { importChallengeFromJson } from '@/utils/minigames/jsonExportImport';
import { decodeChallengeShare, encodeChallengeShare } from '@/utils/minigames/shareLink';
import { saveCustomChallenge } from '@/utils/minigames/storage';
import type { ChallengeDefinition } from '@/types/minigame';

/** Mirrors backend `canonicalize_payload`: sorted keys, compact separators, UTF-8 kept as is. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
const sha256 = (value: unknown) => createHash('sha256').update(canonical(value), 'utf8').digest('hex');

const stamp = (type: string, hash: string): ContentManifest => ({
  content_type: type,
  content_hash: hash,
  author_id: 7,
  author_login: 'the_author',
  signature: 'f'.repeat(64),
  created_at: '2026-10-15T08:00:00Z',
});

describe('tier list: author export hash equals recipient report hash', () => {
  const tierIds = DEFAULT_TIERS.map((t) => t.id);
  const authorStore = migrateTierListState({
    version: 1,
    rankings: {},
    custom: {
      a: {
        id: 'a',
        title: 'Mój ranking 🍋 "cytryn"',
        description: '',
        tiers: DEFAULT_TIERS,
        items: [
          { id: 'i1', name: 'Claudette', image: 'https://cdn.example.com/c.png' },
          { id: 'i2', name: 'Dwight' },
          { id: 'i3', name: 'Meg', image: '/static/icons/meg.webp' },
        ],
        placements: { [tierIds[0]]: ['i1'], [tierIds[2]]: ['i3', 'i2'] },
        createdAt: 1,
        updatedAt: 2,
      },
    },
  });
  const author = authorStore.custom.a;
  const docA = buildCustomTierListDoc(author, author.tiers, author.placements);
  const hashA = sha256(signingPayload('tier_list', docA));
  const signed = { ...docA, _manifest: stamp('tier_list', hashA) };

  function recipientHash(doc: ReturnType<typeof buildCustomTierListDoc>): string {
    const store = migrateTierListState({
      version: 1,
      rankings: {},
      custom: {
        b: {
          id: 'b',
          title: doc.title,
          description: doc.description ?? '',
          tiers: doc.tiers,
          items: doc.items ?? [],
          placements: doc.placements,
          createdAt: Date.now(),
          ...(doc.backgroundImage ? { backgroundImage: doc.backgroundImage } : {}),
          ...(doc._manifest ? { _manifest: doc._manifest } : {}),
        },
      },
    });
    const b = store.custom.b;
    return sha256(signingPayload('tier_list', buildCustomTierListDoc(b, b.tiers, b.placements)));
  }

  it('survives a JSON file import', () => {
    const parsed = parseTierListJson(serializeTierListDocument(signed));
    assert.ok(parsed.ok);
    assert.equal(recipientHash(parsed.doc as never), hashA);
  });

  it('survives a share link', async () => {
    const decoded = await decodeSharePayload(await encodeSharePayload(signed));
    assert.ok(decoded.ok);
    assert.equal(recipientHash(decoded.doc as never), hashA);
  });

  it('is unaffected by the author stamp itself', () => {
    assert.equal(sha256(signingPayload('tier_list', signed)), hashA);
  });

  it('changes when the content changes', () => {
    const edited = { ...docA, title: `${docA.title}!` };
    assert.notEqual(sha256(signingPayload('tier_list', edited)), hashA);
  });
});

describe('smash roster: author export hash equals recipient report hash', () => {
  const authorStore = migrateSmashRosterState({
    version: 1,
    custom: {
      r1: {
        id: 'r1',
        format: SMASH_ROSTER_FORMAT,
        version: SMASH_ROSTER_FORMAT_VERSION,
        name: 'Moja ekipa',
        description: '',
        roster_mode: 'full',
        custom_roles: [],
        custom_genders: [],
        entities: [
          { id: 'alpha', name: 'Alpha', role: 'Survivor', gender: 'Female', media_url: 'https://cdn.example.com/a.png' },
          { id: 'beta', name: 'Beta', role: 'Killer', gender: 'Male', bio: 'Zażółć gęślą jaźń', red_flags: ['loud'] },
        ],
        createdAt: 1,
        updatedAt: 2,
      },
    },
  });
  const author = authorStore.custom.r1;
  const docA = smashRosterExportDoc(author);
  const hashA = sha256(signingPayload('smash_roster', docA));
  const signed = { ...docA, _manifest: stamp('smash_roster', hashA) };

  function recipientHash(doc: Record<string, unknown>): string {
    const store = migrateSmashRosterState({
      version: 1,
      custom: { r2: { id: 'r2', ...doc, createdAt: Date.now(), updatedAt: Date.now() } },
    });
    return sha256(signingPayload('smash_roster', smashRosterExportDoc(store.custom.r2)));
  }

  it('survives a JSON file import', () => {
    const parsed = parseSmashRosterJson(serializeSmashRosterDocument(signed as never));
    assert.ok(parsed.ok);
    assert.equal(recipientHash(parsed.doc as never), hashA);
  });

  it('survives a share link', async () => {
    const decoded = await decodeRosterShare(await encodeRosterShare(signed as never));
    assert.ok(decoded.ok);
    assert.equal(recipientHash(decoded.doc as never), hashA);
  });

  it('changes when an entity changes', () => {
    const edited = { ...docA, entities: docA.entities.map((e, i) => (i === 0 ? { ...e, name: 'Alpha!' } : e)) };
    assert.notEqual(sha256(signingPayload('smash_roster', edited)), hashA);
  });
});

describe('minigame: author export hash equals recipient report hash', () => {
  const created: ChallengeDefinition = {
    title: '  My Fog Trial ',
    description: '',
    game_mode: 'custom',
    rounds: [
      { round_number: 1, mode: 'classic_character', target_id: 5, target_type: 'survivor', max_attempts: 6 },
      { round_number: 2, mode: 'quote_lore', custom_data: { quote: 'Run.', speaker: 'Nea' }, max_attempts: 3 },
    ],
  };
  const hashA = sha256(signingPayload('minigame', created));
  const signed = { ...created, _manifest: stamp('minigame', hashA) };

  it('survives a JSON file import and saving to My Trials (id + timestamps added)', () => {
    const imported = importChallengeFromJson(JSON.stringify(signed));
    const saved = saveCustomChallenge(imported);
    assert.ok(saved.id && saved.created_at, 'storage adds id and timestamps');
    assert.equal(sha256(signingPayload('minigame', saved)), hashA);
  });

  it('survives a share link (decoder adds an id)', async () => {
    const decoded = await decodeChallengeShare(await encodeChallengeShare(signed));
    assert.ok(decoded.id);
    assert.equal(sha256(signingPayload('minigame', decoded)), hashA);
  });

  it('the author’s own saved copy hashes the same as what they signed', () => {
    assert.equal(sha256(signingPayload('minigame', saveCustomChallenge(created))), hashA);
  });

  it('hashing the raw stored object (the old behaviour) did NOT match', () => {
    const saved = saveCustomChallenge(importChallengeFromJson(JSON.stringify(signed)));
    const { _manifest: _m, ...rawStored } = saved;
    assert.notEqual(sha256(rawStored), hashA);
  });

  it('changes when a round changes', () => {
    const edited = { ...created, rounds: [{ ...created.rounds[0], target_id: 6 }, created.rounds[1]] };
    assert.notEqual(sha256(signingPayload('minigame', edited)), hashA);
  });
});

describe('signingPayload', () => {
  it('ignores a stale author stamp and passes unknown content types through', () => {
    assert.deepEqual(signingPayload('other', { a: 1, _manifest: { x: 1 } }), { a: 1 });
    assert.deepEqual(signingPayload('tier_list', 'nope'), {});
  });

  it('falls back to the raw document when the sanitiser refuses it', () => {
    const refused = { title: 'No items', items: [], placements: {}, _manifest: { x: 1 } };
    assert.deepEqual(signingPayload('tier_list', refused), { title: 'No items', items: [], placements: {} });
  });
});
