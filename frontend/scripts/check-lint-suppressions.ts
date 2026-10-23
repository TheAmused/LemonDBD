// frontend/scripts/check-lint-suppressions.ts
//
// Fails when linting is switched off anywhere: a suppression comment in any source or config
// file, a rule turned off in .oxlintrc.json, or files quietly added to its ignore list.
// `npm run build` runs this (prebuild) right after `npm run lint`.
//
// Standing exceptions: the image component (the single place allowed to render a bare <img>)
// and two custom ARIA widgets that have no native tag (a contentEditable textbox and a
// combobox with a rich listbox).
import fs from "node:fs";
import path from "node:path";

/** Rules that may be off, and only for exactly these files. */
const ALLOWED_RULE_OFFS: ReadonlyArray<{ files: readonly string[]; rule: string }> = [
  { files: ["src/components/common/Img.tsx"], rule: "nextjs/no-img-element" },
  {
    files: ["src/components/minigames/CharacterAutocomplete.tsx", "src/components/common/RichTextEditor.tsx"],
    rule: "jsx-a11y/prefer-tag-over-role",
  },
];

/** Paths oxlint may skip: generated output and the test suite. Anything else is a hidden suppression. */
const ALLOWED_IGNORE_PATTERNS: readonly string[] = [
  ".next/**",
  "out/**",
  "node_modules/**",
  "public/**",
  "next-env.d.ts",
  "coverage/**",
  "src/__tests__/**",
];

const SKIPPED_DIRS = new Set(["node_modules", ".next", "out", "coverage", "public", ".git"]);
const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".jsonc"]);
const SKIPPED_FILES = new Set(["package-lock.json"]);
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const DISABLED_LEVELS = new Set<string | number>(["off", "allow", 0]);

// Built from pieces so this file does not contain the very text it looks for.
const TOOLS = ["oxlint", "eslint", "tslint", "jshint"].join("|");
const BIOME = ["biome", "ignore"].join("-");
const DIRECTIVE = new RegExp(`(?:${TOOLS})-(?:disable|enable)|${BIOME}`);

function listFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) listFiles(path.join(dir, entry.name), out);
    } else if (
      SCANNED_EXTENSIONS.has(path.extname(entry.name)) &&
      !SKIPPED_FILES.has(entry.name) &&
      !entry.name.endsWith(".tsbuildinfo")
    ) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

/** JSON with comments and trailing commas (the .oxlintrc.json dialect) to a value. */
function parseJsonc(text: string): unknown {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      const start = i++;
      while (i < text.length && text[i] !== '"') i += text[i] === "\\" ? 2 : 1;
      out += text.slice(start, i + 1);
    } else if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (ch === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i + 2);
      i = i === -1 ? text.length : i + 1;
    } else {
      out += ch;
    }
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}

type Level = string | number | [string | number, ...unknown[]];
const levelOf = (value: Level): string | number => (Array.isArray(value) ? value[0] : value);
const isRecord = (v: unknown): v is Record<string, Level> => typeof v === "object" && v !== null && !Array.isArray(v);

function configProblems(root: string): string[] {
  const file = path.join(root, ".oxlintrc.json");
  if (!fs.existsSync(file)) return [".oxlintrc.json: missing, so nothing is linted"];
  const problems: string[] = [];
  const config = parseJsonc(fs.readFileSync(file, "utf8")) as {
    categories?: unknown;
    rules?: unknown;
    options?: { denyWarnings?: boolean };
    ignorePatterns?: string[];
    overrides?: Array<{ files?: string[]; rules?: unknown }>;
  };

  for (const [name, level] of Object.entries(isRecord(config.categories) ? config.categories : {})) {
    if (DISABLED_LEVELS.has(levelOf(level))) problems.push(`.oxlintrc.json: category "${name}" is turned off`);
  }
  for (const [rule, level] of Object.entries(isRecord(config.rules) ? config.rules : {})) {
    if (DISABLED_LEVELS.has(levelOf(level))) problems.push(`.oxlintrc.json: rule "${rule}" is turned off`);
  }
  for (const override of config.overrides ?? []) {
    const files = override.files ?? [];
    for (const [rule, level] of Object.entries(isRecord(override.rules) ? override.rules : {})) {
      if (!DISABLED_LEVELS.has(levelOf(level))) continue;
      const allowed = ALLOWED_RULE_OFFS.some(
        (a) => a.rule === rule && files.length === a.files.length && files.every((f) => a.files.includes(f)),
      );
      if (!allowed) problems.push(`.oxlintrc.json: rule "${rule}" is turned off for ${files.join(", ") || "(no files)"}`);
    }
  }
  for (const pattern of config.ignorePatterns ?? []) {
    if (!ALLOWED_IGNORE_PATTERNS.includes(pattern)) problems.push(`.oxlintrc.json: ignorePatterns skips "${pattern}"`);
  }
  if (config.options?.denyWarnings !== true) problems.push(".oxlintrc.json: options.denyWarnings must be true (a warning has to fail the lint)");
  return problems;
}

/** Every place linting is switched off under `root` (the frontend folder), one line each. */
export function findLintSuppressions(root: string): string[] {
  const problems = configProblems(root);
  for (const file of listFiles(root)) {
    if (fs.statSync(file).size > MAX_FILE_BYTES) continue;
    const name = path.relative(root, file).split(path.sep).join("/");
    fs.readFileSync(file, "utf8")
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (DIRECTIVE.test(line)) problems.push(`${name}:${i + 1}: ${line.trim().slice(0, 120)}`);
      });
  }
  return problems;
}

if (require.main === module) {
  const problems = findLintSuppressions(process.cwd());
  if (problems.length > 0) {
    console.error(`[check-lint-suppressions] Linting is switched off in ${problems.length} place(s). Fix the code instead:\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log("[check-lint-suppressions] No lint suppressions found.");
}
