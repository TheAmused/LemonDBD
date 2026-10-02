// frontend/src/components/common/RichText.tsx
//
// THE single rich-text formatter. Everything that renders authored text with
// markup - i18n UI strings, perk/add-on/item/offering/power descriptions,
// changelog posts - goes through <RichText>. Styling is NOT guessed from the
// words at runtime: the seed data and locale strings already carry their
// markup, and this component only knows how to render it.
//
// Accepted input (mix freely):
//   * HTML subset  - b strong i em u s del code kbd mark sub sup br hr p ul ol
//                    li blockquote div span a h1-h6, with sanitised
//                    `class` (style tokens), `style` (colour/weight only) and
//                    safe `href`s. Anything else is dropped, text kept.
//   * Style tags   - <brand> <red> <amber> ... and legacy [brand]..[/brand];
//                    every key of STYLE_TOKENS is usable as a tag, a
//                    `class="token"` value or a `[text]{.token}` span.
//   * Markdown     - **bold**, *italic*, _italic_, ~~strike~~, ==mark==,
//                    `code`, [text](url), [text]{.token color=#c33},
//                    and in block mode: "- " / "* " / "• " bullets, "> "
//                    quotes, "# " headings, newline-separated paragraphs.
//   * Colour spans - {red|text}, {amber|text} (any STYLE_TOKENS key) or
//                    {#c33|text} (hex / rgb() / css colour name).
//   * Block lines  - "!! text" renders a notice callout (same as
//                    <p class="notice">).
//   * Entities     - &amp; &lt; &gt; &quot; &#39; &nbsp; &#NN;
//
// The seed encoding for DBD descriptions is the markdown subset above:
//   \n paragraph, "• " bullet, "> " quote, "!! " notice, **value/keyword**,
//   *self-name*, `Input Button`, {color|text}.
//
// Looks live in RICH_VARIANTS (one block per variant): 'ui' for interface
// strings and 'game' for Dead by Daylight descriptions. Add a variant there to
// give another family of text its own look.

import React from 'react';
import { cn } from '@/utils/cn';

/* ------------------------------------------------------------------ *
 * Style registry - the single place class names for text live.
 * ------------------------------------------------------------------ */

/** Inline style tokens: usable as <token>, [token], class="token", {.token}. */
export const STYLE_TOKENS: Readonly<Record<string, string>> = {
  brand: 'font-extrabold text-accent-red tracking-tight',
  red: 'font-bold text-accent-red',
  amber: 'font-bold text-accent-amber',
  green: 'font-bold text-accent-green',
  cyan: 'font-bold text-accent-cyan',
  emerald: 'font-bold text-accent-green',
  rose: 'font-bold text-accent-rose',
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  muted: 'text-text-muted',
  name: 'italic font-bold text-text-primary',
  // Legacy wiki spans that may still appear in scraped text.
  FlavorText: 'italic text-text-secondary',
  ReminderText: 'text-text-muted',
  Highlight: 'font-bold text-accent-amber',
};

interface RichVariant {
  strong: string;
  em: string;
  kbd: string;
  code: string;
  mark: string;
  link: string;
  p: (compact: boolean) => string;
  ul: (compact: boolean) => string;
  li: (compact: boolean) => string;
  quote: (compact: boolean) => string;
  notice: string;
  noticeLabel: string;
  /** "# " section heading (block mode). */
  heading: string;
}

const NONE = '';

