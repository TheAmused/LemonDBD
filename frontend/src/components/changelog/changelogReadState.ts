// frontend/src/components/changelog/changelogReadState.ts

import type { ChangelogPost } from '@/types/changelog';

/** What one reader has already seen: entries published after `baseline` count as new until their id is in `read`. */
export interface ChangelogReadState {
  baseline: string;
  read: number[];
}

const EPOCH = '1970-01-01T00:00:00.000Z';

/** The date readers see: when the entry went live (a draft has none yet, so its creation time). */
export const postDate = (post: ChangelogPost): string | null => post.published_at ?? post.created_at;

const isNewer = (iso: string, than: string) => new Date(iso) > new Date(than);

/**
 * A first-time reader has no history, so only the newest published entry counts as new for them
 * (the baseline is the date of the one before it); everything older is taken as already known.
 */
export function firstVisitBaseline(posts: ChangelogPost[]): string {
  const dates = posts
    .filter((post) => post.is_published)
    .map(postDate)
    .filter((date): date is string => !!date)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return dates[1] ?? EPOCH;
}

export function isUnreadPost(post: ChangelogPost, state: ChangelogReadState | null | undefined): boolean {
  const date = postDate(post);
  return !!state && post.is_published && !!date && isNewer(date, state.baseline) && !state.read.includes(post.id);
}

export function parseReadState(raw: string | null): ChangelogReadState | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { baseline, read } = value as Partial<ChangelogReadState>;
    if (typeof baseline !== 'string' || !Array.isArray(read)) return null;
    return { baseline, read: read.filter((id): id is number => typeof id === 'number') };
  } catch {
    return null;
  }
}
