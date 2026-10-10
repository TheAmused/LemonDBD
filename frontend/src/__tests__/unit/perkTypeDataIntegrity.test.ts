// frontend/src/__tests__/unit/perkTypeDataIntegrity.test.ts
//
// Frontend-side mirror of the backend's perk_types data-integrity regression
// test, reading the same source-of-truth JSON file the backend seeds from
// (app/seeds/data/content/perks.json) directly, so a frontend-only checkout
// or a frontend-only CI run still catches the exact bug class this session
// fixed for Sloppy Butcher, without needing a live backend/DB.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const PERKS_JSON_PATH = path.resolve(__dirname, '../../../../backend/app/seeds/data/content/perks.json');

const ALLOWED_PERK_TYPES = new Set([
  'hex', 'boon', 'sacrifice', 'exhaustion', 'obsession',
  'aura', 'generator', 'healing', 'chase', 'stealth', 'entity', 'hooks',
]);

const MAX_PERK_TYPES = 3;

// Same ground truth as backend test_perk_types_data_integrity.py:
// a perk type scoped to only one role must never appear on a perk of the other role.
const ROLE_ONLY_PERK_TYPES: Record<string, 'Survivor' | 'Killer'> = {
  exhaustion: 'Survivor',
  boon: 'Survivor',
  hooks: 'Killer',
};

interface RawPerk {
  name: string;
  role?: string;
  category?: string;
  perk_types?: string[] | null;
}

function loadPerks(): RawPerk[] {
  const raw = JSON.parse(fs.readFileSync(PERKS_JSON_PATH, 'utf-8'));
  return raw.perks as RawPerk[];
}

function roleMismatches(perks: RawPerk[]): string[] {
  return perks.flatMap((p) =>
    (p.perk_types ?? [])
      .filter((t) => ROLE_ONLY_PERK_TYPES[t] && p.role !== ROLE_ONLY_PERK_TYPES[t])
      .map((t) => `${p.name} (role=${p.role}, perk_types has ${t})`)
  );
}

test('perks.json: every perk has a valid perk_types list (1-3 known types, no repeats, entity only alone)', () => {
  const perks = loadPerks();
  assert.ok(perks.length >= 321, `expected at least 321 perks, got ${perks.length}`);

  const problems: string[] = [];
  for (const p of perks) {
    const types = p.perk_types;
    if (!Array.isArray(types) || types.length === 0) {
      problems.push(`${p.name}: missing or empty`);
      continue;
    }
    if (types.length > MAX_PERK_TYPES) problems.push(`${p.name}: more than ${MAX_PERK_TYPES} types`);
    if (new Set(types).size !== types.length) problems.push(`${p.name}: repeated type`);
    for (const t of types) if (!ALLOWED_PERK_TYPES.has(t)) problems.push(`${p.name}: unknown type ${t}`);
    if (types.includes('entity') && types.length > 1) problems.push(`${p.name}: entity combined with another type`);
    if ('perk_type' in p) problems.push(`${p.name}: still carries the retired perk_type key`);
  }

  assert.deepStrictEqual(problems, [], `perks with an invalid perk_types list: ${problems.join('; ')}`);
});

test('perks.json: no perk carries a perk type whose only consuming curse is scoped to the OTHER role (generic sweep, not spot checks)', () => {
  const violations = roleMismatches(loadPerks());
  assert.deepStrictEqual(violations, [], `role-mismatched perk_types assignments: ${violations.join(', ')}`);
});

test('perks.json: every exhaustion perk is also a chase perk, with exhaustion as the primary type', () => {
  const exhaustionPerks = loadPerks().filter((p) => p.perk_types?.includes('exhaustion'));
  assert.ok(exhaustionPerks.length >= 11, `expected the 11 exhaustion perks, got ${exhaustionPerks.length}`);

  const wrong = exhaustionPerks.filter((p) => p.perk_types![0] !== 'exhaustion' || !p.perk_types!.includes('chase'));
  assert.deepStrictEqual(wrong.map((p) => p.name), [], 'exhaustion perks must be [exhaustion, chase, ...]');
});

test('perks.json: Deja Vu is a generator perk first and an aura perk second', () => {
  const dejaVu = loadPerks().find((p) => p.name === 'Déjà Vu');
  assert.ok(dejaVu, 'Déjà Vu not found in perks.json -- fixture drifted');
  assert.deepStrictEqual(dejaVu!.perk_types, ['generator', 'aura']);
});

test('SANITY: the role-mismatch sweep would have failed against the real pre-fix Sloppy Butcher data', () => {
  const perks = loadPerks();
  const sloppyButcher = perks.find((p) => p.name === 'Sloppy Butcher');
  assert.ok(sloppyButcher, 'Sloppy Butcher not found in perks.json -- fixture drifted');
  assert.strictEqual(sloppyButcher!.role, 'Killer');

  // Re-run the exact sweep logic against a deliberately corrupted copy.
  const corrupted = perks.map((p) => (p.name === 'Sloppy Butcher' ? { ...p, perk_types: ['exhaustion'] } : p));
  const violations = roleMismatches(corrupted);
  assert.strictEqual(violations.length, 1, 'the sweep did not flag the reintroduced Sloppy Butcher bug');
  assert.ok(violations[0].startsWith('Sloppy Butcher'));
});

test('SANITY: a secondary role-only type is caught too, not only the primary one', () => {
  const perks = loadPerks();
  const killerPerk = perks.find((p) => p.role === 'Killer' && p.perk_types?.length === 1 && p.perk_types[0] === 'chase');
  assert.ok(killerPerk, 'no single-type Killer chase perk found');

  const corrupted = perks.map((p) => (p === killerPerk ? { ...p, perk_types: ['chase', 'boon'] } : p));
  const violations = roleMismatches(corrupted);
  assert.strictEqual(violations.length, 1);
  assert.ok(violations[0].includes('boon'));
});
