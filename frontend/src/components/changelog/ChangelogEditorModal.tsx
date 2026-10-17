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
  Plus,
} from 'lucide-react';
import type { ChangelogPost, ChangelogPostDraft, ChangelogSection } from '@/types/changelog';
import {
  CHANGELOG_BODY_CLASS,
  CHANGELOG_HIGHLIGHT_COLORS,
  CHANGELOG_SECTIONS,
  CHANGELOG_TEXT_COLORS,
} from './changelogTheme';

import { tip } from '@/components/common/Tooltip';
import { Modal } from '@/components/common/Modal';
import { Switch } from '@/components/common/Switch';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { useDictionary } from "@/context/DictionaryContext";
import { Surface } from '@/components/common/Surface';

export interface ChangelogEditorModalProps {
  open: boolean;
  post: ChangelogPost | null;
  saving?: boolean;
  /** Failure message from the last save attempt. */
  error?: string | null;
  onClose: () => void;
  onSave: (draft: ChangelogPostDraft) => void;
}

const EMPTY_DRAFT: ChangelogPostDraft = {
  title: '',
  content_html: '',
  is_published: true,
};

/**
 * A dependency-free WYSIWYG editor for changelog posts. Uses
 * document.execCommand against a contentEditable surface -- deprecated but
 * still broadly supported for this exact use case (bold/italic/underline/
 * color/highlight/alignment/lists), and avoids pulling in a full rich-text
 * library for a handful of formatting actions used by admins only.
 */
