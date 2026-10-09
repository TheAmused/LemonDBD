// frontend/src/__tests__/unit/smashTurnOnDealbreaker.test.ts

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateSmashRosterDocument } from '../../utils/smashOrPass/codec';
import { migrateSmashRosterState } from '../../utils/smashOrPass/storage';
import { customRosterToRosterItem } from '../../utils/smashOrPass/localRoster';
import { SMASH_ROSTER_FORMAT } from '../../types/smashOrPass';

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

  await t.test('FloatingLoreScattered source contains Turn On and Dealbreaker wing slots', () => {
    const filePath = path.resolve(__dirname, '../../components/smash-or-pass/FloatingLoreScattered.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');

    assert.ok(source.includes('customLabels'), 'FloatingLoreScattered must accept customLabels prop');
    assert.ok(source.includes('profile.turn_on'), 'FloatingLoreScattered must check profile.turn_on');
    assert.ok(source.includes('profile.dealbreaker'), 'FloatingLoreScattered must check profile.dealbreaker');
    assert.ok(source.includes('customLabels?.turn_on'), 'FloatingLoreScattered must use customLabels.turn_on');
    assert.ok(source.includes('customLabels?.dealbreaker'), 'FloatingLoreScattered must use customLabels.dealbreaker');
  });

  await t.test('CharacterCard source renders Turn On and Dealbreaker on back-face with custom labels', () => {
    // The card is split into parts under card/; the back face lives there.
    const smashDir = path.resolve(__dirname, '../../components/smash-or-pass');
    const partsDir = path.join(smashDir, 'card');
    const source = [
      fs.readFileSync(path.join(smashDir, 'CharacterCard.tsx'), 'utf-8'),
      ...fs.readdirSync(partsDir).map((name) => fs.readFileSync(path.join(partsDir, name), 'utf-8')),
    ].join('\n');

    assert.ok(source.includes('customLabels?: RosterCustomLabels'), 'CharacterCard must accept customLabels');
    assert.ok(source.includes("rosterMode?: 'simple' | 'full'"), 'CharacterCard must accept rosterMode');
    assert.ok(source.includes('profile.turn_on'), 'CharacterCard must display profile.turn_on');
    assert.ok(source.includes('profile.dealbreaker'), 'CharacterCard must display profile.dealbreaker');
    assert.ok(source.includes('customLabels?.turn_on'), 'CharacterCard must support custom turn_on label');
    assert.ok(source.includes('customLabels?.dealbreaker'), 'CharacterCard must support custom dealbreaker label');
  });

  await t.test('SmashOrPassHub wires customLabels, rosterMode, and dynamic taxonomies', () => {
    // The Hub is split into hooks and parts under hub/; the wiring lives across them.
    const smashDir = path.resolve(__dirname, '../../components/smash-or-pass');
    const partsDir = path.join(smashDir, 'hub');
    const source = [
      fs.readFileSync(path.join(smashDir, 'SmashOrPassHub.tsx'), 'utf-8'),
      ...fs.readdirSync(partsDir).map((name) => fs.readFileSync(path.join(partsDir, name), 'utf-8')),
    ].join('\n');

    assert.ok(source.includes('customLabels={activeRoster?.custom_labels}'), 'Hub must pass customLabels to components');
    assert.ok(source.includes('rosterMode={activeRoster?.roster_mode}'), 'Hub must pass rosterMode to CharacterCard');
    assert.ok(source.includes('availableRoles'), 'Hub must calculate availableRoles dynamically');
    assert.ok(source.includes('availableGenders'), 'Hub must calculate availableGenders dynamically');
    assert.ok(source.includes('customArchetypes={activeRoster?.romance_archetypes}'), 'Hub must pass customArchetypes to RomancePersonaModal');
  });
});
