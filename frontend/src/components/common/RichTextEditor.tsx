'use client';
// frontend/src/components/common/RichTextEditor.tsx
//
// THE rich-text editor: a toolbar over a contentEditable that writes the HTML subset <RichText> renders.
// It uses document.execCommand (deprecated, but supported everywhere) instead of an editor library. Its HTML is
// NOT safe by itself: the server sanitises it before storing (see sanitize_changelog_html).
//
// `initialHtml` is applied on mount and whenever it changes, so pass the saved value; the live HTML comes back
// through `onChange`.

import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { ColorSwatch } from '@/components/common/ColorSwatch';
import { Input } from '@/components/common/Field';
import { Popover, popoverTriggerProps } from '@/components/common/Popover';
import { Surface } from '@/components/common/Surface';
import { tip } from '@/components/common/Tooltip';
import { cn } from '@/utils/cn';

export interface RichTextEditorLabels {
  bold: string;
  italic: string;
  underline: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  justify: string;
  heading: string;
  bulletList: string;
  numberedList: string;
  link: string;
  linkPrompt: string;
  linkApply: string;
  textColor: string;
  highlight: string;
  noHighlight: string;
}

export interface RichTextEditorSwatch {
  name: string;
  value: string;
}

export interface RichTextEditorHandle {
  /** Appends `heading` plus an empty bullet list and puts the caret in the first bullet. */
  appendSection: (heading: string) => void;
}

export interface RichTextEditorProps {
  initialHtml: string;
  onChange: (html: string) => void;
  labels: RichTextEditorLabels;
  textColors: readonly RichTextEditorSwatch[];
  highlightColors: readonly RichTextEditorSwatch[];
  labelledBy?: string;
  required?: boolean;
  /** Classes of the writing area: how the text looks (the reader's view should use the same). */
  className?: string;
  ref?: React.Ref<RichTextEditorHandle>;
}

type Panel = 'color' | 'highlight' | 'link';

