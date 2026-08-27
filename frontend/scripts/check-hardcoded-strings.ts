import fs from 'fs';
import path from 'path';

interface Issue {
  file: string;
  line: number;
  column: number;
  type: 'jsx-text' | 'jsx-attribute' | 'document-title';
  text: string;
  context: string;
}

const IGNORE_PATTERNS = [
  /\bnode_modules\b/,
  /\b\.next\b/,
  /\b__tests__\b/,
  /\.test\.tsx?$/,
  /\.spec\.tsx?$/,
  /types\.ts$/,
  /constants\.ts$/,
  /\/locales\//,
];

// Translatable JSX attributes
const TRANSLATABLE_ATTRS = new Set([
  'placeholder',
  'title',
  'aria-label',
  'alt',
  'actionPrompt',
  'tagline',
  'buttonText',
  'description',
  'label',
]);

const CODE_OR_TECHNICAL_WORDS = new Set([
  'Promise',
  'ReactNode',
  'JSX.Element',
  'MouseEvent',
  'KeyboardEvent',
  'TouchEvent',
  'ChangeEvent',
  'FormEvent',
  'undefined',
  'null',
  'true',
  'false',
  'Math.PI',
  'React',
  'FC',
  'Survivor',
  'Killer',
  'All',
  'None',
]);

function shouldScanFile(filePath: string): boolean {
  if (!filePath.endsWith('.tsx')) return false;
  return !IGNORE_PATTERNS.some((p) => p.test(filePath));
}

function getAllTsxFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!IGNORE_PATTERNS.some((p) => p.test(fullPath))) {
        results = results.concat(getAllTsxFiles(fullPath));
      }
    } else if (shouldScanFile(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function isTranslatableString(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length <= 1) return false;
  // Ignore pure numbers/symbols
  if (/^[\d\s.,/#!$%\^&\*;:{}=\-_`~()><|@\+\?\\]+$/.test(trimmed)) return false;
  // Ignore CSS / Tailwind classes
  if (/^(?:flex|grid|p-|m-|px-|py-|text-|bg-|border-|h-|w-|gap-|rounded|relative|absolute|fixed|inset|z-|transition|hover:|focus:)/.test(trimmed)) {
    return false;
  }
  // Ignore URLs, paths, protocols, hex
  if (/^(?:https?:\/\/|\/|#|mailto:|tel:)/.test(trimmed)) return false;
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return false;
  if (/^&[a-zA-Z]+;$/.test(trimmed)) return false;
  // Ignore technical / code words
  if (CODE_OR_TECHNICAL_WORDS.has(trimmed)) return false;
  if (/^\{.*\}$/.test(trimmed)) return false;
  // Must contain letter
  if (!/[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FAF]/.test(trimmed)) {
    return false;
  }
  return true;
}

function scanFileContent(filePath: string, rootDir: string): Issue[] {
  const code = fs.readFileSync(filePath, 'utf-8');
  const issues: Issue[] = [];
  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

  const lines = code.split('\n');

  // Line-by-line helper for line/col calculation
  const lineOffsets: number[] = [0];
  for (let i = 0; i < lines.length; i++) {
    lineOffsets.push(lineOffsets[i] + lines[i].length + 1);
  }

  function getLineAndCol(pos: number): { line: number; column: number } {
    let low = 0;
    let high = lineOffsets.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (lineOffsets[mid] <= pos) {
        if (mid === lineOffsets.length - 1 || lineOffsets[mid + 1] > pos) {
          return { line: mid + 1, column: pos - lineOffsets[mid] + 1 };
        }
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return { line: 1, column: 1 };
  }

  // 1. Scan for document.title = "..."
  const docTitleRegex = /document\.title\s*=\s*["']([^"']+)["']/g;
  let docMatch: RegExpExecArray | null;
  while ((docMatch = docTitleRegex.exec(code)) !== null) {
    const val = docMatch[1].trim();
    if (isTranslatableString(val)) {
      const pos = getLineAndCol(docMatch.index);
      issues.push({
        file: relPath,
        line: pos.line,
        column: pos.column,
        type: 'document-title',
        text: `document.title = "${val}"`,
        context: lines[pos.line - 1]?.trim() || val,
      });
    }
  }

  // 2. Scan JSX tags and translatable attributes
  const attrRegex = /\b(placeholder|title|aria-label|alt|actionPrompt|tagline|buttonText|description|label)=["']([^"']+)["']/g;
  let attrMatch: RegExpExecArray | null;
  while ((attrMatch = attrRegex.exec(code)) !== null) {
    const attrName = attrMatch[1];
    const val = attrMatch[2].trim();
    if (isTranslatableString(val)) {
      const pos = getLineAndCol(attrMatch.index);
      issues.push({
        file: relPath,
        line: pos.line,
        column: pos.column,
        type: 'jsx-attribute',
        text: `${attrName}="${val}"`,
        context: lines[pos.line - 1]?.trim() || val,
      });
    }
  }

  // 3. Scan JSX text across single and multiline elements
  // Matches raw text between JSX tag ends `>` and JSX tag begins `<`
  // Ensure the tag before ends with `>` and tag after begins with `<[A-Za-z/]`
  const jsxTextRegex = />\s*([^<{}]+?)\s*</g;
  let textMatch: RegExpExecArray | null;
  while ((textMatch = jsxTextRegex.exec(code)) !== null) {
    const raw = textMatch[1];
    const textVal = raw.trim().replace(/\s+/g, ' ');
    if (isTranslatableString(textVal)) {
      // Ignore text containing JavaScript/TypeScript operators or statements
      if (
        textVal.includes('=>') ||
        textVal.includes(';') ||
        textVal.includes('===') ||
        textVal.includes('!==') ||
        textVal.includes('&&') ||
        textVal.includes('||') ||
        textVal.includes('?') ||
        textVal.includes(':') ||
        textVal.includes('useState') ||
        textVal.includes('useRef') ||
        textVal.includes('useEffect') ||
        textVal.includes('useCallback') ||
        textVal.includes('useMemo') ||
        textVal.includes('Record<') ||
        textVal.includes('Promise<') ||
        textVal.includes('Array<') ||
        textVal.includes('Map<') ||
        textVal.startsWith('const ') ||
        textVal.startsWith('let ') ||
        textVal.startsWith('var ') ||
        textVal.startsWith('return ') ||
        textVal.startsWith('import ') ||
        textVal.startsWith('export ') ||
        textVal.startsWith('type ') ||
        textVal.startsWith('interface ')
      ) {
        continue;
      }

      // Check context before and after
      const preIdx = textMatch.index;
      const preSlice = code.slice(Math.max(0, preIdx - 50), preIdx + 1);
      const postIdx = textMatch.index + textMatch[0].length;
      const postSlice = code.slice(postIdx - 1, Math.min(code.length, postIdx + 50));

      // Must be adjacent to JSX opening/closing tags
      if (!/<[a-zA-Z0-9_\-.:]+|<\/[a-zA-Z0-9_\-.:]+|<>/i.test(postSlice)) {
        continue;
      }
      if (!/>|\/>/.test(preSlice)) {
        continue;
      }

      const offsetInMatch = textMatch[0].indexOf(raw.trim());
      const pos = getLineAndCol(textMatch.index + Math.max(1, offsetInMatch));
      const lineContent = lines[pos.line - 1]?.trim() || '';

      if (
        !lineContent.startsWith('import ') &&
        !lineContent.startsWith('export ') &&
        !lineContent.startsWith('type ') &&
        !lineContent.startsWith('interface ') &&
        !lineContent.startsWith('//') &&
        !lineContent.startsWith('/*')
      ) {
        issues.push({
          file: relPath,
          line: pos.line,
          column: pos.column,
          type: 'jsx-text',
          text: textVal,
          context: lineContent,
        });
      }
    }
  }

  // Deduplicate issues on the same line with same text
  return issues.filter(
    (issue, idx, self) =>
      idx === self.findIndex((t) => t.line === issue.line && t.text === issue.text)
  );
}

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const srcDir = path.join(rootDir, 'src');
  const files = getAllTsxFiles(srcDir);

  console.log(`\n🔍 Scanning ${files.length} .tsx files for hardcoded strings in ${srcDir}...\n`);

  let totalIssues = 0;
  const allIssues: Record<string, Issue[]> = {};

  for (const file of files) {
    const issues = scanFileContent(file, rootDir);
    if (issues.length > 0) {
      allIssues[file] = issues;
      totalIssues += issues.length;
    }
  }

  for (const [file, issues] of Object.entries(allIssues)) {
    const relFile = path.relative(rootDir, file).replace(/\\/g, '/');
    console.log(`📄 \x1b[1m\x1b[33m${relFile}\x1b[0m (${issues.length} issues):`);
    for (const issue of issues) {
      console.log(
        `   Line \x1b[36m${issue.line}:${issue.column}\x1b[0m [${issue.type}] \x1b[31m"${issue.text}"\x1b[0m`
      );
    }
    console.log('');
  }

  console.log('----------------------------------------------------');
  if (totalIssues === 0) {
    console.log('✅ \x1b[32mNo hardcoded strings found! All .tsx files are properly localized.\x1b[0m\n');
    process.exit(0);
  } else {
    console.log(`⚠️  \x1b[31mFound ${totalIssues} hardcoded strings across ${Object.keys(allIssues).length} files.\x1b[0m\n`);
    if (process.argv.includes('--strict')) {
      process.exit(1);
    }
  }
}

main();
