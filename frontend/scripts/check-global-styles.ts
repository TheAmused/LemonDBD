// frontend/scripts/check-global-styles.ts
import fs from "node:fs";
import { readGlobalCss } from "./lib/globalCss";
import { Project, SyntaxKind, Node } from "ts-morph";

const isStrict = process.argv.includes("--strict");

const project = new Project();
project.addSourceFilesAtPaths("src/**/*.{tsx,jsx}");

const GLOBALS_CSS_PATH = "src/app/globals.css";

/**
 * The project's own design-token color names, read live from the `@theme`
 * block in app/globals.css (e.g. `--color-accent-red: ...;` -> `accent-red`).
 * These are the only "color words" allowed on a Tailwind color utility --
 * every other color word is either one of Tailwind's stock palette names
 * (`slate`, `amber`, ...) or a bare keyword (`black`, `white`), and either
 * way it bypasses the token file this project actually maintains.
 */
function readProjectColorTokens(): Set<string> {
  try {
    const css = readGlobalCss(GLOBALS_CSS_PATH);
    const names = new Set<string>();
    for (const m of css.matchAll(/--color-([a-zA-Z0-9-]+)\s*:/g)) {
      names.add(m[1]);
    }
    return names;
  } catch {
    console.warn(
      `[check-global-styles] Could not read ${GLOBALS_CSS_PATH} -- proceeding with no allowed project color tokens.`
    );
    return new Set<string>();
  }
}

const PROJECT_COLOR_TOKENS = readProjectColorTokens();

// Tailwind's default palette families, plus the bare (non-family) color
// keywords. "transparent" / "current" / "inherit" are deliberately excluded
// from the bare set: they aren't a color value duplicating a token, they're
// a pass-through keyword with no token equivalent.
const TAILWIND_COLOR_FAMILIES = new Set([
  "slate", "gray", "zinc", "neutral", "stone",
  "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal",
  "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
]);
const TAILWIND_BARE_COLORS = new Set(["black", "white"]);

// Every Tailwind utility family whose value slot is a color.
const COLOR_UTILITY_PREFIXES = [
  "bg", "text", "border-t", "border-b", "border-l", "border-r",
  "border-s", "border-e", "border-x", "border-y", "border",
  "ring-offset", "ring", "outline", "decoration", "caret", "accent",
  "fill", "stroke", "divide", "from", "via", "to", "shadow", "placeholder",
];

/**
 * If `token` is a Tailwind color utility (`bg-red-500`, `text-white`, ...)
 * using a stock palette/bare color rather than one of this project's own
 * `--color-*` tokens, returns the offending color word. Arbitrary-value
 * brackets (`bg-[...]`) are handled separately by ARBITRARY_COLOR_REGEX, so
 * anything containing "[" is skipped here.
 */
function stockPaletteColorIn(token: string): string | null {
  if (token.includes("[") || token.includes("(")) return null;

  for (const prefix of COLOR_UTILITY_PREFIXES) {
    if (!token.startsWith(`${prefix}-`)) continue;
    const rest = token.slice(prefix.length + 1);
    const colorPart = rest.split("/")[0]; // strip a trailing opacity modifier
    if (PROJECT_COLOR_TOKENS.has(colorPart)) continue; // this project's own token: fine

    if (TAILWIND_BARE_COLORS.has(colorPart)) return colorPart;

    const familyMatch = colorPart.match(/^([a-z]+)(?:-(\d{2,3}))?$/);
    if (familyMatch && TAILWIND_COLOR_FAMILIES.has(familyMatch[1])) return colorPart;
  }
  return null;
}

