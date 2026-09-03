'use client';
// frontend/src/components/changelog/WhatsNewLauncher.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Sparkles,
  Skull,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { Dictionary } from '@/locales/types';
import type { ChangelogPost, ChangelogPostDraft, ChangelogTag } from '@/types/changelog';
import {
  createChangelogPost,
  deleteChangelogPost,
  fetchChangelogPosts,
  fetchChangelogPostsAdmin,
  reorderChangelogPosts,
  updateChangelogPost,
} from '@/services/changelogApi';
import { CHANGELOG_TAG_THEME } from './changelogTheme';
import dynamic from 'next/dynamic';

const ChangelogEditorModal = dynamic(
  () => import('./ChangelogEditorModal').then((m) => m.ChangelogEditorModal),
  { ssr: false }
);
const ConfirmModal = dynamic(
  () => import('@/components/ConfirmModal').then((m) => m.ConfirmModal),
  { ssr: false }
);

const LAST_SEEN_KEY = 'lemondbd_changelog_last_seen';
const TOUCH_HOLD_MS = 220;

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export interface WhatsNewLauncherProps {
  /** Extra classes for the icon-only trigger button (sizing/positioning). */
  className?: string;
  dict?: Dictionary;
}

/**
 * Self-contained "What's New?" widget: an icon-only trigger button plus the
 * centered changelog modal it opens. Entries collapse into an accordion so
 * a long feed stays scannable, and admins can reorder entries either by
 * grabbing a handle (mouse-drag on desktop, press-and-hold-then-drag via the
 * Pointer Events API on touch) or with keyboard/tap-friendly up/down buttons.
 */
