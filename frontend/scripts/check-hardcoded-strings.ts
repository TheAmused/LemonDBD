// frontend/scripts/check-hardcoded-strings.ts
import { Project, SyntaxKind, Node } from "ts-morph";

const isStrict = process.argv.includes("--strict");

const project = new Project();
project.addSourceFilesAtPaths("src/**/*.{tsx,jsx}");

// Attributes whose values represent user-facing text displayed directly to the end-user
const USER_FACING_ATTRIBUTES = new Set([
  "placeholder",
  "alt",
  "title",
  "aria-label",
  "aria-placeholder",
  "aria-roledescription",
  "aria-description",
]);

// Tags whose contents should never be treated as translatable JSX text
const IGNORED_TAGS = new Set(["style", "script", "code", "pre"]);

// Pure file extensions (e.g. ".json", ".png", ".svg")
const FILE_EXTENSION_REGEX = /^\.[a-zA-Z0-9]+$/;

// Masking symbols for passwords or placeholders (e.g. "••••••••", "********")
const MASK_SYMBOLS_REGEX = /^[•*·\-_=~]+$/;

// Single template interpolation placeholders like "{email}", "{count}", "{slot}", "{progress}"
const PLACEHOLDER_ONLY_REGEX = /^\{[a-zA-Z0-9_]+\}$/;

