// frontend/src/utils/characterUtils.ts

export function sortByReleaseNumber<T extends { release_number?: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.release_number ?? Infinity) - (b.release_number ?? Infinity));
}