export const WhatsNewLauncher: React.FC<WhatsNewLauncherProps> = ({ className = '', dict }) => {
  const t = dict?.changelog;
  const { token, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [posts, setPosts] = useState<ChangelogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ChangelogTag | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [editingPost, setEditingPost] = useState<ChangelogPost | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const dragRef = useRef<{ id: number; active: boolean; holdTimer: ReturnType<typeof setTimeout> | null } | null>(
    null
  );

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res =
        isAdmin && token ? await fetchChangelogPostsAdmin(token) : await fetchChangelogPosts();
      setPosts(res.data);

      const latest = res.data[0]?.created_at;
      if (latest && typeof window !== 'undefined') {
        try {
          const lastSeen = window.localStorage.getItem(LAST_SEEN_KEY);
          setHasUnread(!lastSeen || new Date(latest) > new Date(lastSeen));
        } catch {
          setHasUnread(false);
        }
      }
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    if (posts[0]?.created_at && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LAST_SEEN_KEY, posts[0].created_at);
      } catch {
        /* ignore persistence failures (private browsing, etc.) */
      }
    }
    setHasUnread(false);
  };

  const handleSave = async (draft: ChangelogPostDraft) => {
    if (!token) return;
    setSaving(true);
    try {
      if (editingPost) {
        await updateChangelogPost(token, editingPost.id, draft);
      } else {
        await createChangelogPost(token, draft);
      }
      setEditorOpen(false);
      setEditingPost(null);
      await loadPosts();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : t?.saveError || 'Failed to save changelog entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || pendingDeleteId == null) return;
    try {
      await deleteChangelogPost(token, pendingDeleteId);
      setPendingDeleteId(null);
      setEditorOpen(false);
      setEditingPost(null);
      await loadPosts();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : t?.deleteError || 'Failed to delete changelog entry.');
    }
  };

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visiblePosts = useMemo(() => {
    const base = isAdmin ? posts : posts.filter((p) => p.is_published);
    return activeFilter === 'all' ? base : base.filter((p) => p.tag === activeFilter);
  }, [posts, isAdmin, activeFilter]);

  // The first entry opens by default so the drawer never looks empty; every
  // other entry stays collapsed until the reader taps it.
  useEffect(() => {
    if (isOpen && visiblePosts.length > 0 && expandedIds.size === 0) {
      setExpandedIds(new Set([visiblePosts[0].id]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, visiblePosts]);

  const availableTags = useMemo(() => {
    const set = new Set<ChangelogTag>();
    (isAdmin ? posts : posts.filter((p) => p.is_published)).forEach((p) => set.add(p.tag));
    return Array.from(set);
  }, [posts, isAdmin]);

  // Reordering rewrites a global `position` column, so it only makes sense
  // against the unfiltered admin feed -- otherwise "move up" would be
  // ambiguous relative to hidden rows.
  const canReorder = isAdmin && !!token && activeFilter === 'all';

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

  const movePost = (id: number, direction: -1 | 1) => {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      const nextIdx = idx + direction;
      if (idx === -1 || nextIdx < 0 || nextIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(nextIdx, 0, moved);
      void persistOrder(next);
      return next;
    });
  };

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
      <button
        type="button"
        onClick={handleOpen}
        title={t?.triggerTitle || "What's New?"}
        aria-label={t?.triggerTitle || "What's New?"}
        className={`group relative flex h-9 w-9 items-center justify-center rounded-xl border border-border-color text-text-muted transition-all hover:border-amber-500/50 hover:text-amber-400 hover:bg-amber-500/10 cursor-pointer ${className}`}
      >
        <Megaphone className="h-4 w-4" />
        {hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-bg-surface" />
          </span>
        )}
      </button>

      {mounted &&
        isOpen &&
        createPortal(
          <div
            onClick={() => setIsOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="whats-new-title"
            className="fixed inset-0 z-[75] flex items-center justify-center p-4 sm:p-8 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative flex w-full max-w-2xl max-h-[85vh] flex-col overflow-hidden rounded-3xl border border-red-900/40 bg-bg-surface/98 shadow-2xl shadow-black/70 cursor-default animate-in zoom-in-95 duration-200"
            >
              {/* Heartbeat glow accent */}
              <div className="pointer-events-none absolute -top-16 right-0 h-48 w-48 rounded-full bg-red-600/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 left-0 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />

              <div className="relative flex items-center justify-between border-b border-border-color px-6 py-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-inner">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <h2 id="whats-new-title" className="text-base font-black tracking-tight text-text-primary">
                    {t?.modalTitle || "What's New"}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPost(null);
                        setEditorOpen(true);
                      }}
                      title={t?.newEntry || 'New entry'}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle text-text-secondary hover:border-amber-500/50 hover:text-amber-400 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label={t?.close || 'Close'}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-elevated hover:text-text-primary cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {availableTags.length > 1 && (
                <div className="relative flex flex-wrap gap-1.5 border-b border-border-color px-6 py-3">
                  <FilterChip
                    active={activeFilter === 'all'}
                    onClick={() => setActiveFilter('all')}
                    label={t?.filterAll || 'All'}
                  />
                  {availableTags.map((tag) => {
                    const theme = CHANGELOG_TAG_THEME[tag];
                    return (
                      <FilterChip
                        key={tag}
                        active={activeFilter === tag}
                        onClick={() => setActiveFilter(tag)}
                        label={theme.label}
                        dotClass={theme.dotClass}
                      />
                    );
                  })}
                </div>
              )}

              <div className="relative flex-1 overflow-y-auto px-6 py-5 space-y-3">
                {loading && (
                  <div className="flex items-center justify-center py-16 text-text-muted">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}

                {!loading && visiblePosts.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-16 text-center">
                    <Skull className="h-6 w-6 text-text-muted" />
                    <p className="text-xs font-medium text-text-muted">
                      {t?.emptyState || 'Nothing new yet. Check back after the next Trial.'}
                    </p>
                  </div>
                )}

                {visiblePosts.map((post, idx) => {
                  const theme = CHANGELOG_TAG_THEME[post.tag] || CHANGELOG_TAG_THEME.feature;
                  const isExpanded = expandedIds.has(post.id);
                  const isDragging = draggingId === post.id;

                  return (
                    <div
                      key={post.id}
                      ref={(el) => {
                        if (el) rowRefs.current.set(post.id, el);
                        else rowRefs.current.delete(post.id);
                      }}
                      onPointerMove={handlePointerMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      className={`rounded-2xl border transition-all ${
                        isDragging
                          ? 'border-amber-500/60 bg-bg-elevated/80 shadow-lg shadow-amber-950/30 scale-[1.01] z-10 relative'
                          : post.is_published
                            ? 'border-border-color bg-bg-elevated/50'
                            : 'border-dashed border-border-subtle bg-bg-elevated/20'
                      }`}
                    >
                      <div className="flex items-start gap-2 p-4">
                        {canReorder && (
                          <button
                            type="button"
                            title={t?.dragToReorder || 'Drag to reorder'}
                            aria-label={t?.dragToReorder || 'Drag to reorder'}
                            onPointerDown={(e) => beginDrag(e, post.id)}
                            style={{ touchAction: 'none' }}
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-bg-elevated hover:text-text-secondary cursor-grab active:cursor-grabbing ${
                              isDragging ? 'text-amber-400' : ''
                            }`}
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleExpanded(post.id)}
                          aria-expanded={isExpanded}
                          className="flex flex-1 items-start justify-between gap-3 text-left cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${theme.badgeClass}`}
                              >
                                {theme.label}
                              </span>
                              {!post.is_published && (
                                <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                                  {t?.draftBadge || 'Draft'}
                                </span>
                              )}
                              <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                                {formatDate(post.created_at)}
                              </span>
                            </div>
                            <h3 className="mt-1.5 truncate text-sm font-black text-text-primary">{post.title}</h3>
                          </div>
                          <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-muted">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </span>
                        </button>
                      </div>

                      <div
                        className="grid transition-[grid-template-rows] duration-300 ease-out"
                        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
                      >
                        <div className="overflow-hidden">
                          <div className="px-4 pb-4 pl-[2.75rem]">
                            <div
                              className="dbd-changelog-body text-xs leading-relaxed text-text-muted [&_h3]:text-sm [&_h3]:font-black [&_h3]:text-amber-400 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:text-sky-400 [&_a]:underline"
                              dangerouslySetInnerHTML={{ __html: post.content_html }}
                            />
                            <div className="mt-2.5 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                                {t?.byAuthor || 'by'} {post.author_name}
                              </span>
                              {isAdmin && (
                                <div className="flex items-center gap-1">
                                  {canReorder && (
                                    <>
                                      <IconButton
                                        icon={ChevronUp}
                                        label={t?.moveUp || 'Move up'}
                                        disabled={idx === 0}
                                        onClick={() => movePost(post.id, -1)}
                                      />
                                      <IconButton
                                        icon={ChevronDown}
                                        label={t?.moveDown || 'Move down'}
                                        disabled={idx === visiblePosts.length - 1}
                                        onClick={() => movePost(post.id, 1)}
                                      />
                                    </>
                                  )}
                                  <IconButton
                                    icon={Pencil}
                                    label={t?.edit || 'Edit'}
                                    hoverClass="hover:text-amber-400"
                                    onClick={() => {
                                      setEditingPost(post);
                                      setEditorOpen(true);
                                    }}
                                  />
                                  <IconButton
                                    icon={Trash2}
                                    label={t?.delete || 'Delete'}
                                    hoverClass="hover:text-rose-400"
                                    onClick={() => setPendingDeleteId(post.id)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}

      {mounted &&
        createPortal(
          <>
            {editorOpen && (
            <ChangelogEditorModal
              open={editorOpen}
              post={editingPost}
              saving={saving}
              dict={dict}
              onClose={() => {
                setEditorOpen(false);
                setEditingPost(null);
              }}
              onSave={handleSave}
              onDelete={editingPost ? () => setPendingDeleteId(editingPost.id) : undefined}
            />
            )}

            {pendingDeleteId != null && (
            <ConfirmModal
              open={pendingDeleteId != null}
              title={t?.deleteConfirmTitle || 'Delete this entry?'}
              message={t?.deleteConfirmMessage || 'This changelog post will be permanently removed.'}
              confirmLabel={t?.delete || 'Delete'}
              onConfirm={handleDelete}
              onCancel={() => setPendingDeleteId(null)}
            />
            )}
          </>,
          document.body
        )}
    </>
  );
};

const FilterChip: React.FC<{ active: boolean; onClick: () => void; label: string; dotClass?: string }> = ({
  active,
  onClick,
  label,
  dotClass,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-all cursor-pointer ${
      active
        ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
        : 'border-border-color text-text-muted hover:text-text-secondary'
    }`}
  >
    {dotClass && <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />}
    {label}
  </button>
);

const IconButton: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  hoverClass?: string;
}> = ({ icon: Icon, label, onClick, disabled, hoverClass = 'hover:text-text-secondary' }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className={`flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors cursor-pointer hover:bg-bg-elevated disabled:opacity-30 disabled:cursor-not-allowed ${hoverClass}`}
  >
    <Icon className="h-3.5 w-3.5" />
  </button>
);