export const RICH_VARIANTS: Readonly<Record<'ui' | 'game', RichVariant>> = {
  ui: {
    strong: 'font-bold text-text-primary',
    em: 'italic',
    kbd: 'px-1 rounded border border-border-color bg-bg-elevated text-relative-sm',
    code: 'px-1 rounded bg-bg-elevated text-relative',
    mark: 'bg-accent-amber/25 rounded px-0.5',
    link: 'text-accent-red underline underline-offset-2 hover:opacity-80',
    p: () => NONE,
    ul: () => NONE,
    li: () => NONE,
    quote: () => 'border-l-2 border-border-color pl-3 italic text-text-secondary',
    notice: 'rounded-xl border border-accent-amber/30 bg-accent-amber/10 p-3 text-accent-amber',
    heading: 'mt-3 first:mt-0 font-bold text-text-primary',
    noticeLabel: 'mr-2 rounded-lg bg-accent-amber/25 px-2 py-0.5 text-tiny font-bold uppercase tracking-wider',
  },
  game: {
    strong: 'font-bold text-accent-amber drop-shadow-xs',
    em: 'italic text-text-secondary',
    kbd: 'inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md text-tiny sm:text-mini font-bold bg-bg-elevated border border-accent-amber/50 text-accent-amber shadow-xs align-baseline whitespace-nowrap',
    code: 'inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md text-tiny sm:text-mini font-bold bg-bg-elevated border border-accent-amber/50 text-accent-amber shadow-xs align-baseline whitespace-nowrap',
    mark: 'bg-accent-amber/25 rounded px-0.5',
    link: 'text-accent-amber underline underline-offset-2 hover:opacity-80',
    p: (c) => cn('leading-relaxed text-text-secondary', c ? 'mb-1 text-xs' : 'mb-2.5 text-xs sm:text-sm'),
    ul: (c) => cn('list-disc pl-5', c ? 'my-1 space-y-0.5' : 'my-2 space-y-1'),
    li: (c) => cn('leading-relaxed text-text-secondary marker:text-accent-amber', c ? 'text-xs' : 'text-xs sm:text-sm'),
    quote: (c) =>
      cn(
        'rounded-2xl border-l-3 border-accent-amber/90 bg-gradient-to-r from-accent-amber/10 via-bg-primary/80 to-transparent px-3.5 py-2.5 italic text-left text-text-secondary shadow-inner',
        c ? 'my-1.5 text-mini' : 'my-3 text-xs sm:text-sm'
      ),
    notice: 'p-3 my-2 text-left text-left rounded-2xl bg-accent-amber/10 border border-accent-amber/30 text-xs font-semibold text-accent-amber flex items-start gap-2.5 shadow-sm',
    heading: 'mt-4 first:mt-0 mb-1 text-left text-mini font-black uppercase tracking-spaced-sm text-accent-amber',
    noticeLabel: 'shrink-0 font-bold uppercase tracking-wider text-tiny bg-accent-amber/25 px-2 py-0.5 rounded-lg text-accent-amber',
  },
};

export type RichVariantName = keyof typeof RICH_VARIANTS;

/** Inline CSS the author may set. Everything else is discarded. */
const ALLOWED_STYLE_PROPS: Readonly<Record<string, string>> = {
  color: 'color',
  'background-color': 'backgroundColor',
  'font-weight': 'fontWeight',
  'font-style': 'fontStyle',
  'text-decoration': 'textDecoration',
  'text-align': 'textAlign',
};
const SAFE_STYLE_VALUE = /^[#a-zA-Z0-9(),.%\s-]+$/;
const SAFE_HREF = /^(?:https?:|mailto:|\/|#)/i;

const ALLOWED_TAGS = new Set([
  'b', 'strong', 'i', 'em', 'u', 's', 'del', 'code', 'kbd', 'mark', 'sub', 'sup',
  'br', 'hr', 'p', 'ul', 'ol', 'li', 'blockquote', 'div', 'span', 'a',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
]);
const VOID_TAGS = new Set(['br', 'hr']);
const BLOCK_TAGS = new Set(['p', 'ul', 'ol', 'blockquote', 'div', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/* ------------------------------------------------------------------ *
 * Parsing: text -> tree
 * ------------------------------------------------------------------ */

interface TextNode { text: string }
interface ElNode { tag: string; attrs: Record<string, string>; kids: Node[] }
type Node = TextNode | ElNode;
const isEl = (n: Node): n is ElNode => 'tag' in n;

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s[^<>]*?)?)\s*(\/?)>/g;
const ATTR_RE = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

const isStyleToken = (name: string) => Object.prototype.hasOwnProperty.call(STYLE_TOKENS, name);
const findToken = (name: string) =>
  isStyleToken(name) ? name : Object.keys(STYLE_TOKENS).find((k) => k.toLowerCase() === name.toLowerCase());

function parseAttrs(src: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of src.matchAll(ATTR_RE)) attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? '';
  return attrs;
}

function parseTree(input: string): ElNode {
  // [brand]x[/brand] -> <brand>x</brand> for every registered token.
  const src = input.replace(/\[(\/?)([A-Za-z]+)\]/g, (m, slash, name) =>
    findToken(name) ? `<${slash}${findToken(name)}>` : m
  );

  const root: ElNode = { tag: '#root', attrs: {}, kids: [] };
  const stack: ElNode[] = [root];
  let last = 0;

  const pushText = (t: string) => {
    if (t) stack[stack.length - 1].kids.push({ text: t });
  };

  for (const m of src.matchAll(TAG_RE)) {
    pushText(src.slice(last, m.index));
    last = (m.index ?? 0) + m[0].length;

    const closing = m[1] === '/';
    const raw = m[2];
    const tag = findToken(raw) ?? raw.toLowerCase();
    if (!ALLOWED_TAGS.has(tag) && !isStyleToken(tag)) continue; // unknown tag: drop it, keep content

    if (closing) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const el: ElNode = { tag, attrs: parseAttrs(m[3] || ''), kids: [] };
    stack[stack.length - 1].kids.push(el);
    if (!VOID_TAGS.has(tag) && m[4] !== '/') stack.push(el);
  }
  pushText(src.slice(last));
  return root;
}

/* ------------------------------------------------------------------ *
 * Rendering helpers
 * ------------------------------------------------------------------ */

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s: string) =>
  s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (m, dec, hex, name) => {
    if (dec) return String.fromCodePoint(Number(dec));
    if (hex) return String.fromCodePoint(parseInt(hex, 16));
    return ENTITIES[name.toLowerCase()] ?? m;
  });