export function RichTextEditor({
  initialHtml,
  onChange,
  labels,
  textColors,
  highlightColors,
  labelledBy,
  required = false,
  className,
  ref,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  // The host (a Modal) may mount its content one render late, so the HTML is applied once the surface exists.
  const [editorEl, setEditorEl] = useState<HTMLDivElement | null>(null);
  const setEditor = useCallback((el: HTMLDivElement | null) => {
    editorRef.current = el;
    setEditorEl(el);
  }, []);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  // Focus moves into the URL box, which drops the editor's selection; keep it to apply the link afterwards.
  const linkRange = useRef<Range | null>(null);
  const colorAnchor = useRef<HTMLDivElement>(null);
  const highlightAnchor = useRef<HTMLDivElement>(null);
  const linkAnchor = useRef<HTMLDivElement>(null);

  // `editorEl` only signals that the surface exists; the DOM is written through the ref.
  useEffect(() => {
    if (editorEl && editorRef.current) editorRef.current.innerHTML = initialHtml;
  }, [editorEl, initialHtml]);

  const emitChange = () => onChange(editorRef.current?.innerHTML ?? '');

  useImperativeHandle(ref, () => ({
    appendSection(heading: string) {
      const editor = editorRef.current;
      if (!editor) return;
      const title = document.createElement('h3');
      title.textContent = heading;
      const list = document.createElement('ul');
      const item = document.createElement('li');
      item.appendChild(document.createElement('br'));
      list.appendChild(item);
      editor.append(title, list);
      editor.focus();
      const range = document.createRange();
      range.setStart(item, 0);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      editor.scrollTop = editor.scrollHeight;
      emitChange();
    },
  }));

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    emitChange();
  };

  const applyColor = (color: string) => {
    exec('foreColor', color);
    setPanel(null);
  };

  const applyHighlight = (color: string | null) => {
    editorRef.current?.focus();
    // Firefox/older WebKit expose this as 'backColor'; modern Chromium wants 'hiliteColor'.
    const value = color || 'transparent';
    if (!document.execCommand('hiliteColor', false, value)) document.execCommand('backColor', false, value);
    emitChange();
    setPanel(null);
  };

  const toggleLink = () => {
    if (panel === 'link') return setPanel(null);
    const sel = window.getSelection();
    const inEditor = sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer);
    linkRange.current = inEditor ? sel.getRangeAt(0).cloneRange() : null;
    setLinkUrl('');
    setPanel('link');
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
    exec('createLink', url);
    setPanel(null);
  };

  const closePanel = () => setPanel(null);
  const panelClassName = 'rounded-card border border-border-color bg-bg-surface p-2 shadow-xl';

  return (
    <Surface tone="elevated" padding="none" className="overflow-hidden bg-bg-elevated/50">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border-color bg-bg-elevated/80 px-2 py-1.5">
        <ToolbarButton icon={Bold} onClick={() => exec('bold')} label={labels.bold} />
        <ToolbarButton icon={Italic} onClick={() => exec('italic')} label={labels.italic} />
        <ToolbarButton icon={Underline} onClick={() => exec('underline')} label={labels.underline} />
        <ToolbarDivider />
        <ToolbarButton icon={AlignLeft} onClick={() => exec('justifyLeft')} label={labels.alignLeft} />
        <ToolbarButton icon={AlignCenter} onClick={() => exec('justifyCenter')} label={labels.alignCenter} />
        <ToolbarButton icon={AlignRight} onClick={() => exec('justifyRight')} label={labels.alignRight} />
        <ToolbarButton icon={AlignJustify} onClick={() => exec('justifyFull')} label={labels.justify} />
        <ToolbarDivider />
        <ToolbarButton icon={Heading3} onClick={() => exec('formatBlock', '<h3>')} label={labels.heading} />
        <ToolbarButton icon={List} onClick={() => exec('insertUnorderedList')} label={labels.bulletList} />
        <ToolbarButton icon={ListOrdered} onClick={() => exec('insertOrderedList')} label={labels.numberedList} />
        <div ref={linkAnchor}>
          <ToolbarButton
            icon={Link2}
            onClick={toggleLink}
            label={labels.link}
            active={panel === 'link'}
            {...popoverTriggerProps(panel === 'link', 'true')}
          />
        </div>
        <Popover
          open={panel === 'link'}
          anchorRef={linkAnchor}
          onClose={closePanel}
          as="fieldset"
          ariaLabel={labels.link}
          className={cn(panelClassName, 'flex w-72 max-w-viewport-sm items-center gap-1.5')}
        >
          <Input
            data-autofocus
            fieldSize="sm"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              }
            }}
            placeholder={labels.linkPrompt}
            aria-label={labels.linkPrompt}
          />
          <Button variant="primary" size="sm" onClick={applyLink} disabled={!linkUrl.trim()}>
            {labels.linkApply}
          </Button>
        </Popover>
        <ToolbarDivider />
        <div ref={colorAnchor}>
          <ToolbarButton
            icon={Palette}
            onClick={() => setPanel(panel === 'color' ? null : 'color')}
            label={labels.textColor}
            active={panel === 'color'}
            {...popoverTriggerProps(panel === 'color', 'true')}
          />
        </div>
        <Popover
          open={panel === 'color'}
          anchorRef={colorAnchor}
          onClose={closePanel}
          as="fieldset"
          ariaLabel={labels.textColor}
          className={cn(panelClassName, 'flex items-center gap-1.5')}
        >
          {textColors.map((c) => (
            <Swatch key={c.value} swatch={c} onPick={applyColor} />
          ))}
        </Popover>
        <div ref={highlightAnchor}>
          <ToolbarButton
            icon={Highlighter}
            onClick={() => setPanel(panel === 'highlight' ? null : 'highlight')}
            label={labels.highlight}
            active={panel === 'highlight'}
            {...popoverTriggerProps(panel === 'highlight', 'true')}
          />
        </div>
        <Popover
          open={panel === 'highlight'}
          anchorRef={highlightAnchor}
          onClose={closePanel}
          as="fieldset"
          ariaLabel={labels.highlight}
          className={cn(panelClassName, 'flex items-center gap-1.5')}
        >
          <Button
            variant="secondary"
            size="xs"
            icon
            pill
            dashed
            {...tip(labels.noHighlight, undefined, 'action')}
            aria-label={labels.noHighlight}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyHighlight(null)}
          >
            ×
          </Button>
          {highlightColors.map((c) => (
            <Swatch key={c.value} swatch={c} onPick={applyHighlight} />
          ))}
        </Popover>
      </div>

      <div
        ref={setEditor}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-required={required || undefined}
        aria-labelledby={labelledBy}
        onInput={emitChange}
        className={cn('min-h-45 max-h-vh-40 overflow-y-auto px-4 py-3 outline-none', className)}
      />
    </Surface>
  );
}

const ToolbarButton: React.FC<
  { icon: React.ComponentType<{ className?: string }>; label: string; active?: boolean } & Omit<
    React.ComponentProps<typeof Button>,
    'children' | 'variant' | 'size' | 'icon'
  >
> = ({ icon: Icon, label, active = false, ...rest }) => (
  <Button
    variant={active ? 'soft' : 'ghost'}
    size="sm"
    icon
    {...tip(label, undefined, 'action')}
    aria-label={label}
    // Keep the text selection in the editor while the button is pressed.
    onMouseDown={(e) => e.preventDefault()}
    {...rest}
  >
    <Icon className="h-3.5 w-3.5" />
  </Button>
);

const ToolbarDivider: React.FC = () => <span className="mx-1 h-4 w-px bg-border-color" aria-hidden="true" />;

const Swatch: React.FC<{ swatch: RichTextEditorSwatch; onPick: (value: string) => void }> = ({ swatch, onPick }) => (
  <ColorSwatch
    size="sm"
    {...tip(swatch.name, undefined, 'action')}
    aria-label={swatch.name}
    style={{ backgroundColor: swatch.value }}
    onMouseDown={(e) => e.preventDefault()}
    onClick={() => onPick(swatch.value)}
  />
);
