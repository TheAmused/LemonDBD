'use client';
// frontend/src/components/changelog/ChangelogPostItem.tsx

import React from 'react';
import { GripVertical, Pencil, RefreshCw, Send, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ChangelogPost } from '@/types/changelog';
import type { DragReorder } from '@/hooks/useDragReorder';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Collapsible } from '@/components/common/Collapsible';
import { DisclosureButton } from '@/components/common/DisclosureButton';
import { RichText } from '@/components/common/RichText';
import { tip } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';
import { formatDate } from '@/utils/format';
import { htmlToPlainText } from './changelogText';
import { isBehindOnDiscord, postDate } from './changelogReadState';
import { CHANGELOG_BODY_CLASS } from './changelogTheme';

const formatPostDate = (iso: string | null) =>
  formatDate(iso, undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export interface ChangelogPostItemProps {
  post: ChangelogPost;
  expanded: boolean;
  /** Not opened by this reader yet: shows the "New" marker. */
  unread: boolean;
  isAdmin: boolean;
  /** Admin with a session: the drag handle is shown. */
  canReorder: boolean;
  dragging: boolean;
  rowRef: (el: HTMLElement | null) => void;
  handleProps: ReturnType<DragReorder<number>['handleProps']>;
  onToggle: () => void;
  onAnnounce: () => void;
  onUpdateDiscord: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** One entry of the "What's New?" feed: a collapsed header (date, title, preview) that opens to the full text, plus the admin's controls. */
export const ChangelogPostItem: React.FC<ChangelogPostItemProps> = ({
  post,
  expanded,
  unread,
  isAdmin,
  canReorder,
  dragging,
  rowRef,
  handleProps,
  onToggle,
  onAnnounce,
  onUpdateDiscord,
  onEdit,
  onDelete,
}) => {
  const t = useDictionary().changelog;
  const preview = expanded ? '' : htmlToPlainText(post.content_html);

  return (
    <article
      ref={rowRef}
      className={cn('py-4 transition-colors', dragging && 'relative z-10 rounded-card bg-bg-elevated px-2 shadow-lg')}
    >
      <div className="flex items-start gap-2">
        {canReorder && (
          <Button
            variant="ghost"
            size="sm"
            icon
            {...tip(t.dragToReorder, undefined, 'action')}
            aria-label={t.dragToReorder}
            {...handleProps}
            className={cn('cursor-grab active:cursor-grabbing', dragging && 'text-accent-amber')}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
        )}

        <DisclosureButton open={expanded} onClick={onToggle} className="min-w-0 flex-1 justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {isAdmin && (
                <Badge tone={post.is_published ? 'green' : 'amber'}>{post.is_published ? t.publishedLabel : t.draftBadge}</Badge>
              )}
              <span className="type-label-2xs text-text-muted">{formatPostDate(postDate(post))}</span>
              {post.edited_at && <span className="text-micro italic text-text-muted/70">{t.edited}</span>}
              {isAdmin && post.discord_announced_at && (
                <Badge tone="neutral" icon={<Send className="h-3 w-3" aria-hidden="true" />}>
                  {t.discordSent}
                </Badge>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <h3 className={cn('type-card-title min-w-0 text-text-primary', !expanded && 'truncate')}>{post.title}</h3>
              {unread && <Badge tone="redSolid">{t.newBadge}</Badge>}
            </div>
            {preview && <p className="mt-1 line-clamp-2 text-xs text-text-muted">{preview}</p>}
          </div>
        </DisclosureButton>

        {isAdmin && (
          <div className="flex shrink-0 items-center gap-0.5">
            {post.is_published && !post.discord_announced_at && (
              <IconButton icon={Send} label={t.announceDiscord} onClick={onAnnounce} />
            )}
            {post.is_published && isBehindOnDiscord(post) && (
              <IconButton icon={RefreshCw} label={t.discordUpdate} onClick={onUpdateDiscord} />
            )}
            <IconButton icon={Pencil} label={t.edit} onClick={onEdit} />
            <IconButton icon={Trash2} label={t.delete} onClick={onDelete} />
          </div>
        )}
      </div>

      {/* pl-10 = the drag handle (h-8 w-8) plus its gap, so the text lines up with the title */}
      <Collapsible open={expanded} contentClassName={cn('pt-3', canReorder && 'pl-10')}>
        <RichText text={post.content_html} block className={CHANGELOG_BODY_CLASS} />
      </Collapsible>
    </article>
  );
};

const IconButton: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}> = ({ icon: Icon, label, onClick }) => (
  <Button variant="ghost" size="sm" icon {...tip(label, undefined, 'action')} aria-label={label} onClick={onClick}>
    <Icon className="h-3.5 w-3.5" />
  </Button>
);
