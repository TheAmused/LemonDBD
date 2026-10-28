// frontend/src/__tests__/unit/perks/perkSearch.test.ts
//
// The perk search engine: type words ("healing", "gens", "leczenie"), the
// union with plain text matching, strict type filters, typo tolerance,
// suggestions and the role-only hint. The last block runs it over the real
// seed catalog.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import en from '@/locales/en';
import pl from '@/locales/pl';
import ja from '@/locales/ja';
import type { Perk } from '@/types/perks';
import { PERK_TYPES, getKnownPerkTypes, perkTypesByRole } from '@/utils/perkTypes';
import { buildPerkTypeVocabulary } from '@/utils/perkSearch/vocabulary';
import { foldSearchText } from '@/utils/perkSearch/normalize';
import { parsePerkQuery, withinOneEdit, EMPTY_QUERY } from '@/utils/perkSearch/parse';
import { RANK, rankPerk, roleOnlyConflict, searchPerks } from '@/utils/perkSearch/match';
import { suggestPerkTypes } from '@/utils/perkSearch/suggest';
import { sortByRelevance, sortPerks } from '@/utils/perkSearch/sort';

const vocabEn = buildPerkTypeVocabulary(en.perkTypes);
const vocabPl = buildPerkTypeVocabulary(pl.perkTypes);
const vocabJa = buildPerkTypeVocabulary(ja.perkTypes);

const perk = (name: string, perk_types: string[], extra: Partial<Perk> = {}): Perk => ({
  name,
  perk_types,
  character: 'General',
  category: 'Survivor',
  description: '',
  icon_url: '',
  icon_local_path: '',
  ...extra,
});

const SPRINT_BURST = perk('Sprint Burst', ['exhaustion', 'chase'], { alternate_name: 'SB', character: 'Meg Thomas' });
const SELF_CARE = perk('Self-Care', ['healing'], { character: 'Claudette Morel' });
const CIRCLE = perk('Boon: Circle of Healing', ['totem', 'healing'], { character: 'Mikaela Reid' });
const BOTANY = perk('Botany Knowledge', ['healing'], { character: 'Claudette Morel' });
const DEJA_VU = perk('Deja Vu', ['generator', 'tracking']);
const KINDRED = perk('Kindred', ['tracking']);
const SPINE_CHILL = perk('Spine Chill', ['stealth']);
const RUIN = perk('Hex: Ruin', ['totem', 'generator'], { category: 'Killer', character: 'The Hag', character_real_name: 'Lisa Sherwood' });
const PAIN_RES = perk('Scourge Hook: Pain Resonance', ['hooks', 'generator'], { category: 'Killer', character: 'The Artist' });
const FRANKLIN = perk("Franklin's Demise", ['entity'], { category: 'Killer' });
const SURVIVORS = [SPRINT_BURST, SELF_CARE, CIRCLE, BOTANY, DEJA_VU, KINDRED, SPINE_CHILL];
const KILLERS = [RUIN, PAIN_RES, FRANKLIN];

const names = (perks: readonly Perk[], query: string, vocab = vocabEn, types: Parameters<typeof searchPerks>[2] = []) =>
  searchPerks(perks, parsePerkQuery(query, vocab), types).map((hit) => hit.perk.name).sort();

describe('perk types vocabulary', () => {
  it('reads missing or unknown types as entity and collects the types each role really has', () => {
    assert.deepEqual(getKnownPerkTypes({ perk_types: undefined }), ['entity']);
    assert.deepEqual(getKnownPerkTypes({ perk_types: ['bogus', 'tracking'] }), ['tracking']);
    const byRole = perkTypesByRole([...SURVIVORS, ...KILLERS]);
    assert.ok(byRole.Survivor.has('exhaustion') && !byRole.Killer.has('exhaustion'));
    assert.ok(byRole.Killer.has('totem') && byRole.Survivor.has('totem'));
    assert.ok(byRole.Killer.has('hooks') && !byRole.Survivor.has('hooks'));
  });

  it('every locale names every type with a label and keywords', () => {
    for (const vocab of [vocabEn, vocabPl, vocabJa]) {
      for (const type of PERK_TYPES) assert.ok(vocab.byType[type].length >= 2, type);
    }
  });
});