// This codebase has no CSS Modules and no styled-jsx -- styling is Tailwind
// utility classes plus the single `app/globals.css`. Tailwind classes are
// global by design, so "is this component's styling scoped" isn't a
// meaningful question here the way it is in a CSS-Modules codebase. What
// *is* meaningful, and what this checks:
//
//   1. A raw <style> tag dropped into a component -- unscoped CSS injected
//      straight into the DOM, bypassing the Tailwind/globals.css convention
//      entirely.
//   2. A component importing a `.css` file directly, instead of going
//      through Tailwind classes or the shared `app/globals.css`.
//   3. A `style={{ ... }}` object whose properties are hardcoded literal
//      values for things Tailwind already has utility classes for (colors,
//      spacing, sizing, typography, shadows, ...) -- the inline-style
//      equivalent of a hardcoded translation string: a value duplicated
//      outside the design system instead of expressed through it.
//   4. A className color utility -- arbitrary-value (`bg-[#ff0055]`) or one
//      of Tailwind's own stock palette classes (`bg-slate-950`,
//      `text-amber-400`) -- instead of one of this project's own
//      `--color-*` tokens in app/globals.css. Always on: every color in this
//      codebase is expected to route through that token file, full stop.
//
// Properties left alone even when their value is a literal, because they
// are either not visual/theme values, or Tailwind has no static utility for
// the exact runtime value they need to hold (an animation's current
// transform, a drag offset, an interpolated clamp() position, ...).
const NON_PRESENTATIONAL_STYLE_PROPS = new Set([
  "transform",
  "transformOrigin",
  "transition",
  "willChange",
  "touchAction",
  "WebkitOverflowScrolling",
  "msOverflowStyle",
  "scrollbarWidth",
  "pointerEvents",
  "userSelect",
  "WebkitUserSelect",
  "WebkitTapHighlightColor",
  "cursor",
  "objectFit",
  "objectPosition",
  "whiteSpace",
  "wordBreak",
  "overflowWrap",
  "textOverflow",
  "visibility",
  "contain",
  "isolation",
  "clipPath",
  "animationDelay",
  "animationDuration",
  "animationName",
  "animationTimingFunction",
]);

// Visual/theme properties Tailwind already expresses as utility classes.
// A literal value assigned to one of these in an inline `style={{}}` is
// almost always a class that should have been used instead.
const PRESENTATIONAL_STYLE_PROPS = new Set([
  "color",
  "backgroundColor",
  "background",
  "border",
  "borderColor",
  "borderWidth",
  "borderStyle",
  "borderRadius",
  "borderTopColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderRightColor",
  "boxShadow",
  "outline",
  "outlineColor",
  "padding",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "fontSize",
  "fontWeight",
  "fontFamily",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "gap",
  "rowGap",
  "columnGap",
  "top",
  "left",
  "right",
  "bottom",
  "zIndex",
  "opacity",
  "display",
  "flexDirection",
  "justifyContent",
  "alignItems",
  "alignSelf",
  "textAlign",
  "textTransform",
  "textDecoration",
]);

// Literal values common enough as genuine layout resets/defaults (rather
// than a stand-in for a Tailwind class) that flagging them would just be
// noise. Only applies outside --strict.
const BENIGN_LITERAL_VALUES = new Set(["0", "1", "none", "auto", "0px"]);

