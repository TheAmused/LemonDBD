'use client';
// frontend/src/components/changelog/ChangelogEditorModal.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Heading3,
  Palette,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Trash2,
} from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { ChangelogPost, ChangelogPostDraft, ChangelogTag } from '@/types/changelog';
import {
  CHANGELOG_HIGHLIGHT_COLORS,
  CHANGELOG_TAG_THEME,
  CHANGELOG_TAGS,
  CHANGELOG_TEXT_COLORS,
} from './changelogTheme';

import { tip } from '@/components/common/Tooltip';
import { Modal } from '@/components/common/Modal';
import { Checkbox } from '@/components/common/Checkbox';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
export interface ChangelogEditorModalProps {
  open: boolean;
  post: ChangelogPost | null;
  saving?: boolean;
  /** Failure message from the last save/delete attempt. */
  error?: string | null;
  onClose: () => void;
  onSave: (draft: ChangelogPostDraft) => void;
  onDelete?: () => void;
  dict?: Dictionary;
}

const EMPTY_DRAFT: ChangelogPostDraft = {
  title: '',
  content_html: '',
  tag: 'feature',
  is_published: true,
};

/**
 * A dependency-free WYSIWYG editor for changelog posts. Uses
 * document.execCommand against a contentEditable surface -- deprecated but
 * still broadly supported for this exact use case (bold/italic/underline/
 * color/highlight/alignment/lists), and avoids pulling in a full rich-text
 * library for a handful of formatting actions used by admins only.
 */