// Internal identifier prefixes, URLs, technical identifiers, or asset paths
const IDENTIFIER_OR_PATH_REGEX =
  /^(https?:\/\/|\/|\.\/|\.\.\/|offering-|item-|addon-|seed_[a-z]|key-|tab-|#)/;

// CSS property fragments or keyframe rules
const CSS_OR_CODE_REGEX = /(@keyframes|transform:|opacity:|filter:|box-shadow:|rotate\(|scale\(|translate\()/;

// Structural numbers and punctuation (e.g. "15", "(", ")", ":", "/", "#")
const STRUCTURAL_PUNCTUATION_OR_NUMBERS = /^[\d\s.,!?:;()/#&_–—\-|/\\%*+=[\]{}<>]+$/;

// Matches single or combined emojis including variation selectors, zero-width joiners, and modifiers
const EMOJI_AND_SYMBOLS_REGEX =
  /^[\p{Extended_Pictographic}\p{Emoji}\p{Emoji_Component}\p{Symbol}\p{Punctuation}\p{Mark}\p{Format}\s]+$/u;

// Standard Intl Grapheme Segmenter to handle compound emojis and variation selectors
const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

let hasErrors = false;

function reportError(filePath: string, line: number, text: string, type: string) {
  console.error(`❌ Hardcoded ${type} found: "${text.trim()}" at ${filePath}:${line}`);
  hasErrors = true;
}

/**
 * Counts visual characters (grapheme clusters) rather than raw UTF-16 code units.
 */
function getGraphemeCount(text: string): number {
  return [...segmenter.segment(text)].length;
}

/**
 * Determines whether a string is safe to ignore from translation checks.
 */
function shouldIgnoreText(rawText: string): boolean {
  const text = rawText.trim();
  if (!text) return true;

  // 1. Ignore single visual characters (e.g., "S", "K", "💀", "🛡️", "%", "·", "→", "°")
  if (getGraphemeCount(text) <= 1) return true;

  // 2. Ignore pure interpolation parameters (e.g. "{email}", "{count}", "{progress}")
  if (PLACEHOLDER_ONLY_REGEX.test(text)) return true;

  // 3. Ignore file extensions (e.g., ".json")
  if (FILE_EXTENSION_REGEX.test(text)) return true;

  // 4. Ignore URLs, routes, or DOM identifier prefixes (e.g. "item-", "offering-", "/streaks/")
  if (IDENTIFIER_OR_PATH_REGEX.test(text)) return true;

  // 5. Ignore CSS rules or keyframe code blocks
  if (CSS_OR_CODE_REGEX.test(text)) return true;

  // 6. Ignore mask / dot sequences (e.g., "••••••••")
  if (MASK_SYMBOLS_REGEX.test(text)) return true;

  // 7. Ignore strings made purely of emojis, symbols, and formatting selectors
  if (EMOJI_AND_SYMBOLS_REGEX.test(text)) return true;

  // 8. Ignore structural punctuation and pure numbers (e.g., "15", "/4", ":")
  if (STRUCTURAL_PUNCTUATION_OR_NUMBERS.test(text)) return true;

  return false;
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
    currentLineText.includes("// i18n-ignore") ||
    currentLineText.includes("/* i18n-ignore */") ||
    prevLineText.includes("// i18n-ignore") ||
    prevLineText.includes("/* i18n-ignore */")
  );
}

/**
 * Checks if a node is or is nested inside an ignored tag like <style>, <script>, <code>, or <pre>.
 */
function isIgnoredTag(node: Node): boolean {
  let current: Node | undefined = node;
  while (current) {
    if (Node.isJsxElement(current)) {
      const tagName = current.getOpeningElement().getTagNameNode().getText().toLowerCase();
      if (IGNORED_TAGS.has(tagName)) return true;
    }
    if (Node.isJsxSelfClosingElement(current)) {
      const tagName = current.getTagNameNode().getText().toLowerCase();
      if (IGNORED_TAGS.has(tagName)) return true;
    }
    current = current.getParent();
  }
  return false;
}

interface StringCandidate {
  text: string;
  line: number;
  isFallback: boolean;
}

/**
 * Evaluates an expression tree recursively ONLY along direct render paths
 * (ternary branches, logical OR fallbacks, template strings, parenthesized expressions).
 */
function extractRenderedStrings(expr: Node, isRightOfFallback = false): StringCandidate[] {
  if (hasIgnoreComment(expr)) return [];

  // String Literals
  if (Node.isStringLiteral(expr) || Node.isNoSubstitutionTemplateLiteral(expr)) {
    return [
      {
        text: expr.getLiteralValue(),
        line: expr.getStartLineNumber(),
        isFallback: isRightOfFallback,
      },
    ];
  }

  // Template Strings: `Hello ${name}`
  if (Node.isTemplateExpression(expr)) {
    const candidates: StringCandidate[] = [];
    const headText = expr.getHead().getLiteralText();
    if (headText) {
      candidates.push({
        text: headText,
        line: expr.getHead().getStartLineNumber(),
        isFallback: isRightOfFallback,
      });
    }
    for (const span of expr.getTemplateSpans()) {
      const spanText = span.getLiteral().getLiteralText();
      if (spanText) {
        candidates.push({
          text: spanText,
          line: span.getLiteral().getStartLineNumber(),
          isFallback: isRightOfFallback,
        });
      }
    }
    return candidates;
  }

  // Parentheses: ( cond ? 'a' : 'b' )
  if (Node.isParenthesizedExpression(expr)) {
    return extractRenderedStrings(expr.getExpression(), isRightOfFallback);
  }

  // Ternary: cond ? 'a' : 'b'
  if (Node.isConditionalExpression(expr)) {
    return [
      ...extractRenderedStrings(expr.getWhenTrue(), isRightOfFallback),
      ...extractRenderedStrings(expr.getWhenFalse(), isRightOfFallback),
    ];
  }

  // Logical Binary Operations (&&, ||, ??)
  if (Node.isBinaryExpression(expr)) {
    const op = expr.getOperatorToken().getKind();

    if (op === SyntaxKind.AmpersandAmpersandToken) {
      return extractRenderedStrings(expr.getRight(), isRightOfFallback);
    }

    if (op === SyntaxKind.BarBarToken || op === SyntaxKind.QuestionQuestionToken) {
      return [
        ...extractRenderedStrings(expr.getLeft(), isRightOfFallback),
        ...extractRenderedStrings(expr.getRight(), true),
      ];
    }
  }

  return [];
}

// Traverse all source files
for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();

  // 1. Raw JSX Text Nodes: <h1>Raw text</h1>
  const jsxTexts = sourceFile.getDescendantsOfKind(SyntaxKind.JsxText);
  for (const node of jsxTexts) {
    if (isIgnoredTag(node) || hasIgnoreComment(node)) continue;

    const rawText = node.getText();
    if (!shouldIgnoreText(rawText)) {
      reportError(filePath, node.getStartLineNumber(), rawText, "JSX Text");
    }
  }

  // 2. Direct JSX Element/Fragment Children: <div>{'Hardcoded'}</div> or <div>{cond ? 'A' : 'B'}</div>
  const jsxElements = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxFragment),
  ];

  for (const el of jsxElements) {
    if (isIgnoredTag(el) || hasIgnoreComment(el)) continue;

    for (const child of el.getJsxChildren()) {
      if (Node.isJsxExpression(child)) {
        const expr = child.getExpression();
        if (!expr) continue;

        const candidates = extractRenderedStrings(expr);
        for (const candidate of candidates) {
          if (shouldIgnoreText(candidate.text)) continue;
          if (candidate.isFallback && !isStrict) continue;

          reportError(filePath, candidate.line, candidate.text, "JSX String Expression");
        }
      }
    }
  }

  // 3. User-Facing JSX Attributes: placeholder="...", title="...", aria-label="..."
  const jsxAttributes = sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute);
  for (const attr of jsxAttributes) {
    if (hasIgnoreComment(attr)) continue;

    const attrName = attr.getNameNode().getText();
    if (!USER_FACING_ATTRIBUTES.has(attrName)) continue;

    const initializer = attr.getInitializer();
    if (!initializer) continue;

    // Static Attribute: placeholder="Search..."
    if (Node.isStringLiteral(initializer) || Node.isNoSubstitutionTemplateLiteral(initializer)) {
      const val = initializer.getLiteralValue();
      if (!shouldIgnoreText(val)) {
        reportError(filePath, attr.getStartLineNumber(), val, `Attribute (${attrName})`);
      }
      continue;
    }

    // Dynamic Attribute Expression: placeholder={isSearch ? "Search..." : "Filter..."}
    if (Node.isJsxExpression(initializer)) {
      const expr = initializer.getExpression();
      if (!expr) continue;

      const candidates = extractRenderedStrings(expr);
      for (const candidate of candidates) {
        if (shouldIgnoreText(candidate.text)) continue;
        if (candidate.isFallback && !isStrict) continue;

        reportError(filePath, candidate.line, candidate.text, `Attribute (${attrName})`);
      }
    }
  }
}

if (hasErrors) {
  console.error("\n🚫 Build blocked: Localize all user-facing strings before proceeding.\n");
  process.exit(1);
} else {
  console.log("✅ No hardcoded user-facing strings found.");
}