// frontend/scripts/check-fonts.ts
//
// Fonts are defined in ONE place: app/globals.css (`--font-sans`, `--font-display`, `--font-mono` and
// the rules that apply them). No component may pick a font family of its own, so that a single edit in
// globals.css restyles the whole site. This script fails when it finds any of:
//
//   1. a Tailwind font-family utility: font-mono, font-sans, font-serif, font-display, font-[...]
//      (with or without variants such as `sm:` or `hover:`);
//   2. `fontFamily` / `font-family` in TS/TSX (inline styles, <style> text, SVG attributes);
//   3. canvas text that sets `ctx.font = ...` without going through canvasFont()/canvasEmojiFont() from
//      utils/canvasFont.ts, which reads the site's font stack from globals.css.
//
// Font WEIGHT / SIZE utilities (font-bold, text-sm, ...) are fine; only the family is centralised.
// A deliberate exception needs a `// fonts-ignore` comment on the same or the previous line.
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, sep } from "path";

const SRC = "src";
const EXEMPT_FILES = new Set(["src/utils/canvasFont.ts"]);

const FAMILY_CLASS = /(?<![\w-])(?:[\w\[\]&>*:.()-]+:)*font-(?:mono|sans|serif|display|\[[^\]]*\]|\([^)]*\))(?![\w-])/g;
const FAMILY_PROP = /\bfontFamily\b|\bfont-family\b/g;
const CANVAS_FONT = /\.font\s*=(?!\s*(?:canvasFont|canvasEmojiFont)\()/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const problems: string[] = [];

for (const file of walk(SRC)) {
  const rel = relative(".", file).split(sep).join("/");
  if (EXEMPT_FILES.has(rel)) continue;
  const lines = readFileSync(file, "utf-8").split(/\r?\n/);
  lines.forEach((text, i) => {
    if (text.includes("fonts-ignore") || (lines[i - 1] ?? "").includes("fonts-ignore")) return;
    const checks: [RegExp, string][] = [
      [FAMILY_CLASS, "Tailwind font-family utility"],
      [FAMILY_PROP, "hardcoded fontFamily/font-family"],
      [CANVAS_FONT, "canvas font not set through canvasFont()"],
    ];
    for (const [re, label] of checks) {
      for (const m of text.matchAll(re)) {
        problems.push(`❌ ${label} "${m[0].trim()}" at ${rel}:${i + 1} -- fonts live in app/globals.css`);
      }
    }
  });
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error("\n🚫 Move font choices into app/globals.css (or use canvasFont() for canvas text).\n");
  process.exit(1);
}
console.log("✅ No hardcoded font families found.");