function sanitizeStyle(src: string | undefined): React.CSSProperties | undefined {
  if (!src) return undefined;
  const out: Record<string, string> = {};
  for (const decl of src.split(';')) {
    const [prop, ...rest] = decl.split(':');
    const key = ALLOWED_STYLE_PROPS[prop?.trim().toLowerCase()];
    const value = rest.join(':').trim();
    if (key && value && SAFE_STYLE_VALUE.test(value)) out[key] = value;
  }
  return Object.keys(out).length ? (out as React.CSSProperties) : undefined;
}

function tokenClasses(classAttr: string | undefined): string {
  return (classAttr || '')
    .split(/\s+/)
    .map((c) => (findToken(c) ? STYLE_TOKENS[findToken(c) as string] : ''))
    .filter(Boolean)
    .join(' ');
}

interface Ctx {
  v: RichVariant;
  compact: boolean;
  noticeLabel: string;
}

/** Inline markdown inside one text run. */
const INLINE_MD = new RegExp(
  [
    '`[^`\\n]+`',
    '\\*\\*[^*\\n]+?\\*\\*',
    '~~[^~\\n]+?~~',
    '==[^=\\n]+?==',
    '\\[[^\\]\\n]+\\]\\([^)\\s]+\\)',
    '\\[[^\\]\\n]+\\]\\{[^}\\n]+\\}',
    '\\{[#A-Za-z0-9(),.%\\s-]+\\|[^{}\\n]+\\}',
    '(?<![\\w*])\\*(?:\\*\\*[^*\\n]+?\\*\\*|[^*\\n])+?\\*(?![\\w*])',
    '(?<!\\w)_[^_\\n]+?_(?!\\w)',
  ].map((p) => `(${p})`).join('|'),
  'g'
);

function renderText(raw: string, ctx: Ctx, key: string): React.ReactNode[] {
  const text = decode(raw);
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE_MD)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    last = idx + m[0].length;
    const tok = m[0];
    const k = `${key}-m${i++}`;
    if (tok.startsWith('`')) out.push(<code key={k} className={ctx.v.code}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('**')) out.push(<strong key={k} className={ctx.v.strong}>{renderText(tok.slice(2, -2), ctx, k)}</strong>);
    else if (tok.startsWith('{')) {
      const sep = tok.indexOf('|');
      const colorKey = tok.slice(1, sep).trim();
      const token = findToken(colorKey);
      const style = token ? undefined : sanitizeStyle(`color:${colorKey}`);
      out.push(
        <span key={k} className={token ? STYLE_TOKENS[token] : undefined} style={style}>
          {renderText(tok.slice(sep + 1, -1), ctx, k)}
        </span>
      );
    }
    else if (tok.startsWith('~~')) out.push(<s key={k}>{renderText(tok.slice(2, -2), ctx, k)}</s>);
    else if (tok.startsWith('==')) out.push(<mark key={k} className={ctx.v.mark}>{renderText(tok.slice(2, -2), ctx, k)}</mark>);
    else if (tok.startsWith('[')) {
      const link = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (link) {
        out.push(
          SAFE_HREF.test(link[2])
            ? <a key={k} href={link[2]} target="_blank" rel="noopener noreferrer" className={ctx.v.link}>{link[1]}</a>
            : link[1]
        );
      } else {
        const span = tok.match(/^\[([^\]]+)\]\{([^}]+)\}$/);
        if (span) {
          const classes: string[] = [];
          const style: string[] = [];
          for (const part of span[2].trim().split(/\s+/)) {
            if (part.startsWith('.')) classes.push(part.slice(1));
            else if (part.includes('=')) style.push(`${part.split('=')[0] === 'bg' ? 'background-color' : part.split('=')[0]}:${part.split('=')[1]}`);
          }
          out.push(
            <span key={k} className={tokenClasses(classes.join(' '))} style={sanitizeStyle(style.join(';'))}>
              {renderText(span[1], ctx, k)}
            </span>
          );
        }
      }
    } else out.push(<em key={k} className={ctx.v.em}>{renderText(tok.slice(1, -1), ctx, k)}</em>);
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderInline(nodes: Node[], ctx: Ctx, key: string): React.ReactNode[] {
  return nodes.map((n, i) => {
    const k = `${key}-${i}`;
    if (!isEl(n)) return <React.Fragment key={k}>{renderText(n.text, ctx, k)}</React.Fragment>;
    return renderEl(n, ctx, k);
  });
}

