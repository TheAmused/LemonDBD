'use client';
// frontend/src/components/changelog/WhatsNewLauncher.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Megaphone, Plus, Pencil, Trash2, Send, RefreshCw, Skull, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/context/AuthContext';
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
import { htmlToPlainText } from './changelogText';
import { isBehindOnDiscord, postDate } from './changelogReadState';
import { CHANGELOG_BODY_CLASS } from './changelogTheme';
import type { ChangelogFeed } from './useChangelogFeed';
import dynamic from 'next/dynamic';

import { tip } from '@/components/common/Tooltip';
import { Modal } from '@/components/common/Modal';
import { RichText } from '@/components/common/RichText';
import { Spinner } from '@/components/common/Spinner';
import { SuccessState } from '@/components/common/SuccessState';
import { UnreadDot } from '@/components/common/UnreadDot';
import { formatDate } from '@/utils/format';
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

const formatPostDate = (iso: string | null) =>
  formatDate(iso, undefined, { month: 'short', day: 'numeric', year: 'numeric' });

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
 * Admins reorder entries by grabbing a handle (mouse-drag on desktop,
 * press-and-hold-then-drag via the Pointer Events API on touch).
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
  const [pendingAnnounce, setPendingAnnounce] = useState<ChangelogPost | null>(null);
  const [pendingDiscordUpdate, setPendingDiscordUpdate] = useState<ChangelogPost | null>(null);
  const [announcing, setAnnouncing] = useState(false);
  /** The confirmation shown after Discord took the message: what happened and which entry. */
  const [discordNotice, setDiscordNotice] = useState<{ title: string; postTitle: string } | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const rowRefs = useRef<Map<number, HTMLElement>>(new Map());
  const dragRef = useRef<{ id: number; active: boolean; holdTimer: ReturnType<typeof setTimeout> | null } | null>(
    null
  );

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
        await updateChangelogPost(token, editingPost.id, draft);
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

  /** Sends `post` to Discord (first time) or rewrites its message, then tells the admin how it went. */
  const runDiscordAction = async (
    post: ChangelogPost,
    call: (token: string, id: number) => Promise<ChangelogAnnounceResponse>,
    successTitle: string
  ) => {
    if (!token) return;
    setAnnouncing(true);
    try {
      const res = await call(token, post.id);
      if (res.discord === 'sent') {
        setActionError(null);
        setDiscordNotice({ title: successTitle, postTitle: post.title });
      } else {
        setActionError(discordErrors[res.discord]);
      }
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.discordFailed);
    } finally {
      setAnnouncing(false);
      setPendingAnnounce(null);
      setPendingDiscordUpdate(null);
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

  const beginDrag = (e: React.PointerEvent, id: number) => {
    if (!canReorder) return;
    const start = () => {
      dragRef.current = { id, active: true, holdTimer: null };
      setDraggingId(id);
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore -- unsupported in some embedded webviews */
      }
    };
    if (e.pointerType === 'touch') {
      // Require a brief press-and-hold on touch so a normal scroll gesture
      // over the handle doesn't accidentally start a drag.
      const timer = setTimeout(start, TOUCH_HOLD_MS);
      dragRef.current = { id, active: false, holdTimer: timer };
    } else {
      start();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag?.active) return;
    e.preventDefault();
    const clientY = e.clientY;

    let closestIndex = -1;
    let closestDist = Infinity;
    posts.forEach((p, idx) => {
      const el = rowRefs.current.get(p.id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const dist = Math.abs(clientY - mid);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = idx;
      }
    });

    const currentIndex = posts.findIndex((p) => p.id === drag.id);
    if (closestIndex !== -1 && closestIndex !== currentIndex) {
      setPosts((prev) => {
        const next = [...prev];
        const [moved] = next.splice(currentIndex, 1);
        next.splice(closestIndex, 0, moved);
        return next;
      });
    }
  };

  const endDrag = () => {
    const drag = dragRef.current;
    if (drag?.holdTimer) clearTimeout(drag.holdTimer);
    const wasActive = drag?.active;
    dragRef.current = null;
    setDraggingId(null);
    if (wasActive) void persistOrder(posts);
  };

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
            <p role="alert" className="mt-4 rounded-card border border-accent-red/40 bg-accent-red/10 px-3 py-2 type-strong text-accent-red">
              {actionError}
            </p>
          )}

          {loading && (
            <div className="flex items-center justify-center py-16 text-text-muted">
              <Spinner size="md" />
            </div>
          )}

          {!loading && listedPosts.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Skull className="h-6 w-6 text-text-muted" />
              <p className="text-xs font-medium text-text-muted">
                {t.emptyState}
              </p>
            </div>
          )}

          <div className="divide-y divide-border-color">
            {listedPosts.map((post) => {
              const isExpanded = expandedIds.has(post.id);
              const isDragging = draggingId === post.id;
              const preview = isExpanded ? '' : htmlToPlainText(post.content_html);

              return (
                <article
                  key={post.id}
                  ref={(el) => {
                    if (el) rowRefs.current.set(post.id, el);
                    else rowRefs.current.delete(post.id);
                  }}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className={cn(
                    'py-4 transition-colors',
                    isDragging && 'relative z-10 rounded-card bg-bg-elevated px-2 shadow-lg'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {canReorder && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon
                        {...tip(t.dragToReorder, undefined, 'action')}
                        aria-label={t.dragToReorder}
                        onPointerDown={(e) => beginDrag(e, post.id)}
                        style={{ touchAction: 'none' }}
                        className={cn('cursor-grab active:cursor-grabbing', isDragging && 'text-accent-amber')}
                      >
                        <GripVertical className="h-4 w-4" />
                      </Button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpanded(post)}
                      aria-expanded={isExpanded}
                      className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isAdmin && (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-tiny font-black uppercase tracking-wide',
                                post.is_published
                                  ? 'border-accent-green/40 bg-accent-green/10 text-accent-green'
                                  : 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber'
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full', post.is_published ? 'bg-accent-green' : 'bg-accent-amber')} />
                              {post.is_published ? t.publishedLabel : t.draftBadge}
                            </span>
                          )}
                          <span className="type-label-2xs text-text-muted">
                            {formatPostDate(postDate(post))}
                          </span>
                          {post.edited_at && (
                            <span className="type-label-2xs text-text-muted">
                              {t.edited} {formatPostDate(post.edited_at)}
                            </span>
                          )}
                          {isAdmin && post.discord_announced_at && (
                            <span className="inline-flex items-center gap-1 type-label-2xs text-text-muted">
                              <Send className="h-3 w-3" aria-hidden="true" />
                              {t.discordSent}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <h3 className={cn('type-card-title min-w-0 text-text-primary', !isExpanded && 'truncate')}>
                            {post.title}
                          </h3>
                          {isUnread(post) && (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-accent-red px-2 py-0.5 text-tiny font-black uppercase tracking-wide text-text-inverted">
                              {t.newBadge}
                            </span>
                          )}
                        </div>
                        {preview && <p className="mt-1 line-clamp-2 text-xs text-text-muted">{preview}</p>}
                      </div>
                      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-muted">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    </button>

                    {isAdmin && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        {post.is_published && !post.discord_announced_at && (
                          <IconButton
                            icon={Send}
                            label={t.announceDiscord}
                            hoverClass="hover:text-accent-red"
                            onClick={() => setPendingAnnounce(post)}
                          />
                        )}
                        {post.is_published && isBehindOnDiscord(post) && (
                          <IconButton
                            icon={RefreshCw}
                            label={t.discordUpdate}
                            hoverClass="hover:text-accent-red"
                            onClick={() => setPendingDiscordUpdate(post)}
                          />
                        )}
                        <IconButton
                          icon={Pencil}
                          label={t.edit}
                          hoverClass="hover:text-accent-red"
                          onClick={() => {
                            setEditingPost(post);
                            setEditorOpen(true);
                          }}
                        />
                        <IconButton
                          icon={Trash2}
                          label={t.delete}
                          hoverClass="hover:text-accent-red"
                          onClick={() => setPendingDeleteId(post.id)}
                        />
                      </div>
                    )}
                  </div>

                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
                  >
                    <div className="overflow-hidden">
                      {/* pl-10 = the drag handle (h-8 w-8) plus its gap, so the text lines up with the title */}
                      <div className={cn('pt-3', canReorder && 'pl-10')}>
                        <RichText
                          text={post.content_html}
                          block
                          className={CHANGELOG_BODY_CLASS}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
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
          onSave={handleSave}
        />
      )}

      {pendingAnnounce && (
        <ConfirmModal
          open
          size="md"
          title={t.discordConfirmTitle}
          message={
            <>
              <p>{t.discordConfirmMessage}</p>
              <p className="mt-3 font-bold text-text-primary">{pendingAnnounce.title}</p>
            </>
          }
          confirmLabel={t.discordConfirmSend}
          closeButton="header"
          closeButtonAriaLabel={t.cancel}
          busy={announcing}
          busyLabel={t.discordConfirmSend}
          onConfirm={() => runDiscordAction(pendingAnnounce, announceChangelogPost, t.discordSuccess)}
          onCancel={() => setPendingAnnounce(null)}
        />
      )}

      {pendingDiscordUpdate && (
        <ConfirmModal
          open
          size="md"
          title={t.discordUpdateConfirmTitle}
          message={
            <>
              <p>{t.discordUpdateConfirmMessage}</p>
              <p className="mt-3 font-bold text-text-primary">{pendingDiscordUpdate.title}</p>
            </>
          }
          confirmLabel={t.discordUpdateConfirmSend}
          closeButton="header"
          closeButtonAriaLabel={t.cancel}
          busy={announcing}
          busyLabel={t.discordUpdateConfirmSend}
          onConfirm={() => runDiscordAction(pendingDiscordUpdate, updateChangelogAnnouncement, t.discordUpdated)}
          onCancel={() => setPendingDiscordUpdate(null)}
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

const IconButton: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  hoverClass?: string;
}> = ({ icon: Icon, label, onClick, hoverClass = 'hover:text-text-secondary' }) => (
  <Button variant="ghost" size="sm" icon
    type="button"
    {...tip(label, undefined, 'action')}
    aria-label={label}
    onClick={onClick}
    className={hoverClass}
  >
    <Icon className="h-3.5 w-3.5" />
  </Button>
);