export const ChangelogEditorModal: React.FC<ChangelogEditorModalProps> = ({
  open,
  post,
  saving = false,
  error = null,
  onClose,
  onSave,
  onDelete,
  dict,
}) => {
  const t = dict?.changelog;
  const editorRef = useRef<HTMLDivElement | null>(null);
  // Modal mounts its content one render after `open` flips, so the draft is applied once the editor exists.
  const [editorEl, setEditorEl] = useState<HTMLDivElement | null>(null);
  const setEditor = useCallback((el: HTMLDivElement | null) => {
    editorRef.current = el;
    setEditorEl(el);
  }, []);
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState<ChangelogTag>('feature');
  const [isPublished, setIsPublished] = useState(true);
  const [openPicker, setOpenPicker] = useState<'color' | 'highlight' | null>(null);

  useEffect(() => {
    if (!open) return;
    const draft = post
      ? { title: post.title, content_html: post.content_html, tag: post.tag, is_published: post.is_published }
      : EMPTY_DRAFT;
    setTitle(draft.title);
    setTag(draft.tag);
    setIsPublished(draft.is_published);
    if (editorEl) editorEl.innerHTML = draft.content_html;
  }, [open, post, editorEl]);

  if (!open) return null;

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  };

  const handleHighlight = (color: string | null) => {
    editorRef.current?.focus();
    // Firefox/older WebKit expose this as 'backColor'; modern Chromium wants
    // 'hiliteColor'. Try the standard one first and fall back.
    const value = color || 'transparent';
    if (!document.execCommand('hiliteColor', false, value)) {
      document.execCommand('backColor', false, value);
    }
    setOpenPicker(null);
  };

  const handleLink = () => {
    const url = window.prompt(t?.linkPrompt || 'Link URL (https://...)');
    if (url) exec('createLink', url);
  };

  const handleSave = () => {
    const html = editorRef.current?.innerHTML?.trim() || '';
    if (!title.trim() || !html) return;
    onSave({ title: title.trim(), content_html: html, tag, is_published: isPublished });
  };

  const footer = (
    <>
    {post && onDelete ? (
      <Button variant="danger" size="sm" onClick={onDelete} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>
        {t?.delete || 'Delete'}
      </Button>
    ) : (
      <span />
    )}
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={onClose}>
        {t?.cancel || 'Cancel'}
      </Button>
      <Button variant="primary" size="sm" onClick={handleSave} loading={saving} disabled={!title.trim()}>
        {post ? (t?.saveChanges || 'Save Changes') : (t?.publishEntry || 'Publish Entry')}
      </Button>
    </div>
    </>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="dialog"
      size="2xl"
      layer="top"
      busy={saving}
      title={post ? (t?.editTitle || 'Edit Changelog Entry') : (t?.newTitle || 'New Changelog Entry')}
      closeButtonAriaLabel={dict?.modal?.close}
      footer={footer}
      footerClassName="gap-3 sm:py-4 text-sm"
      padded
      bodyClassName="space-y-4"
    >
    <Input
      data-autofocus
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      placeholder={t?.titlePlaceholder || "Patch title, e.g. 'The Entity Stirs — Balance Update'"}
      className="px-4 font-bold"
    />

    <div className="flex flex-wrap gap-2">
      {CHANGELOG_TAGS.map((tg) => {
        const theme = CHANGELOG_TAG_THEME[tg];
        const active = tag === tg;
        return (
          <button
            key={tg}
            type="button"
            onClick={() => setTag(tg)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
              active ? theme.badgeClass : 'border-border-color text-text-muted hover:text-text-secondary'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${theme.dotClass}`} />
            {theme.label}
          </button>
        );
      })}
    </div>

    <div className="rounded-xl border border-border-color bg-bg-elevated/50 overflow-hidden">
      <div className="relative flex flex-wrap items-center gap-0.5 border-b border-border-color bg-bg-elevated/80 px-2 py-1.5">
        <ToolbarButton icon={Bold} onClick={() => exec('bold')} label="Bold" />
        <ToolbarButton icon={Italic} onClick={() => exec('italic')} label="Italic" />
        <ToolbarButton icon={Underline} onClick={() => exec('underline')} label="Underline" />
        <ToolbarDivider />
        <ToolbarButton icon={AlignLeft} onClick={() => exec('justifyLeft')} label="Align left" />
        <ToolbarButton icon={AlignCenter} onClick={() => exec('justifyCenter')} label="Align center" />
        <ToolbarButton icon={AlignRight} onClick={() => exec('justifyRight')} label="Align right" />
        <ToolbarButton icon={AlignJustify} onClick={() => exec('justifyFull')} label="Justify" />
        <ToolbarDivider />
        <ToolbarButton icon={Heading3} onClick={() => exec('formatBlock', '<h3>')} label="Heading" />
        <ToolbarButton icon={List} onClick={() => exec('insertUnorderedList')} label="Bullet list" />
        <ToolbarButton icon={ListOrdered} onClick={() => exec('insertOrderedList')} label="Numbered list" />
        <ToolbarButton icon={Link2} onClick={handleLink} label="Link" />
        <ToolbarDivider />
        <div className="relative">
          <ToolbarButton
            icon={Palette}
            onClick={() => setOpenPicker((v) => (v === 'color' ? null : 'color'))}
            label="Text color"
            active={openPicker === 'color'}
          />
          {openPicker === 'color' && (
            <SwatchPopover
              swatches={CHANGELOG_TEXT_COLORS}
              onPick={(c) => {
                exec('foreColor', c);
                setOpenPicker(null);
              }}
            />
          )}
        </div>
        <div className="relative">
          <ToolbarButton
            icon={Highlighter}
            onClick={() => setOpenPicker((v) => (v === 'highlight' ? null : 'highlight'))}
            label="Highlight"
            active={openPicker === 'highlight'}
          />
          {openPicker === 'highlight' && (
            <SwatchPopover
              swatches={CHANGELOG_HIGHLIGHT_COLORS}
              onPick={handleHighlight}
              onClear={() => handleHighlight(null)}
              clearLabel={t?.noHighlight || 'No highlight'}
            />
          )}
        </div>
      </div>

      <div
        ref={setEditor}
        contentEditable
        suppressContentEditableWarning
        className="dbd-changelog-body min-h-[180px] max-h-[40vh] overflow-y-auto px-4 py-3 text-sm text-text-secondary leading-relaxed outline-none [&_h3]:text-base [&_h3]:font-black [&_h3]:text-accent-red [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-accent-red [&_a]:underline"
        data-placeholder={
          t?.bodyPlaceholder ||
          'Describe what changed... use the toolbar to bold key terms, align a callout, or highlight balance notes.'
        }
      />
    </div>

    {error && (
      <p role="alert" className="rounded-xl border border-accent-red/40 bg-accent-red/10 px-3 py-2 type-strong text-accent-red">
        {error}
      </p>
    )}

    <Checkbox checked={isPublished} onChange={setIsPublished} className="type-strong text-text-muted">
      {t?.publishedLabel || 'Published (visible in the "What\'s New?" feed)'}
    </Checkbox>
    </Modal>
  );
};

const ToolbarButton: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  label: string;
  active?: boolean;
}> = ({ icon: Icon, onClick, label, active }) => (
  <button
    type="button"
    {...tip(label, undefined, 'action')} aria-label={label}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors cursor-pointer hover:bg-bg-elevated hover:text-text-primary ${
      active ? 'bg-bg-elevated text-accent-red' : ''
    }`}
  >
    <Icon className="h-3.5 w-3.5" />
  </button>
);

const ToolbarDivider: React.FC = () => <span className="mx-1 h-4 w-px bg-border-color" />;

const SwatchPopover: React.FC<{
  swatches: { name: string; value: string }[];
  onPick: (value: string) => void;
  onClear?: () => void;
  clearLabel?: string;
}> = ({ swatches, onPick, onClear, clearLabel }) => (
  <div className="absolute left-0 top-full z-10 mt-1 flex items-center gap-1.5 rounded-xl border border-border-color bg-bg-elevated p-2 shadow-xl">
    {onClear && (
      <button
        type="button"
        {...tip(clearLabel || 'No highlight', undefined, 'action')} aria-label={clearLabel || 'No highlight'}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClear}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-border-color text-micro text-text-muted cursor-pointer hover:border-accent-red"
      >
        ×
      </button>
    )}
    {swatches.map((c) => (
      <button
        key={c.value}
        type="button"
        {...tip(c.name, undefined, 'action')} aria-label={c.name}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPick(c.value)}
        className="h-6 w-6 rounded-full border border-border-color cursor-pointer hover:scale-110 transition-transform"
        style={{ backgroundColor: c.value }}
      />
    ))}
  </div>
);
