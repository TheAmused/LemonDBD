'use client';
// frontend/src/components/changelog/ChangelogEditorModal.tsx

import React, { useEffect, useRef, useState } from 'react';
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
  X,
  Loader2,
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

export interface ChangelogEditorModalProps {
  open: boolean;
  post: ChangelogPost | null;
  saving?: boolean;
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
  onClose,
  onSave,
  onDelete,
  dict,
}) => {
  const t = dict?.changelog;
  const editorRef = useRef<HTMLDivElement>(null);
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
    if (editorRef.current) editorRef.current.innerHTML = draft.content_html;
  }, [open, post]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

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

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-3xl border-2 border-amber-500/30 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl shadow-black/60 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-black tracking-tight text-slate-100">
            {post ? (t?.editTitle || 'Edit Changelog Entry') : (t?.newTitle || 'New Changelog Entry')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t?.titlePlaceholder || "Patch title, e.g. 'The Entity Stirs — Balance Update'"}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-2.5 text-sm font-bold text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-500/60"
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
                    active ? theme.badgeClass : 'border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${theme.dotClass}`} />
                  {theme.label}
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <div className="relative flex flex-wrap items-center gap-0.5 border-b border-slate-800 bg-slate-900/80 px-2 py-1.5">
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
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="dbd-changelog-body min-h-[180px] max-h-[40vh] overflow-y-auto px-4 py-3 text-sm text-slate-200 leading-relaxed outline-none [&_h3]:text-base [&_h3]:font-black [&_h3]:text-amber-400 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-sky-400 [&_a]:underline"
              data-placeholder={
                t?.bodyPlaceholder ||
                'Describe what changed... use the toolbar to bold key terms, align a callout, or highlight balance notes.'
              }
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 accent-amber-500"
            />
            {t?.publishedLabel || 'Published (visible in the "What\'s New?" feed)'}
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-800 px-6 py-4">
          {post && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t?.delete || 'Delete'}
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              {t?.cancel || 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-xs font-black text-slate-950 shadow-lg shadow-amber-950/40 disabled:opacity-50 disabled:cursor-wait cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {post ? (t?.saveChanges || 'Save Changes') : (t?.publishEntry || 'Publish Entry')}
            </button>
          </div>
        </div>
      </div>
    </div>
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
    title={label}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer hover:bg-slate-800 hover:text-slate-100 ${
      active ? 'bg-slate-800 text-amber-400' : ''
    }`}
  >
    <Icon className="h-3.5 w-3.5" />
  </button>
);

const ToolbarDivider: React.FC = () => <span className="mx-1 h-4 w-px bg-slate-800" />;

const SwatchPopover: React.FC<{
  swatches: { name: string; value: string }[];
  onPick: (value: string) => void;
  onClear?: () => void;
  clearLabel?: string;
}> = ({ swatches, onPick, onClear, clearLabel }) => (
  <div className="absolute left-0 top-full z-10 mt-1 flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-xl">
    {onClear && (
      <button
        type="button"
        title={clearLabel || 'No highlight'}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClear}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-600 text-[9px] text-slate-500 cursor-pointer hover:border-slate-400"
      >
        ×
      </button>
    )}
    {swatches.map((c) => (
      <button
        key={c.value}
        type="button"
        title={c.name}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPick(c.value)}
        className="h-6 w-6 rounded-full border border-white/20 cursor-pointer hover:scale-110 transition-transform"
        style={{ backgroundColor: c.value }}
      />
    ))}
  </div>
);
