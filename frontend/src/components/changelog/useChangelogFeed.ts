'use client';
// frontend/src/components/changelog/useChangelogFeed.ts

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchChangelogPosts, fetchChangelogPostsAdmin } from '@/services/changelogApi';
import type { ChangelogPost } from '@/types/changelog';
import { isUnreadPost, parseReadIds, type ChangelogReadState } from './changelogReadState';

const READ_STATE_KEY = 'lemondbd_changelog_read';
const PUBLIC_PAGE_SIZE = 20;
const ADMIN_PAGE_SIZE = 50;

export interface ChangelogFeed {
  posts: ChangelogPost[];
  /** Local reorder while an admin drags an entry; the launcher saves the new order itself. */
  setPosts: Dispatch<SetStateAction<ChangelogPost[]>>;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  /** At least one published entry has not been opened by this reader yet. */
  hasUnread: boolean;
  isUnread: (post: ChangelogPost) => boolean;
  /** Called when the reader opens an entry: its "New" marker (and the dot, if it was the last one) goes away. */
  markRead: (post: ChangelogPost) => void;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
}

// Per account, so one person's reading never hides updates from the next one on the same browser.
const storageKeyFor = (userId: number | undefined) => `${READ_STATE_KEY}:${userId ?? 'guest'}`;

const readStored = (key: string): number[] | undefined => {
  try {
    return parseReadIds(window.localStorage.getItem(key));
  } catch {
    return undefined; // private browsing etc.: no unread tracking at all
  }
};

const writeStored = (key: string, read: number[]) => {
  try {
    window.localStorage.setItem(key, JSON.stringify({ read }));
  } catch {
    /* ignore persistence failures */
  }
};

/**
 * The "What's New" feed, loaded once and shared by every launcher on the page
 * (the sidebar renders one for desktop and one for the mobile header). Unread
 * tracking looks only at published entries from after the account was created,
 * and is switched off for admins, who write the entries themselves.
 */
export function useChangelogFeed(): ChangelogFeed {
  const { token, isAdmin, user, isLoading: authLoading } = useAuth();
  const storageKey = storageKeyFor(user?.id);
  const [posts, setPosts] = useState<ChangelogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  // undefined: not read yet or storage unavailable.
  const [readIds, setReadIds] = useState<number[] | undefined>(undefined);

  // Until the session is known the account is unknown too, so nothing is tracked yet: reading the guest's
  // history on a page refresh would flash a dot that belongs to nobody.
  useEffect(() => {
    setReadIds(authLoading ? undefined : readStored(storageKey));
  }, [authLoading, storageKey]);

  // Entries older than the account are history, not news: "new" starts at sign-up.
  const createdAt = user?.created_at;
  const readState = useMemo<ChangelogReadState | undefined>(
    () => (readIds && createdAt ? { baseline: createdAt, read: readIds } : undefined),
    [readIds, createdAt]
  );

  const fetchPage = useCallback(
    (pageNumber: number) =>
      isAdmin && token
        ? fetchChangelogPostsAdmin(token, pageNumber, ADMIN_PAGE_SIZE)
        : fetchChangelogPosts(pageNumber, PUBLIC_PAGE_SIZE),
    [isAdmin, token]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPage(1);
      setPosts(res.data);
      setPage(1);
      setHasMore(res.has_more);
    } catch {
      setPosts([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const res = await fetchPage(page + 1);
      setPosts((prev) => {
        const known = new Set(prev.map((p) => p.id));
        return [...prev, ...res.data.filter((p) => !known.has(p.id))];
      });
      setPage(page + 1);
      setHasMore(res.has_more);
    } catch {
      /* keep the button: the reader can retry */
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, page]);

  const isUnread = useCallback(
    (post: ChangelogPost) => !isAdmin && isUnreadPost(post, readState),
    [isAdmin, readState]
  );

  const hasUnread = useMemo(() => posts.some(isUnread), [posts, isUnread]);

  const markRead = useCallback(
    (post: ChangelogPost) => {
      if (!readState || !isUnread(post)) return;
      const next = [...readState.read, post.id];
      writeStored(storageKey, next);
      setReadIds(next);
    },
    [readState, isUnread, storageKey]
  );

  return { posts, setPosts, loading, loadingMore, hasMore, hasUnread, isUnread, markRead, reload, loadMore };
}