export const ChangelogEditorModal: React.FC<ChangelogEditorModalProps> = ({ open, post, saving = false, error = null, onClose, onSave }) => {
  const dict = useDictionary();
  const t = dict.changelog;
  const editorRef = useRef<HTMLDivElement | null>(null);
  // Modal mounts its content one render after `open` flips, so the draft is applied once the editor exists.
  const [editorEl, setEditorEl] = useState<HTMLDivElement | null>(null);
  const setEditor = useCallback((el: HTMLDivElement | null) => {
    editorRef.current = el;
    setEditorEl(el);
  }, []);
  const [title, setTitle] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [openPicker, setOpenPicker] = useState<'color' | 'highlight' | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  // Focus moves into the URL box, which drops the editor's selection; keep it to apply the link afterwards.
  const linkRange = useRef<Range | null>(null);

  useEffect(() => {
    if (!open) return;
    const draft = post
      ? { title: post.title, content_html: post.content_html, is_published: post.is_published }
      : EMPTY_DRAFT;
    setTitle(draft.title);
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
    if (linkOpen) return setLinkOpen(false);
    const sel = window.getSelection();
    const inEditor = sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer);
    linkRange.current = inEditor ? sel.getRangeAt(0).cloneRange() : null;
    setOpenPicker(null);
    setLinkUrl('');
    setLinkOpen(true);
  };

  const applyLink = () => {
    const raw = linkUrl.trim();
    if (!raw) return;
    // Bare domains get https://; anything that is not http(s)/mailto (e.g. javascript:) is refused.
    const url = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    if (!/^(https?:|mailto:)/i.test(url)) return;
    editorRef.current?.focus();
    const range = linkRange.current;
    if (range) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    document.execCommand('createLink', false, url);
    setLinkOpen(false);
  };

  const handleSave = () => {
    const html = editorRef.current?.innerHTML?.trim() || '';
    if (!title.trim() || !html) return;
    onSave({ title: title.trim(), content_html: html, is_published: isPublished });
  };

  // Adds a ready-made section (heading plus an empty bullet list) at the end of the text and puts the caret in
  // its first bullet, so every update lists its changes the same way.
  const insertSection = (section: ChangelogSection) => {
    const editor = editorRef.current;
    if (!editor) return;
    const heading = document.createElement('h3');
    heading.textContent = t.sections[section];
    const list = document.createElement('ul');
    const item = document.createElement('li');
    item.appendChild(document.createElement('br'));
    list.appendChild(item);
    editor.append(heading, list);
    editor.focus();
    const range = document.createRange();
    range.setStart(item, 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    editor.scrollTop = editor.scrollHeight;
  };

  const footer = (
    <>
      <div className="flex items-center gap-2.5 type-strong text-text-muted">
        <Switch checked={isPublished} onChange={setIsPublished} ariaLabel={t.publishedLabel} />
        <span>{isPublished ? t.publishedLabel : t.draftBadge}</span>
      </div>
      <Button
        variant="primary"
        onClick={handleSave}
        loading={saving}
        disabled={!title.trim()}
        className="w-full sm:w-auto sm:min-w-40"
      >
        {t.save}
      </Button>
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
      title={post ? t.editTitle : t.newTitle}
      closeButtonAriaLabel={dict.modal.close}
      footer={footer}
      footerClassName="gap-3 sm:py-4 text-sm"
      padded
      bodyClassName="space-y-4"
    >
    <Input
      data-autofocus
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      placeholder={t.titlePlaceholder}
      className="px-4 font-bold"
    />

    <div className="flex flex-wrap items-center gap-2">
      <span className="type-label-2xs text-text-muted">{t.addSection}</span>
      {CHANGELOG_SECTIONS.map((section) => (
        <Button
          key={section}
          size="xs"
          variant="secondary"
          pill
          leftIcon={<Plus className="h-3 w-3" />}
          onClick={() => insertSection(section)}
        >
          {t.sections[section]}
        </Button>
      ))}
    </div>

    <Surface tone="elevated" padding="none" className="bg-bg-elevated/50 overflow-hidden">
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
        <div className="relative">
          <ToolbarButton icon={Link2} onClick={handleLink} label="Link" active={linkOpen} />
          {linkOpen && (
            <Surface tone="elevated" padding="none" className="absolute left-0 top-full z-10 mt-1 flex w-72 max-w-[80vw] items-center gap-1.5 p-2 shadow-xl">
              <Input
                autoFocus
                fieldSize="sm"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLink();
                  } else if (e.key === 'Escape') {
                    e.stopPropagation();
                    setLinkOpen(false);
                  }
                }}
                placeholder={t.linkPrompt}
                aria-label={t.linkPrompt}
              />
              <Button variant="primary" size="sm" onClick={applyLink} disabled={!linkUrl.trim()}>
                {t.linkApply}
              </Button>
            </Surface>
          )}
        </div>
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
              clearLabel={t.noHighlight}
            />
          )}
        </div>
      </div>

      <div
        ref={setEditor}
        contentEditable
        suppressContentEditableWarning
        className={`min-h-[180px] max-h-[40vh] overflow-y-auto px-4 py-3 outline-none ${CHANGELOG_BODY_CLASS}`}
        data-placeholder={
          t.bodyPlaceholder
        }
      />
    </Surface>

    {error && (
      <p role="alert" className="rounded-card border border-accent-red/40 bg-accent-red/10 px-3 py-2 type-strong text-accent-red">
        {error}
      </p>
    )}
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
    className={`pointer-coarse:min-h-11 pointer-coarse:min-w-11 flex h-7 w-7 items-center justify-center rounded-control text-text-muted transition-colors cursor-pointer hover:bg-bg-elevated hover:text-text-primary ${
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
  <Surface tone="elevated" padding="none" className="absolute left-0 top-full z-10 mt-1 flex items-center gap-1.5 p-2 shadow-xl">
    {onClear && (
      <button
        type="button"
        {...tip(clearLabel || 'No highlight', undefined, 'action')} aria-label={clearLabel || 'No highlight'}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClear}
        className="pointer-coarse:min-h-11 pointer-coarse:min-w-11 flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-border-color text-micro text-text-muted cursor-pointer hover:border-accent-red"
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
        className="pointer-coarse:min-h-11 pointer-coarse:min-w-11 h-6 w-6 rounded-full border border-border-color cursor-pointer hover:scale-110 transition-transform"
        style={{ backgroundColor: c.value }}
      />
    ))}
  </Surface>
);
