// frontend/src/__tests__/unit/smash/smashCustomRosterDisplay.test.ts
//
// How a custom roster is shown when its author left things out or typed their own words: stand-in
// pictures instead of a borrowed character picture, role badges that never call an unknown role a
// killer, genders kept the way the official rosters keep them, and badge gradients that are either a
// preset or two colours.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { candidatePlaceholderPath, coverPlaceholderPath } from '@/utils/smashOrPass/placeholderArt';
import { canonicalGender, genderLabel, roleBadge, termLabel } from '@/utils/smashOrPass/terms';
import {
  badgeGradientProps,
  encodeCustomGradient,
  isValidBadgeColor,
  parseCustomGradient,
} from '@/utils/smashOrPass/badgeGradient';
import { validateSmashRosterDocument } from '@/utils/smashOrPass/codec';
import { rosterCoverUrl } from '@/components/smash-or-pass/roster-select/rosterDisplay';
import type { RosterItem } from '@/types/smashOrPass';

const LABELS = { survivors: 'Survivors', killers: 'Killers' };
const GENDER_LABELS = { femaleOnly: 'Kobiety', maleOnly: 'Mężczyźni', monsters: 'Potwory' };

describe('stand-in pictures', () => {
  it('picks one of three candidate pictures and keeps it for the same candidate', () => {
    const paths = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'leon', 'ada-wong'].map(candidatePlaceholderPath));
    assert.deepEqual(
      [...paths].sort(),
      [1, 2, 3].map((n) => `/static/smash-or-pass/candidate_placeholder_${n}.webp`)
    );
    assert.equal(candidatePlaceholderPath('leon'), candidatePlaceholderPath('leon'));
  });

  it('picks one of three covers and keeps it for the same roster', () => {
    const paths = new Set(['local:a', 'local:b', 'local:c', 'local:d', 'local:e', 'local:f'].map(coverPlaceholderPath));
    assert.deepEqual(
      [...paths].sort(),
      [1, 2, 3].map((n) => `/static/smash-or-pass/cover_placeholder_${n}.webp`)
    );
    assert.equal(coverPlaceholderPath('local:abc'), coverPlaceholderPath('local:abc'));
  });

  it('a custom roster without a cover gets a stand-in cover, not a Dead by Daylight character', () => {
    const base = { slug: 'local:abc', name: 'Mine', theme_color: '#112233', is_local: true } as RosterItem;
    const url = rosterCoverUrl({ ...base, cover_image_url: null });
    assert.ok(url.endsWith(coverPlaceholderPath('local:abc')));
    assert.ok(!url.includes('sable_ward'));
    assert.equal(rosterCoverUrl({ ...base, cover_image_url: 'https://example.com/a.webp' }), 'https://example.com/a.webp');
  });
});

describe('role and gender wording', () => {
  it('capitalises words and spells out keys', () => {
    assert.equal(termLabel('female'), 'Female');
    assert.equal(termLabel('monster_other'), 'Monster Other');
    assert.equal(termLabel('Survivor'), 'Survivor');
    assert.equal(termLabel('mad scientist'), 'Mad Scientist');
  });

  it('keeps Survivor and Killer coloured and shows any other role as written, neutral', () => {
    assert.deepEqual(roleBadge('Survivor', LABELS), { tone: 'green', label: 'Survivors' });
    assert.deepEqual(roleBadge('killer', LABELS), { tone: 'red', label: 'Killers' });
    assert.deepEqual(roleBadge('Hero', LABELS), { tone: 'neutral', label: 'Hero' });
    assert.deepEqual(roleBadge('', LABELS), { tone: 'neutral', label: '' });
  });

  it('stores genders as the official rosters do: typed words that name one become its key', () => {
    assert.equal(canonicalGender('Female'), 'female');
    assert.equal(canonicalGender(' MALE '), 'male');
    assert.equal(canonicalGender('Monster'), 'monster_other');
    assert.equal(canonicalGender('Monster / Other'), 'monster_other');
    assert.equal(canonicalGender('monster_other'), 'monster_other');
    assert.equal(canonicalGender('Android'), 'Android');
    assert.equal(canonicalGender(''), '');
  });

  it('shows an official gender with its translated label and any other word capitalised', () => {
    assert.equal(genderLabel('female', GENDER_LABELS), 'Kobiety');
    assert.equal(genderLabel('Male', GENDER_LABELS), 'Mężczyźni');
    assert.equal(genderLabel('monster', GENDER_LABELS), 'Potwory');
    assert.equal(genderLabel('android', GENDER_LABELS), 'Android');
  });

  it('an imported roster keeps official gender keys, its own words as written', () => {
    const res = validateSmashRosterDocument({
      name: 'R',
      custom_genders: ['Female', 'Monster', 'Android'],
      entities: [
        { name: 'A', gender: 'Female' },
        { name: 'B', gender: 'Monster' },
        { name: 'C', gender: 'Android' },
      ],
    });
    assert.ok(res.ok, 'document accepted');
    if (!res.ok) return;
    assert.deepEqual(res.doc.entities.map((e) => e.gender), ['female', 'monster_other', 'Android']);
    assert.deepEqual(res.doc.custom_genders, ['female', 'monster_other', 'Android']);
  });
});

describe('badge gradients', () => {
  it('round-trips a custom pair of colours', () => {
    const value = encodeCustomGradient({ from: '#FF0044', to: '#112233' });
    assert.equal(value, 'custom:#ff0044,#112233');
    assert.deepEqual(parseCustomGradient(value), { from: '#ff0044', to: '#112233' });
    assert.ok(isValidBadgeColor(value));
  });

  it('paints a custom pair with an inline gradient and a preset with classes', () => {
    const custom = badgeGradientProps('custom:#ff0044,#112233');
    assert.equal(custom.className, '');
    assert.equal(custom.style?.backgroundImage, 'linear-gradient(135deg, #ff0044, #112233)');
    const preset = badgeGradientProps('from-accent-red to-bg-primary');
    assert.equal(preset.className, 'bg-gradient-to-br from-accent-red to-bg-primary');
    assert.equal(preset.style, undefined);
  });

  it('rejects colours that are neither a preset nor two hex values', () => {
    assert.equal(parseCustomGradient('custom:red,blue'), null);
    assert.equal(parseCustomGradient('from-accent-red'), null);
    assert.equal(isValidBadgeColor('url(javascript:alert(1))'), false);
    assert.equal(isValidBadgeColor('custom:#12345,#112233'), false);
  });

  it('survives the roster import sanitizer', () => {
    const res = validateSmashRosterDocument({
      name: 'R',
      entities: [{ name: 'A', role: 'Hero', gender: 'Female' }],
      romance_archetypes: [
        { id: 'a', title: 'A', rules: [], badge_color: 'custom:#ff0044,#112233' },
        { id: 'b', title: 'B', rules: [], badge_color: 'expression(alert(1))' },
      ],
    });
    assert.ok(res.ok, 'document accepted');
    if (!res.ok) return;
    const [a, b] = res.doc.romance_archetypes ?? [];
    assert.equal(a.badge_color, 'custom:#ff0044,#112233');
    assert.equal(b.badge_color, 'from-accent-red to-bg-primary');
  });
});
