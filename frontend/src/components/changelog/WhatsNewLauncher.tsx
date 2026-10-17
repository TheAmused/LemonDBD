'use client';
// frontend/src/components/changelog/WhatsNewLauncher.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Megaphone, Plus, Skull } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/context/AuthContext';
import { useDragReorder } from '@/hooks/useDragReorder';
import type {
  ChangelogAnnounceResponse,
  ChangelogDiscordResult,
  ChangelogPost,
  ChangelogPostDraft,
} from '@/types/changelog';
import {
  announceChangelogPost,
  createChangelogPost,
  deleteChangelogPost,
  reorderChangelogPosts,
  updateChangelogAnnouncement,
  updateChangelogPost,
} from '@/services/changelogApi';
import { ChangelogPostItem } from './ChangelogPostItem';
import type { ChangelogFeed } from './useChangelogFeed';
import dynamic from 'next/dynamic';

import { Alert } from '@/components/common/Alert';
import { EmptyState } from '@/components/common/EmptyState';
import { tip } from '@/components/common/Tooltip';
import { Modal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { SuccessState } from '@/components/common/SuccessState';
import { UnreadDot } from '@/components/common/UnreadDot';
import { useDictionary } from "@/context/DictionaryContext";

import { Button } from '@/components/common/Button';
const ChangelogEditorModal = dynamic(
  () => import('./ChangelogEditorModal').then((m) => m.ChangelogEditorModal),
  { ssr: false }
);
const ConfirmModal = dynamic(
  () => import('@/components/common/ConfirmModal').then((m) => m.ConfirmModal),
  { ssr: false }
);

const TOUCH_HOLD_MS = 220;

interface PendingDiscord {
  post: ChangelogPost;
  kind: 'announce' | 'update';
}

export interface WhatsNewLauncherProps {
  /** The shared feed from `useChangelogFeed`, so every launcher on the page uses one fetch. */
  feed: ChangelogFeed;
  /** Extra classes for the icon-only trigger button (sizing/positioning). */
  className?: string;
}

/**
 * Self-contained "What's New?" widget: an icon-only trigger button plus the
 * centered changelog modal it opens. Every entry starts collapsed to a short
 * preview, so a long feed stays scannable.
 * Admins reorder entries by grabbing a handle (see useDragReorder: mouse-drag
 * on desktop, press-and-hold-then-drag on touch).
 */
export const WhatsNewLauncher: React.FC<WhatsNewLauncherProps> = ({ feed, className = '' }) => {
  const dict = useDictionary();
  const t = dict.changelog;
  const { token, isAdmin } = useAuth();
  const { posts, setPosts, loading, loadingMore, hasMore, hasUnread, isUnread, markRead, reload, loadMore } = feed;
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [editingPost, setEditingPost] = useState<ChangelogPost | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingDiscord, setPendingDiscord] = useState<PendingDiscord | null>(null);
  const [pendingDraft, setPendingDraft] = useState<ChangelogPostDraft | null>(null);
  const [announcing, setAnnouncing] = useState(false);
  const [discordNotice, setDiscordNotice] = useState<{ title: string; postTitle: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleOpen = () => {
    setIsOpen(true);
    setActionError(null);
  };

  const handleSave = async (draft: ChangelogPostDraft) => {
    if (!token) return;
    setSaving(true);
    setEditorError(null);
    try {
      if (editingPost) {
        const res = await updateChangelogPost(token, editingPost.id, draft);
        // The server keeps the Discord message in line itself: rewrites it when behind, deletes it for a draft.
        if (res.discord === 'failed') setActionError(draft.is_published ? t.discordUpdateFailed : t.discordRemoveFailed);
        else if (res.discord && res.discord !== 'removed') reportDiscord(res.discord, draft.title, t.discordUpdated);
      } else {
        await createChangelogPost(token, draft);
      }
      setEditorOpen(false);
      setEditingPost(null);
      await reload();
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : t.saveError);
    } finally {
      setSaving(false);
    }
  };

  // Taking an entry off Discord cannot be undone, so it is confirmed first (only when it has a message there).
  const requestSave = (draft: ChangelogPostDraft) => {
    const takesDownDiscordMessage = !!editingPost?.is_published && !draft.is_published && !!editingPost.discord_synced_at;
    if (takesDownDiscordMessage) setPendingDraft(draft);
    else void handleSave(draft);
  };

  const handleDelete = async () => {
    if (!token || pendingDeleteId == null) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await deleteChangelogPost(token, id);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.deleteError);
    }
  };

  const discordErrors: Record<Exclude<ChangelogDiscordResult, 'sent'>, string> = {
    failed: t.discordFailed,
    not_configured: t.discordNotConfigured,
    missing: t.discordMissing,
  };

  const reportDiscord = (result: ChangelogDiscordResult, postTitle: string, successTitle: string) => {
    if (result === 'sent') {
      setActionError(null);
      setDiscordNotice({ title: successTitle, postTitle });
    } else {
      setActionError(discordErrors[result]);
    }
  };

  const runDiscordAction = async ({ post, kind }: PendingDiscord) => {
    if (!token) return;
    const call: (token: string, id: number) => Promise<ChangelogAnnounceResponse> =
      kind === 'announce' ? announceChangelogPost : updateChangelogAnnouncement;
    setAnnouncing(true);
    try {
      const res = await call(token, post.id);
      reportDiscord(res.discord, post.title, kind === 'announce' ? t.discordSuccess : t.discordUpdated);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.discordFailed);
    } finally {
      setAnnouncing(false);
      setPendingDiscord(null);
    }
  };

  const toggleExpanded = (post: ChangelogPost) => {
    markRead(post);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(post.id)) next.delete(post.id);
      else next.add(post.id);
      return next;
    });
  };

  const listedPosts = useMemo(() => (isAdmin ? posts : posts.filter((p) => p.is_published)), [posts, isAdmin]);

  // Every entry starts collapsed on each open (readers: opening one is what marks it as read).
  useEffect(() => {
    if (!isOpen) setExpandedIds(new Set());
  }, [isOpen]);

  const canReorder = isAdmin && !!token;

  const persistOrder = useCallback(
    async (ordered: ChangelogPost[]) => {
      if (!token) return;
      try {
        await reorderChangelogPosts(token, ordered.map((p) => p.id));
      } catch {
        // Best-effort: a failed save just means the next reload restores the
        // server's order. Not worth interrupting the admin with an alert.
      }
    },
    [token]
  );

  const postsRef = useRef(posts);
  postsRef.current = posts;

  const drag = useDragReorder<number>({
    enabled: canReorder,
    touchHoldMs: TOUCH_HOLD_MS,
    onMove: (fromId, toId) =>
      setPosts((prev) => {
        const from = prev.findIndex((p) => p.id === fromId);
        const to = prev.findIndex((p) => p.id === toId);
        if (from < 0 || to < 0 || from === to) return prev;
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      }),
    onDrop: () => void persistOrder(postsRef.current),
  });

  return (
    <>
      <Button variant="secondary" size="md" icon
        type="button"
        onClick={handleOpen}
        {...tip(t.triggerTitle, undefined, 'action')}
        aria-label={t.triggerTitle}
        className={cn('relative', className)}
      >
        <Megaphone className="h-4 w-4" />
        {hasUnread && <UnreadDot className="absolute -right-0.5 -top-0.5" />}
      </Button>

      <Modal
        isOpen={mounted && isOpen}
        onClose={() => setIsOpen(false)}
        variant="dialog"
        size="2xl"
        fullscreenOnMobile
        title={t.modalTitle}
        closeButtonAriaLabel={t.close}
        headerRight={
          isAdmin ? (
            <Button
              type="button"
              onClick={() => {
                setEditingPost(null);
                setEditorOpen(true);
              }}
              {...tip(t.newEntry, undefined, 'action')} aria-label={t.newEntry}
              variant="secondary" size="md" icon
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : undefined
        }
      >
        <div className="relative px-4 sm:px-6">
          {actionError && (
            <Alert className="mt-4" onDismiss={() => setActionError(null)} dismissLabel={t.close}>
              {actionError}
            </Alert>
          )}

          {loading && (
            <div className="flex items-center justify-center py-16 text-text-muted">
              <Spinner size="md" />
            </div>
          )}

          {!loading && listedPosts.length === 0 && <EmptyState variant="inline" icon={Skull} title={t.emptyState} />}

          <div className="divide-y divide-border-color">
            {listedPosts.map((post) => (
              <ChangelogPostItem
                key={post.id}
                post={post}
                expanded={expandedIds.has(post.id)}
                unread={isUnread(post)}
                isAdmin={isAdmin}
                canReorder={canReorder}
                dragging={drag.draggingId === post.id}
                rowRef={drag.rowRef(post.id)}
                handleProps={drag.handleProps(post.id)}
                onToggle={() => toggleExpanded(post)}
                onAnnounce={() => setPendingDiscord({ post, kind: 'announce' })}
                onUpdateDiscord={() => setPendingDiscord({ post, kind: 'update' })}
                onEdit={() => {
                  setEditingPost(post);
                  setEditorOpen(true);
                }}
                onDelete={() => setPendingDeleteId(post.id)}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center py-5">
              <Button variant="secondary" size="md" loading={loadingMore} onClick={() => void loadMore()}>
                {t.loadMore}
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {editorOpen && (
        <ChangelogEditorModal
          open={editorOpen}
          post={editingPost}
          saving={saving}
          error={editorError}
          onClose={() => {
            setEditorError(null);
            setEditorOpen(false);
            setEditingPost(null);
          }}
          onSave={requestSave}
        />
      )}

      {pendingDiscord && (
        <ConfirmModal
          open
          size="md"
          title={pendingDiscord.kind === 'announce' ? t.discordConfirmTitle : t.discordUpdateConfirmTitle}
          message={
            <>
              <p>{pendingDiscord.kind === 'announce' ? t.discordConfirmMessage : t.discordUpdateConfirmMessage}</p>
              <p className="mt-3 font-bold text-text-primary">{pendingDiscord.post.title}</p>
            </>
          }
          confirmLabel={pendingDiscord.kind === 'announce' ? t.discordConfirmSend : t.discordUpdateConfirmSend}
          closeButton="header"
          closeButtonAriaLabel={t.cancel}
          busy={announcing}
          busyLabel={pendingDiscord.kind === 'announce' ? t.discordConfirmSend : t.discordUpdateConfirmSend}
          onConfirm={() => runDiscordAction(pendingDiscord)}
          onCancel={() => setPendingDiscord(null)}
        />
      )}

      {pendingDraft && (
        <ConfirmModal
          open
          size="md"
          title={t.draftConfirmTitle}
          message={<p>{t.draftConfirmMessage}</p>}
          confirmLabel={t.save}
          closeButton="header"
          closeButtonAriaLabel={t.cancel}
          onConfirm={() => {
            const draft = pendingDraft;
            setPendingDraft(null);
            void handleSave(draft);
          }}
          onCancel={() => setPendingDraft(null)}
        />
      )}

      <Modal
        isOpen={discordNotice !== null}
        onClose={() => setDiscordNotice(null)}
        variant="dialog"
        size="sm"
        layer="top"
        closeButton="floating"
        closeButtonAriaLabel={t.close}
        ariaLabel={discordNotice?.title}
        padded
      >
        <SuccessState title={discordNotice?.title} description={discordNotice?.postTitle} />
      </Modal>

      {pendingDeleteId != null && (
        <ConfirmModal
          open={pendingDeleteId != null}
          size="md"
          title={t.deleteConfirmTitle}
          message={t.deleteConfirmMessage}
          confirmLabel={t.delete}
          onConfirm={handleDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </>
  );
};
