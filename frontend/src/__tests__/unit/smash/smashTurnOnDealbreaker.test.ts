// frontend/src/__tests__/unit/smash/smashTurnOnDealbreaker.test.ts

import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSmashRosterDocument } from '../../../utils/smashOrPass/codec';
import { migrateSmashRosterState } from '../../../utils/smashOrPass/storage';
import { customRosterToRosterItem } from '../../../utils/smashOrPass/localRoster';
import { SMASH_ROSTER_FORMAT } from '../../../types/smashOrPass';

test('SmashOrPass: Simple Mode, Custom Labels, and Turn On / Dealbreaker Integration', async (t) => {
  await t.test('SmashRosterDocument preserves turn_on, dealbreaker, roster_mode, and custom_labels', () => {
    const rawDoc = {
      format: SMASH_ROSTER_FORMAT,
      version: 1,
      name: 'Anime Heroes Roster',
      roster_mode: 'simple',
      custom_labels: {
        turn_on: 'What Sparks Joy',
        dealbreaker: 'Instant Nope',
        dating_vibe: 'Vibe Check',
      },
      romance_archetypes: [
        {
          id: 'chosen_one',
          title: 'The Chosen One',
          subtitle: 'Heroic destiny',
          description: 'Destined for greatness.',
          badge_color: 'from-amber-500 to-yellow-900',
          icon_url: 'https://example.com/icon.png',
          is_fallback: true,
          rules: [],
        },
      ],
      entities: [
        {
          name: 'Hero Protagonist',
          role: 'Hero',
          gender: 'ABC',
          watermark_left: 'HERO',
          watermark_right: 'LEGEND',
          archetype: 'Shonen Protagonist',
          quote: 'Never give up!',
          turn_on: 'Chili dogs and optimism',
          dealbreaker: 'Betrayal of friends',
        },
      ],
    };

    const result = validateSmashRosterDocument(rawDoc);
    assert.strictEqual(result.ok, true);
    if (!result.ok) return;
    const validated = result.doc;
    assert.strictEqual(validated.roster_mode, 'simple');
    assert.strictEqual(validated.custom_labels?.turn_on, 'What Sparks Joy');
    assert.strictEqual(validated.custom_labels?.dealbreaker, 'Instant Nope');
    assert.strictEqual(validated.entities[0].turn_on, 'Chili dogs and optimism');
    assert.strictEqual(validated.entities[0].dealbreaker, 'Betrayal of friends');
    assert.strictEqual(validated.entities[0].role, 'Hero');
    assert.strictEqual(validated.entities[0].gender, 'ABC');

    // Storage migration round-trip
    const state = migrateSmashRosterState({
      version: 1,
      custom: {
        'test-id': {
          ...validated,
          id: 'test-id',
          createdAt: 1000,
          updatedAt: 2000,
        },
      },
    });

    assert.strictEqual(state.custom['test-id'].roster_mode, 'simple');
    assert.strictEqual(state.custom['test-id'].custom_labels?.turn_on, 'What Sparks Joy');

    // localRosterToRosterItem propagation
    const rosterItem = customRosterToRosterItem(state.custom['test-id']);
    assert.strictEqual(rosterItem.roster_mode, 'simple');
    assert.strictEqual(rosterItem.custom_labels?.turn_on, 'What Sparks Joy');
    assert.strictEqual(rosterItem.romance_archetypes?.[0].title, 'The Chosen One');
  });

  await t.test('SmashRosterDocument and migrateSmashRosterState preserve valid _manifest', () => {
    const mockManifest = {
      content_type: 'smash_roster',
      content_hash: 'a'.repeat(64),
      author_id: 42,
      author_login: 'dwight',
      signature: 'b'.repeat(64),
      created_at: '2026-10-14T12:00:00Z',
    };

    const rawDoc = {
      format: SMASH_ROSTER_FORMAT,
      version: 1,
      name: 'Manifest Roster',
      entities: [
        { name: 'Entity A', role: 'Survivor', gender: 'female' },
      ],
      _manifest: mockManifest,
    };

    const result = validateSmashRosterDocument(rawDoc);
    assert.strictEqual(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.doc._manifest, mockManifest);

    const state = migrateSmashRosterState({
      version: 1,
      custom: {
        'manifest-roster-1': {
          ...result.doc,
          id: 'manifest-roster-1',
          createdAt: 1000,
          updatedAt: 2000,
        },
      },
    });

    assert.deepEqual(state.custom['manifest-roster-1']._manifest, mockManifest);
  });
});
