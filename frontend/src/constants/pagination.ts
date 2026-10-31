// frontend/src/constants/pagination.ts
// Page sizes. The picker in common/Pagination offers exactly PAGE_SIZE_OPTIONS, so a list's default
// must be one of them (a size missing from the picker would show as a blank select).

export const PAGE_SIZE_OPTIONS = [15, 30, 45, 60] as const;

/** The size a list starts with. */
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

/** Dense, one-line rows (audit log) start with a bigger page. */
export const DENSE_PAGE_SIZE = PAGE_SIZE_OPTIONS[1];

/** The last page that has rows, for `total` rows shown `perPage` at a time (at least 1). */
export function lastPage(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, perPage)));
}

/** The first and last result number (1-based) a page shows; 0 and 0 when there are no results. */
export function pageRange(page: number, limit: number, totalResults: number): [first: number, last: number] {
  return [totalResults === 0 ? 0 : (page - 1) * limit + 1, Math.min(page * limit, totalResults)];
}
