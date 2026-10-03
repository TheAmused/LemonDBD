// frontend/scripts/check-typography.ts
//
// Everything about how text looks is decided in ONE place: app/globals.css (the `@theme` tokens and the
// base rules). Components only use named tokens -- never a raw value, never a stock Tailwind palette.
// There are NO ignore directives: a violation is fixed by adding or using a token, not by silencing it.
//
// Fails on, in every .ts/.tsx file under src/ (tests excluded):
//
//   FAMILY    font-mono / font-sans / font-serif / font-display / font-[...], `fontFamily`, `font-family`,
//             and canvas `ctx.font = ...` that does not go through canvasFont()/canvasEmojiFont().
//   ARBITRARY an arbitrary typography value: text-[11px], text-[#fff], font-[600], tracking-[0.2em],
//             leading-[0.95], ... Sizes, weights, tracking and leading must be theme tokens.
//   COLOR     a stock Tailwind palette/bare colour on any colour utility (text-white, bg-amber-500/15,
//             border-sky-500, ...). Colours must be --color-* tokens from globals.css.
//   INLINE    inline-style typography/colour literals: fontSize, fontWeight, fontStyle, letterSpacing,
//             lineHeight, color set to a number or a hex/rgb/hsl string.
//   ROLE      a class list that spells out what a type role in globals.css (`@utility type-*`) already is
//             (size + weight + tracking + case + leading). Use the role, so one edit in globals.css
//             restyles every page.
//   DIRECTIVE any `*-ignore` comment (styles-ignore, i18n-ignore, fonts-ignore, ...).
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, sep } from "path";

const SRC = "src";
const EXEMPT_FILES = new Set(["src/utils/canvasFont.ts"]);

const VARIANTS = String.raw`(?:[\w\[\]&>*:.()=%-]+:)*`;
const PALETTE = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COLOR_PREFIX = "bg|text|border(?:-[tblrsexy])?|ring(?:-offset)?|outline|decoration|caret|fill|stroke|divide|from|via|to|shadow|placeholder";

const RULES: [string, RegExp][] = [
  ["FAMILY", new RegExp(String.raw`(?<![\w-])${VARIANTS}font-(?:mono|sans|serif|display|\[[^\]]*\]|\([^)]*\))(?![\w-])`, "g")],
  ["FAMILY", /\bfontFamily\b|\bfont-family\b/g],
  ["FAMILY", /\.font\s*=(?!\s*(?:canvasFont|canvasEmojiFont)\()/g],
  ["ARBITRARY", new RegExp(String.raw`(?<![\w-])${VARIANTS}(?:text|font|tracking|leading|indent|decoration)-\[[^\]]*\]`, "g")],
  ["COLOR", new RegExp(String.raw`(?<![\w-])${VARIANTS}(?:${COLOR_PREFIX})-(?:white|black|(?:${PALETTE})(?:-\d{2,3})?)(?:\/[\w.\[\]%]+)?(?![\w-])`, "g")],
  ["INLINE", /\b(?:fontSize|fontWeight|fontStyle|letterSpacing|lineHeight)\s*:\s*['"`]?[\d.]/g],
  ["INLINE", /\bcolor\s*:\s*['"`]?(?:#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()/g],
  ["DIRECTIVE", /(?:\/\/|\/\*)\s*[\w-]*-ignore\b/g],
];

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

// ---- type roles, read live from globals.css so there is exactly one definition ----
const ROLES = new Map<string, Set<string>>();
for (const m of readFileSync("src/app/globals.css", "utf-8").matchAll(/@utility (type-[\w-]+) \{ @apply ([^;]+); \}/g)) {
  ROLES.set(m[1], new Set(m[2].trim().split(/\s+/)));
}
const TYPO_TOKEN = new RegExp(
  String.raw`^${VARIANTS}(?:text-(?:xs|sm|base|lg|xl|[2-9]xl|micro|tiny|mini|compact)|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)|uppercase|tracking-[\w-]+|leading-[\w-]+)$`
);
const TITLE_ROLES = new Set(["type-page-title", "type-section-title"]);
const base = (t: string) => t.split(":").pop() as string;
function normalise(t: string): string {
  const b = base(t);
  const pre = t.slice(0, t.length - b.length);
  if (["font-semibold", "font-black", "font-extrabold"].includes(b)) return pre + "font-bold";
  if (["tracking-widest", "tracking-wide"].includes(b)) return pre + "tracking-wider";
  return t;
}
function roleFor(classList: string): string | null {
  const typo = classList.split(/\s+/).filter((t) => TYPO_TOKEN.test(t));
  if (!typo.length) return null;
  const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));
  const raw = new Set(typo);
  for (const [name, set] of ROLES) if (TITLE_ROLES.has(name) && same(set, raw)) return name;
  let norm = new Set(typo.map(normalise));
  if ([...norm].some((t) => base(t) === "uppercase") && ![...norm].some((t) => base(t).startsWith("tracking-"))) {
    norm = new Set([...norm, "tracking-wider"]);
  }
  for (const [name, set] of ROLES) if (!TITLE_ROLES.has(name) && same(set, norm)) return name;
  return null;
}
const CLASS_ATTR = /class(?:Name)?=(?:"([^"\n]*)"|\{`([^`$\n]*)`\})/g;

for (const file of walk(SRC)) {
  const rel = relative(".", file).split(sep).join("/");
  if (EXEMPT_FILES.has(rel)) continue;
  readFileSync(file, "utf-8")
    .split(/\r?\n/)
    .forEach((text, i) => {
      for (const m of text.matchAll(CLASS_ATTR)) {
        const role = roleFor(m[1] ?? m[2] ?? "");
        if (role) problems.push(`❌ ROLE: use "${role}" instead of spelling it out at ${rel}:${i + 1}`);
      }
      for (const [label, re] of RULES) {
        for (const m of text.matchAll(re)) {
          problems.push(`❌ ${label}: "${m[0].trim()}" at ${rel}:${i + 1}`);
        }
      }
    });
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n🚫 ${problems.length} typography violation(s). Use a token from app/globals.css (add one there if it is missing).\n`);
  process.exit(1);
}
console.log("✅ All typography (family, size, weight, tracking, leading, colour) comes from globals.css tokens.");
