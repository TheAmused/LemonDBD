// frontend/src/__tests__/unit/shared/roleHelpers.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isKiller, isSurvivor } from '@/utils/characterUtils';
import { toRoleCategory, toLowercaseRole } from '@/types/perks';

describe('isKiller / isSurvivor', () => {
  it('are case-insensitive and accept plurals', () => {
    for (const v of ['Killer', 'killer', 'KILLERS', ' killer ']) {
      assert.strictEqual(isKiller(v), true, v);
      assert.strictEqual(isSurvivor(v), false, v);
    }
    for (const v of ['Survivor', 'survivor', 'SURVIVORS']) {
      assert.strictEqual(isSurvivor(v), true, v);
      assert.strictEqual(isKiller(v), false, v);
    }
  });

  it('are false for undefined, null and unknown values', () => {
    for (const v of [undefined, null, '', 'perk', 'entity']) {
      assert.strictEqual(isKiller(v), false);
      assert.strictEqual(isSurvivor(v), false);
    }
  });

  it('toRoleCategory and toLowercaseRole normalize roles correctly', () => {
    assert.strictEqual(toRoleCategory('killer'), 'Killer');
    assert.strictEqual(toRoleCategory('KILLER'), 'Killer');
    assert.strictEqual(toRoleCategory('survivor'), 'Survivor');
    assert.strictEqual(toRoleCategory('SURVIVOR'), 'Survivor');
    assert.strictEqual(toLowercaseRole('Killer'), 'killer');
    assert.strictEqual(toLowercaseRole('Survivor'), 'survivor');
  });
});

