// frontend/src/__tests__/unit/perkTypeDataIntegrity.test.ts
//
// Frontend-side mirror of the backend's perk_type data-integrity regression
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
  'exhaustion', 'gen_slowdown', 'hex', 'boon', 'chase',
  'aura_reading', 'altruism_healing', 'handicap', 'meme', 'general',
]);

// Same ground truth as chaosMutators.ts's SURVIVOR_CHAOS_MUTATORS /
// KILLER_CHAOS_MUTATORS: a perk_type consumed by only one role's curse(s)
// must never appear on a perk of the other role.
const ROLE_ONLY_PERK_TYPES: Record<string, 'Survivor' | 'Killer'> = {
  exhaustion: 'Survivor',
  altruism_healing: 'Survivor',
  boon: 'Survivor',
  gen_slowdown: 'Killer',
  chase: 'Killer',
};

interface RawPerk {
  name: string;
  role?: string;
  category?: string;
  perk_type?: string | null;
}

function loadPerks(): RawPerk[] {
  const raw = JSON.parse(fs.readFileSync(PERKS_JSON_PATH, 'utf-8'));
  return raw.perks as RawPerk[];
}

test('perks.json: every perk has a valid, non-null perk_type', () => {
  const perks = loadPerks();
  assert.ok(perks.length >= 321, `expected at least 321 perks, found ${perks.length}`);

  const missing = perks.filter((p) => !p.perk_type).map((p) => p.name);
  const invalid = perks.filter((p) => p.perk_type && !ALLOWED_PERK_TYPES.has(p.perk_type)).map((p) => `${p.name}=${p.perk_type}`);

  assert.deepStrictEqual(missing, [], `perks with no perk_type: ${missing.join(', ')}`);
  assert.deepStrictEqual(invalid, [], `perks with an invalid perk_type: ${invalid.join(', ')}`);
});

test('perks.json: no perk carries a perk_type whose only consuming curse is scoped to the OTHER role (generic sweep, not spot checks)', () => {
  const perks = loadPerks();
  const violations = perks
    .filter((p) => p.perk_type && ROLE_ONLY_PERK_TYPES[p.perk_type] && p.role !== ROLE_ONLY_PERK_TYPES[p.perk_type])
    .map((p) => `${p.name} (role=${p.role}, perk_type=${p.perk_type})`);

  assert.deepStrictEqual(violations, [], `role-mismatched perk_type assignments: ${violations.join(', ')}`);
});

test('SANITY: the role-mismatch sweep would have failed against the real pre-fix Sloppy Butcher data', () => {
  const perks = loadPerks();
  const sloppyButcher = perks.find((p) => p.name === 'Sloppy Butcher');
  assert.ok(sloppyButcher, 'Sloppy Butcher not found in perks.json -- fixture drifted');
  assert.strictEqual(sloppyButcher!.role, 'Killer');

  // Re-run the exact sweep logic against a deliberately corrupted copy.
  const corrupted = perks.map((p) => (p.name === 'Sloppy Butcher' ? { ...p, perk_type: 'altruism_healing' } : p));
  const violations = corrupted.filter(
    (p) => p.perk_type && ROLE_ONLY_PERK_TYPES[p.perk_type] && p.role !== ROLE_ONLY_PERK_TYPES[p.perk_type]
  );
  assert.strictEqual(violations.length, 1, 'the sweep did not flag the reintroduced Sloppy Butcher bug');
  assert.strictEqual(violations[0].name, 'Sloppy Butcher');
});
