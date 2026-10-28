// frontend/src/__tests__/unit/smash/personaOnFeed.test.ts
//
// The romance persona computed from feed entities as the API returns them (recorded in
// fixtures/smashFeed.json by backend/scripts/record_frontend_fixtures.py), and the share link built
// from it. The persona rules are unit-tested on hand-made entities in smashPersona.test.ts; this
// checks the API's role and gender values are the ones the persona understands.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildArchetypeShareUrl, calculateRomancePersona, decodeArchetypeShare, type VoteRecord } from '@/utils/smashPersona';
import type { EntityItem } from '@/types/smashOrPass';
import recorded from '../../fixtures/smashFeed.json';

const entities = recorded.entities as unknown as EntityItem[];
const votes = (pattern: Array<VoteRecord['vote']>): VoteRecord[] =>
  entities.map((character, i) => ({ character, vote: pattern[i % pattern.length], timestamp: i }));

describe('smash-or-pass persona on recorded feed entities', () => {
  it('the feed page is all survivors, so smashing all of it is full survivor affinity', () => {
    assert.ok(entities.every((e) => e.role === 'Survivor'));
    const persona = calculateRomancePersona(votes(['smash']), {});
    assert.equal(persona.totalVotes, entities.length);
    assert.equal(persona.smashRate, 100);
    assert.equal(persona.survivorAffinity, 100);
    assert.equal(persona.killerAffinity, 0);
    assert.equal(persona.favoriteChar?.name, entities[0].name);
  });

  it('half smashed, half passed is a 50% smash rate', () => {
    assert.equal(calculateRomancePersona(votes(['smash', 'pass']), {}).smashRate, 50);
  });

  it('the share link carries the persona to the recipient unchanged', () => {
    const persona = calculateRomancePersona(votes(['smash', 'super_smash', 'pass']), {});
    const payload = {
      k: persona.archKey,
      r: persona.smashRate,
      s: persona.survivorAffinity,
      ka: persona.killerAffinity,
      v: persona.totalVotes,
      fn: persona.favoriteChar?.name,
      fs: persona.favoriteChar?.slug,
      fr: persona.favoriteChar?.role,
    };
    const param = new URL(buildArchetypeShareUrl('https://lemondbd.example/en/smash-or-pass', payload)).searchParams.get('shared_archetype');
    assert.ok(param);
    assert.deepEqual(decodeArchetypeShare(param), { ...payload, fm: undefined }); // fm: the favourite's media, not shared here
  });
});
