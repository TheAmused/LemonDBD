// frontend/scripts/check-global-styles.ts
import { readFileSync } from "fs";
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
    const css = readFileSync(GLOBALS_CSS_PATH, "utf-8");
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
  console.error(`[ERROR] ${message} at ${filePath}:${line}`);
  hasErrors = true;
}

/**
 * Checks whether the current line or previous line contains an ignore directive.
 */
function hasIgnoreComment(node: Node): boolean {
  const sourceFile = node.getSourceFile();
  const line = node.getStartLineNumber();
  const lines = sourceFile.getFullText().split("\n");

  const currentLineText = lines[line - 1] || "";
  const prevLineText = lines[line - 2] || "";

  return (
    currentLineText.includes("// styles-ignore") ||
    currentLineText.includes("/* styles-ignore */") ||
    prevLineText.includes("// styles-ignore") ||
    prevLineText.includes("/* styles-ignore */")
  );
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
    if (hasIgnoreComment(el)) continue;

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
    if (hasIgnoreComment(imp)) continue;
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
    if (hasIgnoreComment(attr)) continue;
    const initializer = attr.getInitializer();
    if (!initializer || !Node.isJsxExpression(initializer)) continue;
    const expr = initializer.getExpression();
    if (!expr || !Node.isObjectLiteralExpression(expr)) continue;

    for (const prop of expr.getProperties()) {
      if (hasIgnoreComment(prop)) continue;
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
    if (hasIgnoreComment(attr)) continue;
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

if (hasErrors) {
  console.error(
    "\n[FAIL] Build blocked: move hardcoded/global styling into Tailwind classes or app/globals.css.\n"
  );
  process.exit(1);
} else {
  console.log("[SUCCESS] No unscoped global styles or hardcoded inline styles found.");
}