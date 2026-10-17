'use client';
// frontend/src/components/changelog/ChangelogEditorModal.tsx

import React, { useEffect, useId, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { ChangelogPost, ChangelogPostDraft, ChangelogSection } from '@/types/changelog';
import {
  CHANGELOG_BODY_CLASS,
  CHANGELOG_HIGHLIGHT_COLORS,
  CHANGELOG_SECTIONS,
  CHANGELOG_TEXT_COLORS,
} from './changelogTheme';

import { Alert } from '@/components/common/Alert';
import { Modal } from '@/components/common/Modal';
import { RichTextEditor, type RichTextEditorHandle } from '@/components/common/RichTextEditor';
import { Switch } from '@/components/common/Switch';
import { Button } from '@/components/common/Button';
import { FieldLabel, Input } from '@/components/common/Field';
import { useDictionary } from "@/context/DictionaryContext";

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

/** The admin's form for one "What's New?" entry: title, formatted text (RichTextEditor) and a published switch. */
export const ChangelogEditorModal: React.FC<ChangelogEditorModalProps> = ({ open, post, saving = false, error = null, onClose, onSave }) => {
  const dict = useDictionary();
  const t = dict.changelog;
  const titleId = useId();
  const bodyLabelId = useId();
  const editorRef = useRef<RichTextEditorHandle>(null);
  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [initialHtml, setInitialHtml] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  useEffect(() => {
    if (!open) return;
    const draft = post
      ? { title: post.title, content_html: post.content_html, is_published: post.is_published }
      : EMPTY_DRAFT;
    setTitle(draft.title);
    setHtml(draft.content_html);
    setInitialHtml(draft.content_html);
    setIsPublished(draft.is_published);
  }, [open, post]);

  if (!open) return null;

  const handleSave = () => {
    const body = html.trim();
    if (!title.trim() || !body) return;
    onSave({ title: title.trim(), content_html: body, is_published: isPublished });
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
      <FieldLabel label={t.titleLabel} htmlFor={titleId} variant="caps" required>
        <Input
          id={titleId}
          data-autofocus
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="px-4 font-bold"
        />
      </FieldLabel>

      <div className="flex flex-wrap items-center gap-2">
        <span className="type-label-2xs text-text-muted">{t.addSection}</span>
        {CHANGELOG_SECTIONS.map((section: ChangelogSection) => (
          <Button
            key={section}
            size="xs"
            variant="secondary"
            pill
            leftIcon={<Plus className="h-3 w-3" />}
            onClick={() => editorRef.current?.appendSection(t.sections[section])}
          >
            {t.sections[section]}
          </Button>
        ))}
      </div>

      <FieldLabel label={t.bodyLabel} labelId={bodyLabelId} variant="caps" required>
        <RichTextEditor
          ref={editorRef}
          initialHtml={initialHtml}
          onChange={setHtml}
          labels={t.editor}
          textColors={CHANGELOG_TEXT_COLORS}
          highlightColors={CHANGELOG_HIGHLIGHT_COLORS}
          labelledBy={bodyLabelId}
          required
          className={CHANGELOG_BODY_CLASS}
        />
      </FieldLabel>

      {error && <Alert>{error}</Alert>}
    </Modal>
  );
};