describe('folding and parsing', () => {
  it('folds punctuation, apostrophes and accents', () => {
    assert.equal(foldSearchText('Hex: Ruin'), 'hex ruin');
    assert.equal(foldSearchText("Franklin's Demise"), 'franklins demise');
    assert.equal(foldSearchText('Ogólne'), 'ogolne');
    assert.equal(foldSearchText('呪術：破滅'), '呪術 破滅');
  });

  it('is at most one edit apart', () => {
    assert.ok(withinOneEdit('exaustion', 'exhaustion'));
    assert.ok(withinOneEdit('healnig', 'healing'));
    assert.ok(withinOneEdit('chsae', 'chase'));
    assert.ok(!withinOneEdit('chase', 'chosen'));
  });

  it('finds type words, phrases, typos and the general scope', () => {
    const q = parsePerkQuery('gen aura', vocabEn);
    assert.deepEqual(q.typeGroups, [['generator'], ['tracking']]);
    assert.deepEqual(q.restWords, []);
    assert.deepEqual(parsePerkQuery('scourge hook pain', vocabEn).typeGroups, [['hooks']]);
    assert.deepEqual(parsePerkQuery('scourge hook pain', vocabEn).restWords, ['pain']);
    assert.deepEqual(parsePerkQuery('exaustion', vocabEn).typeGroups, [['exhaustion']]);
    assert.deepEqual(parsePerkQuery('totem', vocabEn).typeGroups, [['totem']]);
    assert.deepEqual(parsePerkQuery('hex', vocabEn).typeGroups, [['totem']]);
    assert.ok(parsePerkQuery('ogólne', vocabPl).general);
  });

  it('takes `type:` and `#` terms as strict filters', () => {
    const q = parsePerkQuery('type:chase #heal sprint', vocabEn);
    assert.deepEqual(q.explicitTypes.sort(), ['chase', 'healing']);
    assert.deepEqual(q.words, ['sprint']);
    assert.deepEqual(parsePerkQuery('type:nonsense', vocabEn).words, ['nonsense']);
  });

  it('finds Japanese type words inside an unspaced query', () => {
    const q = parsePerkQuery('治療パーク', vocabJa);
    assert.deepEqual(q.typeGroups, [['healing']]);
    assert.deepEqual(q.restWords, ['パーク']);
  });
});

describe('matching', () => {
  it('keeps the old name, alias, character and real-name matches', () => {
    assert.deepEqual(names(SURVIVORS, 'sprint'), ['Sprint Burst']);
    assert.deepEqual(names(SURVIVORS, 'meg'), ['Sprint Burst']);
    assert.deepEqual(names(SURVIVORS, 'sb'), ['Sprint Burst']);
    assert.deepEqual(names(KILLERS, 'sherwood'), ['Hex: Ruin']);
    assert.deepEqual(names(SURVIVORS, 'barbecue'), []);
    assert.deepEqual(names(KILLERS, 'franklins'), ["Franklin's Demise"]);
    assert.deepEqual(names(SURVIVORS, 'selfcare'), ['Self-Care']);
    assert.deepEqual(names(SURVIVORS, 'meg sprint'), ['Sprint Burst']);
  });

  it('finds every perk of a named type, plus literal name matches', () => {
    assert.deepEqual(names(SURVIVORS, 'healing'), ['Boon: Circle of Healing', 'Botany Knowledge', 'Self-Care']);
    assert.deepEqual(names(SURVIVORS, 'heal'), ['Boon: Circle of Healing', 'Botany Knowledge', 'Self-Care']);
    assert.deepEqual(names(SURVIVORS, 'leczenie', vocabPl), ['Boon: Circle of Healing', 'Botany Knowledge', 'Self-Care']);
    assert.deepEqual(names(SURVIVORS, 'circle of healing'), ['Boon: Circle of Healing']);
  });

  it('combines a type with the remaining words, and several types with AND', () => {
    assert.deepEqual(names(KILLERS, 'hex ruin'), ['Hex: Ruin']);
    assert.deepEqual(names(KILLERS, 'ruin hex'), ['Hex: Ruin']);
    assert.deepEqual(names(SURVIVORS, 'gen aura'), ['Deja Vu']);
    assert.deepEqual(names(SURVIVORS, 'healing claudette'), ['Botany Knowledge', 'Self-Care']);
  });

  it('applies type chips and `type:` strictly', () => {
    assert.deepEqual(names(SURVIVORS, '', vocabEn, ['tracking']), ['Deja Vu', 'Kindred']);
    assert.deepEqual(names(SURVIVORS, 'kindred', vocabEn, ['healing']), []);
    assert.deepEqual(names(SURVIVORS, 'type:aura'), ['Deja Vu', 'Kindred']);
  });

  it('ranks name matches above type matches and primary types above secondary ones', () => {
    const query = parsePerkQuery('healing', vocabEn);
    assert.equal(rankPerk(SELF_CARE, query), RANK.primaryType);
    assert.equal(rankPerk(CIRCLE, query), RANK.nameContains);
    const aura = parsePerkQuery('aura', vocabEn);
    assert.equal(rankPerk(KINDRED, aura), RANK.primaryType);
    assert.equal(rankPerk(DEJA_VU, aura), RANK.secondaryType);
    assert.equal(rankPerk(SPRINT_BURST, parsePerkQuery('sprint burst', vocabEn)), RANK.exactName);
    const ordered = sortByRelevance(searchPerks(SURVIVORS, aura), 'en').map((p) => p.name);
    assert.deepEqual(ordered, ['Kindred', 'Deja Vu']);
  });

  it('returns everything for an empty query', () => {
    assert.equal(searchPerks(SURVIVORS, EMPTY_QUERY).length, SURVIVORS.length);
  });

  it('explains a role-only type on the wrong role', () => {
    const byRole = perkTypesByRole([...SURVIVORS, ...KILLERS, CIRCLE]);
    assert.deepEqual(roleOnlyConflict(parsePerkQuery('exhaustion', vocabEn), [], 'Killer', byRole), { type: 'exhaustion', role: 'Survivor' });
    assert.deepEqual(roleOnlyConflict(EMPTY_QUERY, ['hooks'], 'Survivor', byRole), { type: 'hooks', role: 'Killer' });
    assert.equal(roleOnlyConflict(EMPTY_QUERY, ['totem'], 'Survivor', byRole), null);
    assert.equal(roleOnlyConflict(parsePerkQuery('totem', vocabEn), [], 'Killer', byRole), null);
    assert.equal(roleOnlyConflict(parsePerkQuery('generator', vocabEn), [], 'Killer', byRole), null);
  });
});