function renderEl(el: ElNode, ctx: Ctx, key: string): React.ReactNode {
  const kids = () => renderInline(el.kids, ctx, key);
  const style = sanitizeStyle(el.attrs.style);
  const cls = tokenClasses(el.attrs.class);
  const { v } = ctx;

  if (isStyleToken(el.tag)) return <span key={key} className={STYLE_TOKENS[el.tag]}>{kids()}</span>;

  switch (el.tag) {
    case 'br': return <br key={key} />;
    case 'hr': return <hr key={key} className="my-3 border-border-color" />;
    case 'b': case 'strong': return <strong key={key} className={cn(v.strong, cls)} style={style}>{kids()}</strong>;
    case 'i': case 'em': return <em key={key} className={cn(v.em, cls)} style={style}>{kids()}</em>;
    case 'kbd': return <kbd key={key} className={v.kbd}>{kids()}</kbd>;
    case 'code': return <code key={key} className={v.code}>{kids()}</code>;
    case 'mark': return <mark key={key} className={v.mark}>{kids()}</mark>;
    case 'u': return <u key={key} style={style}>{kids()}</u>;
    case 's': case 'del': return <s key={key}>{kids()}</s>;
    case 'sub': return <sub key={key}>{kids()}</sub>;
    case 'sup': return <sup key={key}>{kids()}</sup>;
    case 'a': {
      const href = el.attrs.href;
      if (!href || !SAFE_HREF.test(href)) return <span key={key}>{kids()}</span>;
      const external = /^https?:/i.test(href);
      return (
        <a key={key} href={href} className={v.link} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {kids()}
        </a>
      );
    }
    case 'span': return <span key={key} className={cls || undefined} style={style}>{kids()}</span>;
    case 'p': return renderParagraph(el, ctx, key);
    case 'ul': case 'ol': {
      const List = el.tag as 'ul' | 'ol';
      return (
        <List key={key} className={cn(v.ul(ctx.compact), el.tag === 'ol' && 'list-decimal')}>
          {el.kids.map((c, i) =>
            isEl(c) && c.tag === 'li'
              ? <li key={`${key}-${i}`} className={v.li(ctx.compact)}>{renderInline(c.kids, ctx, `${key}-${i}`)}</li>
              : null
          )}
        </List>
      );
    }
    case 'li': return <li key={key} className={v.li(ctx.compact)}>{kids()}</li>;
    case 'blockquote': return <blockquote key={key} className={v.quote(ctx.compact)}>{kids()}</blockquote>;
    case 'div': return <div key={key} className={cls || undefined} style={style}>{kids()}</div>;
    default: {
      const H = el.tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      return <H key={key} style={style}>{kids()}</H>;
    }
  }
}

function renderParagraph(el: ElNode, ctx: Ctx, key: string): React.ReactNode {
  const { v } = ctx;
  const kids = renderInline(el.kids, ctx, key);
  if (el.attrs.class?.split(/\s+/).includes('notice')) {
    return (
      <div key={key} className={v.notice}>
        <span className={v.noticeLabel}>{ctx.noticeLabel}</span>
        <span className="leading-relaxed">{kids}</span>
      </div>
    );
  }
  return <p key={key} className={v.p(ctx.compact) || undefined}>{kids}</p>;
}

