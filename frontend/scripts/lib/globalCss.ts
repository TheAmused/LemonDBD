// frontend/scripts/lib/globalCss.ts
import { readFileSync } from "fs";
import { dirname, resolve } from "path";

/**
 * Local (relative) `@import` statements, in any of the forms CSS allows: `@import "./x.css";`,
 * `@import './x.css' layer(base);`, `@import url("./x.css");` ... A trailing comment is fine too.
 * Remote imports and the package import (`@import "tailwindcss";`) do not start with a dot and are
 * deliberately left alone.
 */
const LOCAL_IMPORT = /^[ \t]*@import[ \t]+(?:url\(\s*)?(["'])(\.[^"']+)\1\s*\)?[^;\n]*;?[ \t]*(?:\/\*.*?\*\/[ \t]*)?$/gm;

/** Any `@import` of a relative path, matched loosely -- used to prove `LOCAL_IMPORT` missed nothing. */
const ANY_LOCAL_IMPORT = /@import[^;\n]*["'(]\s*\.{1,2}\//;

/** Absolute paths of the partials `entry` imports, directly or through other partials, in cascade order. */
export function globalCssPartials(entry = "src/app/globals.css"): string[] {
  const seen: string[] = [];
  const walk = (file: string): void => {
    const css = readFileSync(file, "utf-8");
    for (const m of css.matchAll(LOCAL_IMPORT)) {
      const partial = resolve(dirname(file), m[2]);
      if (!seen.includes(partial)) {
        seen.push(partial);
        walk(partial);
      }
    }
  };
  walk(resolve(entry));
  return seen;
}

/**
 * The app's stylesheet as one string.
 *
 * `src/app/globals.css` is an entry file that `@import`s partials from `src/app/styles/`
 * (Tailwind inlines them at build time). Anything that inspects the CSS source -- the style
 * guards and the CSS contract tests -- reads it through here, so it sees the same single
 * stylesheet the build does, whichever partial a rule lives in.
 *
 * Throws if a relative `@import` survives inlining: that would mean the guards are reading less
 * CSS than the build, which must fail loudly instead of passing quietly.
 */
export function readGlobalCss(entry = "src/app/globals.css"): string {
  const inline = (file: string, trail: string[]): string => {
    if (trail.includes(file)) throw new Error(`Circular CSS @import: ${[...trail, file].join(" -> ")}`);
    return readFileSync(file, "utf-8").replace(LOCAL_IMPORT, (_match, _quote: string, spec: string) =>
      inline(resolve(dirname(file), spec), [...trail, file])
    );
  };
  const css = inline(resolve(entry), []);
  // Strip comments before looking for leftovers so prose in a comment cannot trip the check.
  const leftover = css.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").find((line) => ANY_LOCAL_IMPORT.test(line));
  if (leftover !== undefined) {
    throw new Error(`readGlobalCss could not inline this relative @import: ${leftover.trim()}`);
  }
  return css;
}