describe('suggestions and sorting', () => {
  it('suggests types for a partial word and says what search text remains', () => {
    const all = [...PERK_TYPES];
    assert.deepEqual(suggestPerkTypes('hea', vocabEn, all), [{ type: 'healing', remainingSearch: '' }]);
    assert.deepEqual(suggestPerkTypes('claudette hea', vocabEn, all), [{ type: 'healing', remainingSearch: 'claudette' }]);
    assert.deepEqual(suggestPerkTypes('hea', vocabEn, ['tracking']), []);
    assert.deepEqual(suggestPerkTypes('h', vocabEn, all), []);
    assert.equal(suggestPerkTypes('lecz', vocabPl, all)[0]?.type, 'healing');
    assert.equal(suggestPerkTypes('治', vocabJa, all)[0]?.type, 'healing');
  });

  it('sorts by displayed name or by character', () => {
    assert.deepEqual(sortPerks([KINDRED, DEJA_VU], 'name', 'asc', 'en').map((p) => p.name), ['Deja Vu', 'Kindred']);
    assert.deepEqual(sortPerks([KINDRED, DEJA_VU], 'name', 'desc', 'en').map((p) => p.name), ['Kindred', 'Deja Vu']);
    assert.deepEqual(
      sortPerks([SPRINT_BURST, SELF_CARE, BOTANY], 'character', 'asc', 'en').map((p) => p.name),
      ['Botany Knowledge', 'Self-Care', 'Sprint Burst']
    );
  });
});

describe('the real seed catalog', () => {
  const file = path.join(__dirname, '../../../../../backend/app/seeds/data/content/perks.json');
  const rows: { name: string; role: string; perk_types: string[]; translations?: Record<string, { name?: string }> }[] =
    fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).perks : [];
  const catalog = (lang: 'en' | 'pl') =>
    rows.map((row) => perk(lang === 'en' ? row.name : row.translations?.pl?.name || row.name, row.perk_types, { category: row.role }));

  it('every type word finds every perk of that type', { skip: rows.length === 0 }, () => {
    for (const [lang, vocab] of [['en', vocabEn], ['pl', vocabPl]] as const) {
      const perks = catalog(lang);
      for (const type of PERK_TYPES) {
        const typed = perks.filter((p) => p.perk_types?.includes(type)).map((p) => p.name);
        const found = new Set(searchPerks(perks, parsePerkQuery(vocab.labels[type], vocab)).map((h) => h.perk.name));
        for (const name of typed) assert.ok(found.has(name), `${lang} "${vocab.labels[type]}" missed ${name}`);
      }
    }
  });

  it('plain names still find exactly their perk first', { skip: rows.length === 0 }, () => {
    const perks = catalog('en');
    const cases = [['Dead Hard', 'Dead Hard'], ['hex ruin', 'Hex: Ruin'], ['deja vu', 'Déjà Vu'], ['sprint burst', 'Sprint Burst'], ['circle of healing', 'Boon: Circle of Healing']];
    for (const [query, name] of cases) {
      const top = sortByRelevance(searchPerks(perks, parsePerkQuery(query, vocabEn)), 'en')[0];
      assert.equal(top?.name, name);
    }
  });
});
