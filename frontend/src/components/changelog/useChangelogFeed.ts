'use client';
// frontend/src/components/changelog/useChangelogFeed.ts

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useStoredItem } from '@/hooks/useStoredItem';
import { getLocalStorage } from '@/utils/safeStorage';
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
  const [reloading, setReloading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [storedRead, writeRead] = useStoredItem(storageKey);

  // Until the session is known the account is unknown too, so nothing is tracked yet: reading the guest's
  // history on a page refresh would flash a dot that belongs to nobody. Without storage (private browsing)
  // nothing is tracked at all. undefined: not tracked.
  const readIds = useMemo(
    () => (authLoading || getLocalStorage() === null ? undefined : parseReadIds(storedRead)),
    [authLoading, storedRead]
  );

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

  const showFirstPage = useCallback((res: Awaited<ReturnType<typeof fetchPage>> | null) => {
    setPosts(res ? res.data : []);
    setPage(1);
    setHasMore(res ? res.has_more : false);
  }, []);

  // The first page loads for each feed (public, or the admin's with drafts); `loading` holds until it has.
  const [loadedFeed, setLoadedFeed] = useState<typeof fetchPage | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchPage(1)
      .then(
        (res) => !cancelled && showFirstPage(res),
        () => !cancelled && showFirstPage(null)
      )
      .finally(() => !cancelled && setLoadedFeed(() => fetchPage));
    return () => {
      cancelled = true;
    };
  }, [fetchPage, showFirstPage]);
  const loading = reloading || loadedFeed !== fetchPage;

  const reload = useCallback(async () => {
    setReloading(true);
    try {
      showFirstPage(await fetchPage(1));
    } catch {
      showFirstPage(null);
    } finally {
      setReloading(false);
    }
  }, [fetchPage, showFirstPage]);

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
      writeRead(JSON.stringify({ read: [...readState.read, post.id] }));
    },
    [readState, isUnread, writeRead]
  );

  return { posts, setPosts, loading, loadingMore, hasMore, hasUnread, isUnread, markRead, reload, loadMore };
}