/* ------------------------------------------------------------------ *
 * Block layout (block mode): paragraphs, markdown bullets / quotes / headings
 * ------------------------------------------------------------------ */

function renderBlocks(nodes: Node[], ctx: Ctx, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let run: Node[][] = [[]]; // paragraphs of inline nodes
  let bullets: Node[][] = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    out.push(
      <ul key={`${key}-ul${out.length}`} className={ctx.v.ul(ctx.compact)}>
        {bullets.map((b, i) => (
          <li key={i} className={ctx.v.li(ctx.compact)}>{renderInline(b, ctx, `${key}-b${out.length}-${i}`)}</li>
        ))}
      </ul>
    );
    bullets = [];
  };

  const stripPrefix = (para: Node[], re: RegExp): Node[] => {
    const [first, ...rest] = para;
    return first && !isEl(first) ? [{ text: first.text.replace(re, '') }, ...rest] : para;
  };

  const flushRun = () => {
    for (const para of run) {
      const meaningful = para.some((n) => isEl(n) || n.text.trim());
      if (!meaningful) continue;
      const first = para[0] && !isEl(para[0]) ? para[0].text : '';
      const k = `${key}-p${out.length}`;
      if (/^\s*[-*•]\s+/.test(first)) { bullets.push(stripPrefix(para, /^\s*[-*•]\s+/)); continue; }
      flushBullets();
      if (/^\s*!!\s+/.test(first)) {
        out.push(
          <div key={k} className={ctx.v.notice}>
            <span className={ctx.v.noticeLabel}>{ctx.noticeLabel}</span>
            <span className="leading-relaxed">{renderInline(stripPrefix(para, /^\s*!!\s+/), ctx, k)}</span>
          </div>
        );
      } else if (/^\s*>\s?/.test(first)) {
        out.push(<blockquote key={k} className={ctx.v.quote(ctx.compact)}>{renderInline(stripPrefix(para, /^\s*>\s?/), ctx, k)}</blockquote>);
      } else if (/^\s*#{1,6}\s+/.test(first)) {
        out.push(<p key={k} className={ctx.v.heading}>{renderInline(stripPrefix(para, /^\s*#{1,6}\s+/), ctx, k)}</p>);
      } else {
        out.push(<p key={k} className={ctx.v.p(ctx.compact) || undefined}>{renderInline(para, ctx, k)}</p>);
      }
    }
    flushBullets();
    run = [[]];
  };

  const current = () => run[run.length - 1];

  nodes.forEach((n) => {
    if (!isEl(n)) {
      n.text.split(/\r?\n/).forEach((line, i) => {
        if (i > 0) run.push([]);
        if (line) current().push({ text: line });
      });
      return;
    }
    if (n.tag === 'br') { run.push([]); return; }
    if (BLOCK_TAGS.has(n.tag)) {
      flushRun();
      const k = `${key}-e${out.length}`;
      if (n.tag === 'div' && !n.attrs.style && !n.attrs.class) out.push(...renderBlocks(n.kids, ctx, k));
      else out.push(renderEl(n, ctx, k));
      return;
    }
    current().push(n);
  });
  flushRun();
  return out;
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

export interface RichTextProps {
  text?: string | null;
  className?: string;
  /** Lay out paragraphs / lists / quotes (descriptions, posts). Default: inline. */
  block?: boolean;
  /** Which look to use. Default 'ui'; use 'game' for DBD descriptions. */
  variant?: RichVariantName;
  compact?: boolean;
  /** Label of the `<p class="notice">` callout. */
  noticeLabel?: string;
}

export const RichText: React.FC<RichTextProps> = ({
  text,
  className,
  block = false,
  variant = 'ui',
  compact = false,
  noticeLabel = 'Notice',
}) => {
  if (!text) return null;

  const ctx: Ctx = { v: RICH_VARIANTS[variant], compact, noticeLabel };
  const tree = parseTree(text);
  const content = block ? renderBlocks(tree.kids, ctx, 'rt') : renderInline(tree.kids, ctx, 'rt');

  if (!className) return <>{content}</>;
  return block ? <div className={className}>{content}</div> : <span className={className}>{content}</span>;
};
