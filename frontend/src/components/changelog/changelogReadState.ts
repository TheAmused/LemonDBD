// frontend/src/components/changelog/changelogReadState.ts

import type { ChangelogPost } from '@/types/changelog';

/** What one reader has already seen: entries published after `baseline` (their sign-up) count as new until their id is in `read`. */
export interface ChangelogReadState {
  baseline: string;
  read: number[];
}

/** The date readers see: when the entry went live (a draft has none yet, so its creation time). */
export const postDate = (post: ChangelogPost): string | null => post.published_at ?? post.created_at;

const isNewer = (iso: string, than: string) => new Date(iso) > new Date(than);

export function isUnreadPost(post: ChangelogPost, state: ChangelogReadState | null | undefined): boolean {
  const date = postDate(post);
  return !!state && post.is_published && !!date && isNewer(date, state.baseline) && !state.read.includes(post.id);
}

/** The opened entry ids kept in storage; anything unreadable counts as "nothing opened yet". */
export function parseReadIds(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return [];
    const { read } = value as { read?: unknown };
    return Array.isArray(read) ? read.filter((id): id is number => typeof id === 'number') : [];
  } catch {
    return [];
  }
}
