// frontend/src/__tests__/guards/perkTypesParity.test.ts
//
// The perk types are declared twice, in Python and in TypeScript: this keeps them one list.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PERK_TYPES } from '@/utils/perkTypes';

describe('perk types vocabulary', () => {
  it('mirrors backend/app/models/perk_types.py', () => {
    const file = path.join(__dirname, '../../../../backend/app/models/perk_types.py');
    if (!fs.existsSync(file)) return;
    const src = fs.readFileSync(file, 'utf8');
    const literal = src.match(/PerkType = Literal\[([\s\S]*?)\]/);
    assert.ok(literal, 'PerkType Literal not found in perk_types.py');
    const backendTypes = [...literal[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
    assert.deepEqual(backendTypes, [...PERK_TYPES]);
  });
});
