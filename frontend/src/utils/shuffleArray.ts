// frontend/src/utils/shuffleArray.ts

/**
 * Returns a new array containing every element of `items`, in a uniformly random
 * order (Fisher-Yates / Knuth shuffle).
 *
 * Do NOT use `array.sort(() => Math.random() - 0.5)` for this. That pattern looks
 * like a shuffle but isn't one: `Array.prototype.sort`'s comparator contract assumes
 * a stable, transitive ordering, and a random comparator violates it. Depending on
 * the engine's sort implementation (insertion sort for small arrays in V8, for
 * example), this produces a measurably non-uniform permutation -- some orderings
 * come out far more often than others, and the bias gets worse as the array grows.
 * It never crashes and never looks obviously wrong in manual testing, which is
 * exactly what makes it a silent correctness bug: the same class of "looks fine,
 * isn't uniform" issue as a weighted draw that's actually a hard filter.
 *
 * Fisher-Yates is the standard fix: each element is swapped with a uniformly random
 * element at or before its own position, once, walking the array backward. That
 * guarantees every one of the n! permutations is equally likely.
 */
export function shuffleArray<T>(items: readonly T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
