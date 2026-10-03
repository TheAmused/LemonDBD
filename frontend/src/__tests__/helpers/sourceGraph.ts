// frontend/src/__tests__/helpers/sourceGraph.ts
//
// Shared, dependency-free source scanning for the code-quality guard tests: every
// production module under src/, parsed once, plus a static/dynamic import graph.
import fs from 'node:fs';
import path from 'node:path';
import { ts } from 'ts-morph';

export const SRC = path.resolve(__dirname, '../..');

export interface SourceModule {
  /** Path relative to src/, forward slashes. */
  file: string;
  text: string;
  lines: string[];
  ast: ts.SourceFile;
  isClient: boolean;
  /** Resolved module files imported with a static `import` / `export … from`. */
  staticImports: string[];
  /** Like staticImports but also `import type` (compile-time edges: dead-file detection). */
  typeImports: string[];
  /** Resolved module files imported with `import()` (incl. next/dynamic). */
  dynamicImports: string[];
  /** Bare specifiers (packages) imported statically. */
  packages: string[];
  dynamicPackages: string[];
}

const EXTS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

export const rel = (f: string) => path.relative(SRC, f).split(path.sep).join('/');

export function parse(file: string, text: string): ts.SourceFile {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

export function lineOf(sf: ts.SourceFile, node: ts.Node): number {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

function resolveSpecifier(from: string, spec: string, known: Set<string>): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = spec.slice(2);
  else if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  else return null;
  if (known.has(base)) return base;
  for (const ext of EXTS) if (known.has(base + ext)) return base + ext;
  return null;
}

let cache: SourceModule[] | null = null;

/** Every production module (tests and node_modules excluded), with its import edges. */
export function loadModules(): SourceModule[] {
  if (cache) return cache;
  const raw = walk(SRC).map((f) => {
    const file = rel(f);
    const text = fs.readFileSync(f, 'utf8');
    return { file, text, ast: parse(file, text) };
  });
  const known = new Set(raw.map((r) => r.file));
  cache = raw.map(({ file, text, ast }) => {
    const staticImports: string[] = [];
    const typeImports: string[] = [];
    const dynamicImports: string[] = [];
    const packages: string[] = [];
    const dynamicPackages: string[] = [];
    const add = (spec: string, dynamic: boolean) => {
      const resolved = resolveSpecifier(file, spec, known);
      if (resolved) (dynamic ? dynamicImports : staticImports).push(resolved);
      else if (!spec.startsWith('.') && !spec.startsWith('@/')) (dynamic ? dynamicPackages : packages).push(spec);
    };
    const visit = (n: ts.Node) => {
      if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
        const typeOnly = ts.isImportDeclaration(n) ? n.importClause?.isTypeOnly : n.isTypeOnly;
        if (!typeOnly) add(n.moduleSpecifier.text, false);
        else {
          const r = resolveSpecifier(file, n.moduleSpecifier.text, known);
          if (r) typeImports.push(r);
        }
      } else if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) {
        add(n.arguments[0].text, true);
      }
      ts.forEachChild(n, visit);
    };
    visit(ast);
    const head = text.replace(/^﻿/, '').replace(/^(\s*\/\/.*\r?\n|\s*\/\*[\s\S]*?\*\/\s*)*/, '');
    return {
      file,
      text,
      lines: text.split(/\r?\n/),
      ast,
      isClient: /^['"]use client['"]/.test(head),
      staticImports,
      typeImports,
      dynamicImports,
      packages,
      dynamicPackages,
    };
  });
  return cache;
}

/** Non-locale production modules (locale bundles are data, not code). */
export const codeModules = () => loadModules().filter((m) => !m.file.startsWith('locales/'));

/** Walks the AST of every code module, collecting `file:line` for each node `visit` flags. */
export function scanAst(visit: (n: ts.Node, m: SourceModule) => boolean, skip: (m: SourceModule) => boolean = () => false): string[] {
  const bad: string[] = [];
  for (const m of codeModules()) {
    if (skip(m)) continue;
    const go = (n: ts.Node) => {
      if (visit(n, m)) bad.push(`${m.file}:${lineOf(m.ast, n)}`);
      ts.forEachChild(n, go);
    };
    go(m.ast);
  }
  return bad;
}

export function scanLines(re: RegExp, skip: (m: SourceModule) => boolean = () => false): string[] {
  const bad: string[] = [];
  for (const m of codeModules()) {
    if (skip(m)) continue;
    m.lines.forEach((l, i) => {
      if (re.test(l)) bad.push(`${m.file}:${i + 1}  ${l.trim().slice(0, 100)}`);
    });
  }
  return bad;
}

