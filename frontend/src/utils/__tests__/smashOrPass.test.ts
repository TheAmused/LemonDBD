// frontend/src/utils/__tests__/smashOrPass.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  CHARACTER_ROSTER,
  ALL_CHARACTER_SLUGS,
  getCharacterRosterItem,
} from '../../components/smash-or-pass/characterRoster';
import {
  getLocalizedCharacterRoster,
  ROSTER_TRANSLATIONS,
} from '../../components/smash-or-pass/rosterTranslations';
import {
  SMASH_OR_PASS_EDITIONS,
  getEdition,
} from '../../components/smash-or-pass/editionsRegistry';

test('SmashOrPass: Character Roster Integrity', async (t) => {
  await t.test('contains complete 98-character roster of all killers and survivors', () => {
    assert.strictEqual(ALL_CHARACTER_SLUGS.length, 98, 'Must have exactly 98 characters in canonical slugs');
    const rosterKeys = Object.keys(CHARACTER_ROSTER);
    assert.ok(rosterKeys.length >= 98, `Expected at least 98 roster characters, got ${rosterKeys.length}`);

    // Verify key iconic characters exist
    assert.ok(CHARACTER_ROSTER['ada_wong'], 'Ada Wong must exist');
    assert.ok(CHARACTER_ROSTER['leon_scott_kennedy'], 'Leon S. Kennedy must exist');
    assert.ok(CHARACTER_ROSTER['sable_ward'], 'Sable Ward must exist');
    assert.ok(CHARACTER_ROSTER['the_huntress'], 'The Huntress must exist');
    assert.ok(CHARACTER_ROSTER['the_executioner'], 'Pyramid Head must exist');
    assert.ok(CHARACTER_ROSTER['the_xenomorph'], 'Xenomorph must exist');
    assert.ok(CHARACTER_ROSTER['the_animatronic'], 'Springtrap must exist');
    assert.ok(CHARACTER_ROSTER['the_lich'], 'Vecna must exist');
  });

  await t.test('all characters have valid gender and role classifications', () => {
    const validRoles = new Set(['Killer', 'Survivor']);
    const validGenders = new Set(['female', 'male', 'monster_other']);

    Object.values(CHARACTER_ROSTER).forEach((char) => {
      assert.ok(validRoles.has(char.role), `Invalid role '${char.role}' on ${char.slug}`);
      assert.ok(validGenders.has(char.gender), `Invalid gender '${char.gender}' on ${char.slug}`);
      assert.ok(char.name.length > 0, `Empty name on ${char.slug}`);
      assert.ok(char.bio.length > 0, `Empty bio on ${char.slug}`);
      assert.ok(char.greenFlags.length > 0, `Empty greenFlags on ${char.slug}`);
      assert.ok(char.redFlags.length > 0, `Empty redFlags on ${char.slug}`);
    });
  });

  await t.test('gender filtering returns expected non-empty subsets', () => {
    const all = Object.values(CHARACTER_ROSTER);
    const females = all.filter((c) => c.gender === 'female');
    const males = all.filter((c) => c.gender === 'male');
    const monsters = all.filter((c) => c.gender === 'monster_other');

    assert.ok(females.length >= 25, `Expected >= 25 females, got ${females.length}`);
    assert.ok(males.length >= 40, `Expected >= 40 males, got ${males.length}`);
    assert.ok(monsters.length >= 6, `Expected >= 6 monsters, got ${monsters.length}`);
  });

  await t.test('getCharacterRosterItem handles known and unknown slugs gracefully', () => {
    const ada = getCharacterRosterItem('ada_wong');
    assert.strictEqual(ada.name, 'Ada Wong');
    assert.strictEqual(ada.role, 'Survivor');
    assert.strictEqual(ada.gender, 'female');

    const unknown = getCharacterRosterItem('some_custom_killer_99');
    assert.strictEqual(unknown.role, 'Killer');
    assert.strictEqual(unknown.gender, 'monster_other');
    assert.ok(unknown.bio.length > 0);
  });

  await t.test('getLocalizedCharacterRoster returns translated fields for Polish, Spanish, German, Japanese, and English', () => {
    // English default
    const adaEn = getLocalizedCharacterRoster('ada_wong', 'en');
    assert.strictEqual(adaEn.title, 'The Enigmatic Operative');

    // Polish translation
    const adaPl = getLocalizedCharacterRoster('ada_wong', 'pl');
    assert.strictEqual(adaPl.title, 'Enigmatyczna Agentka');
    assert.ok(adaPl.bio.includes('Tajna agentka'));

    // Spanish translation
    const adaEs = getLocalizedCharacterRoster('ada_wong', 'es');
    assert.strictEqual(adaEs.title, 'La Agente Enigmática');

    // German translation
    const adaDe = getLocalizedCharacterRoster('ada_wong', 'de');
    assert.strictEqual(adaDe.title, 'Die Rätselhafte Agentin');

    // Japanese translation
    const adaJa = getLocalizedCharacterRoster('ada_wong', 'ja');
    assert.strictEqual(adaJa.title, '謎多きスパイ');
  });

  await t.test('Multi-Edition Registry provides valid edition configurations', () => {
    const canon = getEdition('canon');
    assert.strictEqual(canon.id, 'canon');
    assert.strictEqual(canon.characters.length, 98);

    const hoy = getEdition('hooked_on_you');
    assert.strictEqual(hoy.id, 'hooked_on_you');
    assert.strictEqual(hoy.characters.length, 8);

    const legendary = getEdition('legendary_cosplay');
    assert.strictEqual(legendary.id, 'legendary_cosplay');
    assert.strictEqual(legendary.characters.length, 12);
  });
});