// A Tailwind arbitrary-value bracket (`bg-[...]`, `shadow-[...]`, ...) whose
// contents spell out a raw hex/rgb/hsl color. This reads like a normal
// Tailwind class and is easy to miss in review, but it bypasses this
// project's `--color-*` tokens in app/globals.css exactly like a literal
// color in a `style={{}}` object would.
const ARBITRARY_COLOR_REGEX =
  /-\[[^\]]*(#[0-9a-fA-F]{3,8}|rgba?\([^\]]*\)|hsla?\([^\]]*\))[^\]]*\]/g;

let hasErrors = false;

function reportError(filePath: string, line: number, message: string) {
  console.error(`❌ ${message} at ${filePath}:${line}`);
  hasErrors = true;
}

function propName(node: Node): string | null {
  if (Node.isPropertyAssignment(node) || Node.isShorthandPropertyAssignment(node)) {
    const nameNode = node.getNameNode();
    if (Node.isIdentifier(nameNode) || Node.isStringLiteral(nameNode)) {
      return nameNode.getText().replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

/** True for a literal we should flag when it lands on a presentational prop. */
function isHardcodedLiteral(value: Node): { text: string } | null {
  if (Node.isStringLiteral(value) || Node.isNoSubstitutionTemplateLiteral(value)) {
    return { text: value.getLiteralText() };
  }
  if (Node.isNumericLiteral(value)) {
    return { text: value.getText() };
  }
  // Unary numeric literal, e.g. `-4`
  if (Node.isPrefixUnaryExpression(value) && Node.isNumericLiteral(value.getOperand())) {
    return { text: value.getText() };
  }
  return null;
}

for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();

  // 1. Raw <style> tags -- unscoped CSS injected directly into the DOM.
  const jsxElements = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];
  for (const el of jsxElements) {
    const tagNameNode = Node.isJsxElement(el)
      ? el.getOpeningElement().getTagNameNode()
      : el.getTagNameNode();
    if (tagNameNode.getText().toLowerCase() !== "style") continue;

    reportError(
      filePath,
      el.getStartLineNumber(),
      "Raw <style> tag injects unscoped global CSS -- use Tailwind classes or app/globals.css instead"
    );
  }

  // 2. Direct .css imports, other than the one shared app/globals.css
  // stylesheet -- exempted by filename rather than by "is this the root
  // layout", since Next's App Router lets the root layout live at any
  // depth (e.g. `app/[locale]/layout.tsx` for a locale route group), so
  // there is no single fixed path to special-case.
  for (const imp of sourceFile.getImportDeclarations()) {
    const spec = imp.getModuleSpecifierValue();
    if (!spec.endsWith(".css")) continue;
    if (/(^|[\\/])globals\.css$/.test(spec)) continue;

    reportError(
      filePath,
      imp.getStartLineNumber(),
      `Component imports a stylesheet directly ("${spec}") instead of using Tailwind classes / app/globals.css`
    );
  }

  // 3. style={{ ... }} objects with hardcoded presentational literals.
  const styleAttrs = sourceFile
    .getDescendantsOfKind(SyntaxKind.JsxAttribute)
    .filter((attr) => attr.getNameNode().getText() === "style");

  for (const attr of styleAttrs) {
    const initializer = attr.getInitializer();
    if (!initializer || !Node.isJsxExpression(initializer)) continue;
    const expr = initializer.getExpression();
    if (!expr || !Node.isObjectLiteralExpression(expr)) continue;

    for (const prop of expr.getProperties()) {
      const name = propName(prop);
      if (!name || !PRESENTATIONAL_STYLE_PROPS.has(name)) continue;
      if (NON_PRESENTATIONAL_STYLE_PROPS.has(name)) continue;

      if (!Node.isPropertyAssignment(prop)) continue;
      const value = prop.getInitializer();
      if (!value) continue;

      const literal = isHardcodedLiteral(value);
      if (!literal) continue; // dynamic (identifier, template expr, call, ternary, ...): fine
      if (!isStrict && BENIGN_LITERAL_VALUES.has(literal.text.trim())) continue;

      reportError(
        filePath,
        prop.getStartLineNumber(),
        `Hardcoded inline style "${name}: ${literal.text}" duplicates a Tailwind utility class`
      );
    }
  }

  // 4. className / class strings using a Tailwind arbitrary-value color
  // instead of a palette class or a project token. Every string/template
  // literal under the attribute is scanned (not just a directly-assigned
  // literal), so this also catches template literals, ternaries, and
  // clsx()/cn()-wrapped class lists -- anywhere the raw text of the class
  // list is visible at all.
  const classAttrs = sourceFile
    .getDescendantsOfKind(SyntaxKind.JsxAttribute)
    .filter((attr) => ["className", "class"].includes(attr.getNameNode().getText()));

  for (const attr of classAttrs) {
    const initializer = attr.getInitializer();
    if (!initializer) continue;

    const candidates: { text: string; line: number }[] = [];

    const stringLikeNodes = [
      ...initializer.getDescendantsOfKind(SyntaxKind.StringLiteral),
      ...initializer.getDescendantsOfKind(SyntaxKind.NoSubstitutionTemplateLiteral),
    ];
    if (Node.isStringLiteral(initializer) || Node.isNoSubstitutionTemplateLiteral(initializer)) {
      stringLikeNodes.push(initializer);
    }
    for (const n of stringLikeNodes) {
      candidates.push({ text: n.getLiteralValue(), line: n.getStartLineNumber() });
    }

    for (const t of initializer.getDescendantsOfKind(SyntaxKind.TemplateExpression)) {
      candidates.push({ text: t.getHead().getLiteralText(), line: t.getHead().getStartLineNumber() });
      for (const span of t.getTemplateSpans()) {
        candidates.push({
          text: span.getLiteral().getLiteralText(),
          line: span.getLiteral().getStartLineNumber(),
        });
      }
    }

    for (const { text, line } of candidates) {
      const bracketMatches = text.match(ARBITRARY_COLOR_REGEX);
      if (bracketMatches) {
        for (const m of bracketMatches) {
          reportError(
            filePath,
            line,
            `Hardcoded color in Tailwind arbitrary value "${m}" bypasses the --color-* tokens in app/globals.css`
          );
        }
      }

      // Always on: a stock Tailwind palette/bare color class is just as much
      // a bypass of app/globals.css's tokens as a literal hex value is.
      for (const token of text.split(/\s+/)) {
        if (!token) continue;
        const color = stockPaletteColorIn(token);
        if (color) {
          reportError(
            filePath,
            line,
            `Tailwind palette color "${token}" bypasses the --color-* tokens in app/globals.css`
          );
        }
      }
    }
  }
}

// 5. Corner radius. Only the role tokens from tokens.css exist (rounded-chip / -control / -card /
// -modal / -full / -none). Tailwind's stock scale is switched off there, so a leftover rounded-xl
// would silently render square; arbitrary values (rounded-[Npx]) bypass the scale entirely.
const LEGACY_RADIUS = /^(?:[a-z0-9-]+:)*rounded(?:-(?:t|b|l|r|tl|tr|bl|br|s|e|ss|se|es|ee))?-(?:xs|sm|md|lg|xl|2xl|3xl|\[[^\]]*\])$/;
const ANY_RADIUS = /^(?:[a-z0-9-]+:)*rounded(?:-(?:t|b|l|r|tl|tr|bl|br|s|e|ss|se|es|ee))?(?:-[\w[\]]+)?$/;
// Shared primitives own their radius; callers may not override it through className.
const RADIUS_OWNED_BY_PRIMITIVE = new Set(["Button", "IconButton", "Input", "Textarea", "Select", "Surface", "Badge", "InfoChip", "ToggleChip"]);
const STRING_NODE_KINDS = [
  SyntaxKind.StringLiteral,
  SyntaxKind.NoSubstitutionTemplateLiteral,
  SyntaxKind.TemplateHead,
  SyntaxKind.TemplateMiddle,
  SyntaxKind.TemplateTail,
];

for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();

  for (const kind of STRING_NODE_KINDS) {
    for (const node of sourceFile.getDescendantsOfKind(kind)) {
      const text = node.getText();
      if (!text.includes("rounded")) continue;
      for (const token of text.replace(/^[`'"}]|[`'"]$|\$\{$/g, "").split(/\s+/)) {
        if (LEGACY_RADIUS.test(token)) {
          reportError(filePath, node.getStartLineNumber(), `Radius "${token}" is not a role token: use rounded-chip, rounded-control, rounded-card, rounded-modal or rounded-full`);
        }
      }
    }
  }

  const openings = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];
  for (const el of openings) {
    const tag = el.getTagNameNode().getText();
    if (!RADIUS_OWNED_BY_PRIMITIVE.has(tag)) continue;
    const attr = el.getAttribute("className");
    if (!attr || !Node.isJsxAttribute(attr)) continue;
    const initializer = attr.getInitializer();
    if (!initializer) continue;
    for (const kind of STRING_NODE_KINDS) {
      for (const node of [...initializer.getDescendantsOfKind(kind), ...(initializer.getKind() === kind ? [initializer] : [])]) {
        for (const token of node.getText().replace(/^[`'"}]|[`'"]$|\$\{$/g, "").split(/\s+/)) {
          if (ANY_RADIUS.test(token) && token.includes("rounded")) {
            reportError(filePath, node.getStartLineNumber(), `<${tag}> owns its corner radius: drop "${token}" from className`);
          }
        }
      }
    }
  }
}

// 6. Tooltips. One system (common/Tooltip.tsx, variants in TOOLTIP_CONFIG). A native `title` on a DOM
// element is a second, unstyled tooltip that never shows on touch screens: use {...tip(text, desc, variant)}.
// Component props called `title` (Modal, EmptyState, ...) are not tooltips and start with a capital letter.
const NATIVE_TITLE_TAGS = new Set(["Link", "Image"]);
for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();
  const elements = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];
  for (const el of elements) {
    const tag = el.getTagNameNode().getText();
    const isDom = /^[a-z]/.test(tag) || NATIVE_TITLE_TAGS.has(tag);
    if (!isDom || tag === "title") continue;
    if (el.getAttribute("title")) {
      reportError(filePath, el.getStartLineNumber(), `<${tag}> uses a native title tooltip: use {...tip(text, undefined, 'action')} from common/Tooltip`);
    }
    if (el.getAttribute("data-tooltip")) {
      reportError(filePath, el.getStartLineNumber(), `<${tag}> sets data-tooltip by hand: use {...tip(text, description, variant)}`);
    }
  }
}

// 7. Arbitrary sizes. Widths, heights, gaps, paddings, font sizes ... come from Tailwind's scale or from a
// name in app/styles/tokens.css (--container-*, --breakpoint-*, `@utility max-h-list`, `icon-sm`, ...), never
// from a number typed into a bracket: `min-w-[12rem]`, `max-h-[36rem]`, `text-[0.62rem]`, `min-[400px]:`.
// A value that reads a variable (`w-[var(--sidebar-width)]`) is fine: the number lives in a token file.
// Files that still have some are counted in scripts/arbitrary-sizes-baseline.json: a file may keep its
// count or lower it, never raise it, and a file not listed there may have none.
const ARBITRARY_SIZE_BASELINE_PATH = "scripts/arbitrary-sizes-baseline.json";
// A number with a unit inside the bracket (a computed size such as calc(100vw-2.5rem) has one too).
const SIZE_VALUE = /\d(?:px|rem|em|vh|vw|svh|dvh|lvh|svw|dvw|ch|pt|%)/;
// Utilities whose value is a size. (Colors are rule 4, radii rule 5, glows and shadows live in tokens.)
const SIZE_UTILITIES =
  "min-w|max-w|min-h|max-h|w|h|size|basis|gap|gap-x|gap-y|space-x|space-y|p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|" +
  "inset|inset-x|inset-y|top|right|bottom|left|start|end|translate-x|translate-y|scroll-m|scroll-p|" +
  "leading|tracking|text|indent|columns|grid-cols|grid-rows|auto-cols|auto-rows|border|border-x|border-y|border-t|border-r|border-b|border-l|" +
  "ring|ring-offset|outline|outline-offset|blur|backdrop-blur|stroke|aspect|flex";
// `!` makes a utility important; Tailwind accepts it before or after the class (`w-[10rem]!`).
const ARBITRARY_SIZE_TOKEN = new RegExp(`^(?:[^\\s:]+:)*!?-?(?:${SIZE_UTILITIES})-\\[([^\\]]+)\\]!?$`);
// `min-[400px]:`, `max-[640px]:`, `@[640px]/hub:`, `[@media(min-width:600px)]:` -- a breakpoint typed in place instead of a --breakpoint-* token.
const ARBITRARY_BREAKPOINT_TOKEN = /^(?:[^\s:]+:)*(?:(?:min|max)-\[[^\]]+\]|@(?:min-|max-)?\[[^\]]+\](?:\/[\w-]+)?|\[@(?:media|container)[^\]]*\]):/;

