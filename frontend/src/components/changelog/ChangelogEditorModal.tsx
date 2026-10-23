'use client';
// frontend/src/components/changelog/ChangelogEditorModal.tsx

import React, { useId, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { ChangelogPost, ChangelogPostDraft } from '@/types/changelog';
import {
  CHANGELOG_BODY_CLASS,
  CHANGELOG_SECTIONS,
  changelogHighlightColors,
  changelogTextColors,
} from './changelogTheme';

import { Alert } from '@/components/common/Alert';
import { Modal } from '@/components/common/Modal';
import { RichTextEditor, type RichTextEditorHandle } from '@/components/common/RichTextEditor';
import { Switch } from '@/components/common/Switch';
import { Button } from '@/components/common/Button';
import { FormField, Input } from '@/components/common/Field';
import { useDictionary } from "@/context/DictionaryContext";
import { useOnValueChange } from '@/hooks/useOnValueChange';

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

export const ChangelogEditorModal: React.FC<ChangelogEditorModalProps> = ({ open, post, saving = false, error = null, onClose, onSave }) => {
  const dict = useDictionary();
  const t = dict.changelog;
  const titleId = useId();
  const bodyLabelId = useId();
  const textColors = useMemo(() => changelogTextColors(), []);
  const highlightColors = useMemo(() => changelogHighlightColors(), []);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const draftOf = (p: ChangelogPost | null | undefined) =>
    p ? { title: p.title, content_html: p.content_html, is_published: p.is_published } : EMPTY_DRAFT;
  const [title, setTitle] = useState(() => (open ? draftOf(post).title : ''));
  const [html, setHtml] = useState(() => (open ? draftOf(post).content_html : ''));
  const [initialHtml, setInitialHtml] = useState(() => (open ? draftOf(post).content_html : ''));
  const [isPublished, setIsPublished] = useState(() => (open ? draftOf(post).is_published : true));

  // Each opening (or another post while open) loads that post, or a blank draft.
  useOnValueChange(open ? (post ?? 'new') : null, () => {
    if (!open) return;
    const draft = draftOf(post);
    setTitle(draft.title);
    setHtml(draft.content_html);
    setInitialHtml(draft.content_html);
    setIsPublished(draft.is_published);
  });

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
      <FormField label={t.titleLabel} htmlFor={titleId} required>
        <Input
          id={titleId}
          data-autofocus
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="px-4 font-bold"
        />
      </FormField>

      <div className="flex flex-wrap items-center gap-2">
        <span className="type-label-2xs text-text-muted">{t.addSection}</span>
        {CHANGELOG_SECTIONS.map((section) => (
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

      <FormField label={t.bodyLabel} labelId={bodyLabelId} required>
        <RichTextEditor
          ref={editorRef}
          initialHtml={initialHtml}
          onChange={setHtml}
          labels={t.editor}
          textColors={textColors}
          highlightColors={highlightColors}
          labelledBy={bodyLabelId}
          required
          className={CHANGELOG_BODY_CLASS}
        />
      </FormField>

      {error && <Alert>{error}</Alert>}
    </Modal>
  );
};