/** Modules reachable from `roots` by following static imports only. */
export function staticReach(roots: string[]): Set<string> {
  const byFile = new Map(loadModules().map((m) => [m.file, m]));
  const seen = new Set<string>();
  const stack = [...roots];
  while (stack.length) {
    const f = stack.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    for (const n of byFile.get(f)?.staticImports ?? []) stack.push(n);
  }
  return seen;
}

/** App Router entry points: pages, layouts, loading/error/not-found, route handlers, proxy. */
export const isEntry = (f: string) =>
  /^app\/(.*\/)?(page|layout|loading|error|not-found|global-error|template|route|default|icon|opengraph-image|sitemap|robots)\.tsx?$/.test(f) ||
  f === 'proxy.ts' ||
  f === 'middleware.ts' ||
  f === 'instrumentation.ts';

/** Strongly connected components of size > 1 (import cycles), static imports only. */
export function findCycles(): string[][] {
  const mods = loadModules();
  const graph = new Map(mods.map((m) => [m.file, m.staticImports]));
  let index = 0;
  const idx = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const out: string[][] = [];
  const strong = (v: string) => {
    idx.set(v, index);
    low.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!graph.has(w)) continue;
      if (!idx.has(w)) {
        strong(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) low.set(v, Math.min(low.get(v)!, idx.get(w)!));
    }
    if (low.get(v) === idx.get(v)) {
      const comp: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        comp.push(w);
      } while (w !== v);
      if (comp.length > 1 || (graph.get(v) ?? []).includes(v)) out.push(comp.sort());
    }
  };
  for (const v of graph.keys()) if (!idx.has(v)) strong(v);
  return out;
}

export interface ExportInfo {
  file: string;
  name: string;
  line: number;
}

/** Names exported by a module (`default` included). */
export function exportsOf(m: SourceModule): ExportInfo[] {
  const out: ExportInfo[] = [];
  const add = (name: string, node: ts.Node) => out.push({ file: m.file, name, line: lineOf(m.ast, node) });
  const hasExport = (n: ts.Node) => ts.canHaveModifiers(n) && ts.getModifiers(n)?.some((x) => x.kind === ts.SyntaxKind.ExportKeyword);
  const hasDefault = (n: ts.Node) => ts.canHaveModifiers(n) && ts.getModifiers(n)?.some((x) => x.kind === ts.SyntaxKind.DefaultKeyword);
  for (const st of m.ast.statements) {
    if (ts.isExportAssignment(st)) add('default', st);
    else if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause) && !st.moduleSpecifier) {
      for (const e of st.exportClause.elements) add(e.name.text, e);
    } else if (hasExport(st)) {
      if (hasDefault(st)) add('default', st);
      else if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) add(d.name.text, d);
      else if (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isEnumDeclaration(st)) {
        const nm = (st as ts.DeclarationStatement).name;
        if (nm && ts.isIdentifier(nm)) add(nm.text, st);
      }
    }
  }
  return out;
}

/** file -> names imported from it anywhere (`*` = namespace/dynamic/re-export-all: everything used). */
export function usedExports(includeTests = true): Map<string, Set<string>> {
  const mods = loadModules();
  const known = new Set(mods.map((x) => x.file));
  const used = new Map<string, Set<string>>();
  const mark = (file: string, name: string) => {
    if (!used.has(file)) used.set(file, new Set());
    used.get(file)!.add(name);
  };
  const scanTree = (file: string, ast: ts.SourceFile) => {
    const visit = (n: ts.Node) => {
      if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
        const target = resolveSpecifier(file, n.moduleSpecifier.text, known);
        if (target) {
          if (ts.isImportDeclaration(n)) {
            const c = n.importClause;
            if (!c) mark(target, '*');
            else {
              if (c.name) mark(target, 'default');
              if (c.namedBindings && ts.isNamespaceImport(c.namedBindings)) mark(target, '*');
              else if (c.namedBindings) for (const e of c.namedBindings.elements) mark(target, (e.propertyName ?? e.name).text);
            }
          } else if (n.exportClause && ts.isNamedExports(n.exportClause)) for (const e of n.exportClause.elements) mark(target, (e.propertyName ?? e.name).text);
          else mark(target, '*');
        }
      } else if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) {
        const target = resolveSpecifier(file, n.arguments[0].text, known);
        if (target) mark(target, '*');
      }
      ts.forEachChild(n, visit);
    };
    visit(ast);
  };
  for (const m of mods) scanTree(m.file, m.ast);
  if (includeTests) {
    const dir = path.join(SRC, '__tests__');
    const stack = [dir];
    while (stack.length) {
      const d = stack.pop()!;
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) stack.push(full);
        else if (/\.(ts|tsx)$/.test(e.name)) scanTree(rel(full), parse(rel(full), fs.readFileSync(full, 'utf8')));
      }
    }
  }
  return used;
}