function arbitrarySizesIn(text: string): string[] {
  const found: string[] = [];
  for (const token of text.split(/\s+/)) {
    if (!token.includes("[")) continue;
    const size = token.match(ARBITRARY_SIZE_TOKEN);
    if (size && !size[1].startsWith("var(") && SIZE_VALUE.test(size[1])) found.push(token);
    else if (ARBITRARY_BREAKPOINT_TOKEN.test(token)) found.push(token);
  }
  return found;
}

const arbitrarySizeHits: Record<string, { token: string; line: number }[]> = {};
for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();
  const rel = filePath.replace(/\\/g, "/").replace(/^.*\/frontend\//, "");
  for (const kind of STRING_NODE_KINDS) {
    for (const node of sourceFile.getDescendantsOfKind(kind)) {
      for (const token of arbitrarySizesIn(node.getText().replace(/[`'"]|\$\{|\}/g, " "))) {
        (arbitrarySizeHits[rel] ??= []).push({ token, line: node.getStartLineNumber() });
      }
    }
  }
}

// 8. Raw <button> that looks like a button. Actions use Button / ToggleChip / SegmentedControl / MenuItem /
// AccordionSection, so a change to one style reaches every button. The buttons that are deliberately
// custom (tiles, game controls, drag handles, ...) are counted per file in raw-buttons-baseline.json:
// a file may keep its count or lower it, never raise it. `--update-baseline` rewrites the file.
const BASELINE_PATH = "scripts/raw-buttons-baseline.json";
const updateBaseline = process.argv.includes("--update-baseline");
const rawButtonCounts: Record<string, number> = {};
for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();
  const rel = filePath.replace(/\\/g, "/").replace(/^.*\/frontend\//, "");
  if (rel.includes("/common/")) continue;
  for (const el of sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement)) {
    if (el.getTagNameNode().getText() !== "button") continue;
    const attr = el.getAttribute("className");
    if (!attr || !Node.isJsxAttribute(attr)) continue;
    const init = attr.getInitializer();
    if (!init) continue;
    let text = Node.isStringLiteral(init) ? init.getLiteralText() : "";
    for (const kind of STRING_NODE_KINDS) {
      for (const n of init.getDescendantsOfKind(kind)) {
        text += " " + (Node.isStringLiteral(n) || Node.isNoSubstitutionTemplateLiteral(n) ? n.getLiteralText() : n.getText().replace(/^[`}]|\$\{$|`$/g, ""));
      }
    }
    const toks = text.split(/\s+/).filter(Boolean);
    const surface = toks.some((t) => /^(bg-|border$|border-(?!t$|b$|l$|r$|transparent))/.test(t));
    const sized = toks.some((t) => /^(px-|py-|p-|h-\d|w-\d)/.test(t));
    if (surface && sized) rawButtonCounts[rel] = (rawButtonCounts[rel] ?? 0) + 1;
  }
}
if (updateBaseline) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(rawButtonCounts, Object.keys(rawButtonCounts).sort(), 2) + "\n");
  console.log(`Wrote ${BASELINE_PATH} (${Object.keys(rawButtonCounts).length} files)`);
  const sizeCounts: Record<string, number> = {};
  for (const [rel, hits] of Object.entries(arbitrarySizeHits)) sizeCounts[rel] = hits.length;
  fs.writeFileSync(ARBITRARY_SIZE_BASELINE_PATH, JSON.stringify(sizeCounts, Object.keys(sizeCounts).sort(), 2) + "\n");
  console.log(`Wrote ${ARBITRARY_SIZE_BASELINE_PATH} (${Object.keys(sizeCounts).length} files)`);
} else {
  let baseline: Record<string, number> = {};
  try {
    baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
  } catch {
    console.warn(`[check-global-styles] ${BASELINE_PATH} missing: run with --update-baseline`);
  }
  for (const [rel, count] of Object.entries(rawButtonCounts)) {
    const allowed = baseline[rel] ?? 0;
    if (count > allowed) {
      reportError(rel, 1, `${count} raw <button> styled like a button (allowed ${allowed}): use Button, ToggleChip, SegmentedControl, MenuItem or AccordionSection`);
    }
  }
}

if (!updateBaseline) {
  let sizeBaseline: Record<string, number> = {};
  try {
    sizeBaseline = JSON.parse(fs.readFileSync(ARBITRARY_SIZE_BASELINE_PATH, "utf8"));
  } catch {
    console.warn(`[check-global-styles] ${ARBITRARY_SIZE_BASELINE_PATH} missing: run with --update-baseline`);
  }
  for (const [rel, hits] of Object.entries(arbitrarySizeHits)) {
    const allowed = sizeBaseline[rel] ?? 0;
    if (hits.length <= allowed) continue;
    for (const { token, line } of hits) {
      reportError(
        rel,
        line,
        `Arbitrary size "${token}" (${hits.length} in this file, allowed ${allowed}): use the Tailwind scale or add a named size in app/styles/tokens.css`
      );
    }
  }
}

if (hasErrors) {
  console.error(
    "\n🚫 Build blocked: move hardcoded/global styling into Tailwind classes or app/globals.css.\n"
  );
  process.exit(1);
} else {
  console.log("✅ No unscoped global styles or hardcoded inline styles found.");
}
