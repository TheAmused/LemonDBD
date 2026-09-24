// frontend/src/components/common/RichText.tsx
import React from 'react';

/**
 * Regex matching rich inline formatting tags and Markdown-like delimiters in i18n locale strings:
 * - `<brand>...</brand>` or `[brand]...[/brand]` -> Bold red brand accent
 * - `<red>...</red>` or `[red]...[/red]` -> Accent red text
 * - `<b>...</b>` or `**...**` -> Bold primary text
 * - `<i>...</i>` or `*...*` -> Italic emphasized text
 */
const RICH_TAG_REGEX = /(<brand>[\s\S]*?<\/brand>|\[brand\][\s\S]*?\[\/brand\]|<red>[\s\S]*?<\/red>|\[red\][\s\S]*?\[\/red\]|<b>[\s\S]*?<\/b>|\*\*[\s\S]*?\*\*|<i>[\s\S]*?<\/i>|\*[\s\S]*?\*)/g;

export interface RichTextProps {
  text?: string | null;
  className?: string;
}

/**
 * Universal RichText component for rendering localized strings with semantic tags.
 * Avoids hardcoding multilingual terms and grammatical inflections inside TSX code.
 */
export const RichText: React.FC<RichTextProps> = ({ text, className }) => {
  if (!text) return null;

  const parts = text.split(RICH_TAG_REGEX);

  const renderedContent = parts.map((part, index) => {
    if (!part) return null;

    // 1. Brand tag: <brand>LemonDBD</brand> or [brand]LemonDBD[/brand]
    if (
      (part.startsWith('<brand>') && part.endsWith('</brand>')) ||
      (part.startsWith('[brand]') && part.endsWith('[/brand]'))
    ) {
      const content = part.startsWith('<brand>') ? part.slice(7, -8) : part.slice(7, -8);
      return (
        <strong key={index} className="font-extrabold text-accent-red tracking-tight">
          {content}
        </strong>
      );
    }

    // 2. Red tag: <red>text</red> or [red]text[/red]
    if (
      (part.startsWith('<red>') && part.endsWith('</red>')) ||
      (part.startsWith('[red]') && part.endsWith('[/red]'))
    ) {
      const content = part.startsWith('<red>') ? part.slice(5, -6) : part.slice(5, -6);
      return (
        <span key={index} className="font-bold text-accent-red">
          {content}
        </span>
      );
    }

    // 3. Bold tag: <b>text</b> or **text**
    if (
      (part.startsWith('<b>') && part.endsWith('</b>')) ||
      (part.startsWith('**') && part.endsWith('**') && part.length > 4)
    ) {
      const content = part.startsWith('<b>') ? part.slice(3, -4) : part.slice(2, -2);
      return (
        <strong key={index} className="font-bold text-text-primary">
          {content}
        </strong>
      );
    }

    // 4. Italic tag: <i>text</i> or *text*
    if (
      (part.startsWith('<i>') && part.endsWith('</i>')) ||
      (part.startsWith('*') && part.endsWith('*') && part.length > 2)
    ) {
      const content = part.startsWith('<i>') ? part.slice(3, -4) : part.slice(1, -1);
      return (
        <em key={index} className="italic">
          {content}
        </em>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });

  if (!className) {
    return <>{renderedContent}</>;
  }

  return <span className={className}>{renderedContent}</span>;
};
