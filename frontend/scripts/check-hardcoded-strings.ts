// frontend/scripts/check-hardcoded-strings.ts
import fs from 'fs';
import path from 'path';

interface Issue {
  file: string;
  line: number;
  column: number;
  type: 'jsx-text' | 'jsx-attribute';
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
];

// Translatable JSX attributes
const TRANSLATABLE_ATTRS = [
  'placeholder',
  'title',
  'aria-label',
  'alt',
  'actionPrompt',
  'tagline',
  'buttonText',
  'description',
  'label',
];

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
  // Ignore purely numbers/symbols
  if (/^[\d\s.,/#!$%\^&\*;:{}=\-_`~()><|@\+\?\\]+$/.test(trimmed)) return false;
  // Ignore CSS / Tailwind classes
  if (/^(?:flex|grid|p-|m-|px-|py-|text-|bg-|border-|h-|w-|gap-|rounded|relative|absolute|fixed|inset|z-|transition|hover:|focus:)/.test(trimmed)) {
    return false;
  }
  // Ignore URLs, paths, protocols, hex
  if (/^(?:https?:\/\/|\/|#|mailto:|tel:)/.test(trimmed)) return false;
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return false;
  if (/^&[a-zA-Z]+;$/.test(trimmed)) return false;
  // Ignore standard placeholders / keys
  if (/^\{[a-zA-Z0-9_.]+\}$/.test(trimmed)) return false;
  // Must contain letters
  if (!/[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FAF]/.test(trimmed)) {
    return false;
  }
  return true;
}

function scanFileContent(filePath: string, rootDir: string): Issue[] {
  const code = fs.readFileSync(filePath, 'utf-8');
  const lines = code.split('\n');
  const issues: Issue[] = [];
  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

  let inMultiLineComment = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Comment handling
    if (inMultiLineComment) {
      if (trimmed.includes('*/')) {
        inMultiLineComment = false;
      }
      continue;
    }
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) inMultiLineComment = true;
      continue;
    }
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('import ') ||
      trimmed.startsWith('export type ') ||
      trimmed.startsWith('export interface ') ||
      trimmed.startsWith('interface ') ||
      trimmed.startsWith('type ')
    ) {
      continue;
    }

    // 1. Check for translatable attributes: attr="Hardcoded text"
    for (const attr of TRANSLATABLE_ATTRS) {
      const attrRegex = new RegExp(`\\b${attr}=["']([^"']+)["']`, 'gi');
      let match: RegExpExecArray | null;
      while ((match = attrRegex.exec(rawLine)) !== null) {
        const val = match[1];
        if (
          isTranslatableString(val) &&
          !val.startsWith('{') &&
          !val.startsWith('http') &&
          !val.includes('${') &&
          !/^[a-z0-9-_]+$/i.test(val) // ignore single token identifiers
        ) {
          issues.push({
            file: relPath,
            line: i + 1,
            column: match.index + 1,
            type: 'jsx-attribute',
            text: `${attr}="${val}"`,
            context: trimmed,
          });
        }
      }
    }

    // 2. Check for raw JSX text between > and <
    // Only check lines that look like JSX elements and not TypeScript generics
    if (/<[A-Za-z][^>]*>/.test(rawLine) || /<\/[A-Za-z]/.test(rawLine)) {
      const jsxTextRegex = />([^<>{}\n]+)</g;
      let textMatch: RegExpExecArray | null;
      while ((textMatch = jsxTextRegex.exec(rawLine)) !== null) {
        const textVal = textMatch[1].trim();
        // Ignore single words that are technical or types like Promise
        if (
          isTranslatableString(textVal) &&
          !textVal.startsWith('&') &&
          !textVal.endsWith('&') &&
          !textVal.includes('=>') &&
          textVal !== 'Promise' &&
          textVal !== 'ReactNode'
        ) {
          issues.push({
            file: relPath,
            line: i + 1,
            column: textMatch.index + 1,
            type: 'jsx-text',
            text: textVal,
            context: trimmed,
          });
        }
      }
    }

    // 3. Check for raw option text: <option value="...">Some Text</option>
    const optionRegex = /<option[^>]*>([^<]+)<\/option>/g;
    let optMatch: RegExpExecArray | null;
    while ((optMatch = optionRegex.exec(rawLine)) !== null) {
      const optVal = optMatch[1].trim();
      if (isTranslatableString(optVal) && !optVal.startsWith('{')) {
        issues.push({
          file: relPath,
          line: i + 1,
          column: optMatch.index + 1,
          type: 'jsx-text',
          text: optVal,
          context: trimmed,
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
