import { Project, SyntaxKind, Node } from "ts-morph";

const project = new Project();
project.addSourceFilesAtPaths("src/**/*.{tsx,jsx}");

// Attributes that represent user-facing text
const USER_FACING_ATTRIBUTES = new Set([
  "placeholder",
  "alt",
  "title",
  "aria-label",
  "aria-placeholder",
  "aria-roledescription",
]);

// Tags whose contents should never be treated as translatable JSX text
const IGNORED_PARENT_TAGS = new Set(["style", "script", "code", "pre"]);

// Pure file extensions (e.g. ".json", ".png", ".svg")
const FILE_EXTENSION_REGEX = /^\.[a-zA-Z0-9]+$/;

// Masking symbols for passwords or placeholders (e.g. "••••••••", "********")
const MASK_SYMBOLS_REGEX = /^[•*·\-_=~]+$/;

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

  // 2. Ignore file extensions (e.g., ".json")
  if (FILE_EXTENSION_REGEX.test(text)) return true;

  // 3. Ignore mask / dot sequences (e.g., "••••••••")
  if (MASK_SYMBOLS_REGEX.test(text)) return true;

  // 4. Ignore strings made purely of emojis, symbols, and formatting selectors
  if (EMOJI_AND_SYMBOLS_REGEX.test(text)) return true;

  // 5. Ignore structural punctuation and pure numbers (e.g., "15", "/4", ":")
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
 * Checks if a node is nested inside an ignored tag like <style> or <code>.
 */
function isInsideIgnoredTag(node: Node): boolean {
  let current: Node | undefined = node.getParent();
  while (current) {
    if (Node.isJsxElement(current)) {
      const tagName = current.getOpeningElement().getTagNameNode().getText();
      if (IGNORED_PARENT_TAGS.has(tagName)) {
        return true;
      }
    }
    current = current.getParent();
  }
  return false;
}

// Traverse all source files
for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();

  // 1. Check raw JSX text nodes: <div>Raw Text</div>
  const jsxTexts = sourceFile.getDescendantsOfKind(SyntaxKind.JsxText);
  for (const node of jsxTexts) {
    if (isInsideIgnoredTag(node) || hasIgnoreComment(node)) continue;

    const rawText = node.getText();
    if (!shouldIgnoreText(rawText)) {
      reportError(filePath, node.getStartLineNumber(), rawText, "JSX Text");
    }
  }

  // 2. Check JSX string expressions: <div>{'Raw Text'}</div>
  const jsxExprs = sourceFile.getDescendantsOfKind(SyntaxKind.JsxExpression);
  for (const expr of jsxExprs) {
    if (expr.getParentIfKind(SyntaxKind.JsxAttribute)) continue;
    if (isInsideIgnoredTag(expr) || hasIgnoreComment(expr)) continue;

    const exprNode = expr.getExpression();
    if (
      exprNode &&
      (Node.isStringLiteral(exprNode) || Node.isNoSubstitutionTemplateLiteral(exprNode))
    ) {
      const literalValue = exprNode.getLiteralValue();
      if (!shouldIgnoreText(literalValue)) {
        reportError(filePath, expr.getStartLineNumber(), literalValue, "JSX String Expression");
      }
    }
  }

  // 3. Check hardcoded user-facing JSX attributes: <input placeholder="Enter text" />
  const jsxAttributes = sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute);
  for (const attr of jsxAttributes) {
    if (hasIgnoreComment(attr)) continue;

    const attrName = attr.getNameNode().getText();
    if (USER_FACING_ATTRIBUTES.has(attrName)) {
      const initializer = attr.getInitializer();

      // Static strings: placeholder="Enter text"
      if (initializer && Node.isStringLiteral(initializer)) {
        const val = initializer.getLiteralValue();
        if (!shouldIgnoreText(val)) {
          reportError(filePath, attr.getStartLineNumber(), val, `Attribute (${attrName})`);
        }
      }

      // Expression strings: placeholder={'Enter text'}
      if (initializer && Node.isJsxExpression(initializer)) {
        const innerExpr = initializer.getExpression();
        if (innerExpr && Node.isStringLiteral(innerExpr)) {
          const val = innerExpr.getLiteralValue();
          if (!shouldIgnoreText(val)) {
            reportError(filePath, attr.getStartLineNumber(), val, `Attribute (${attrName})`);
          }
        }
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