// frontend/src/__tests__/helpers/found.ts
//
// Zero-tolerance assertions for the guard suites. A guard reports every place that breaks its rule,
// and the test fails while there is any: nothing is held back in a baseline file.
import assert from 'node:assert/strict';

export type Counts = Record<string, number>;

export function countBy(ids: string[]): Counts {
  const out: Counts = {};
  for (const id of ids) out[id] = (out[id] ?? 0) + 1;
  return out;
}

/** Fails with one line per offending file (and how many times it offends) when `found` is not empty. */
export function expectNone(found: Counts, what: string): void {
  const lines = Object.entries(found)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, n]) => `${id}: ${n}`);
  assert.deepEqual(lines, [], `Found ${what}. Fix them:`);
}
