// frontend/scripts/lib/fileArgs.ts
// `--files a.tsx,b.tsx` (or `--files a.tsx b.tsx`) for the source scans, so the Stop hook and the
// affected-test runner can check only the files a change touched. Paths may be relative to the
// frontend folder or to the repository root (`frontend/src/...`). Without `--files` the scans
// cover the whole of `src/`, as before.
import fs from "node:fs";
import path from "node:path";

const FRONTEND = path.resolve(__dirname, "..", "..");

/** The `--files` list, resolved to existing absolute paths; null when the flag is absent. */
export function fileArgs(argv: string[] = process.argv.slice(2)): string[] | null {
  const at = argv.indexOf("--files");
  if (at === -1) return null;
  const raw: string[] = [];
  for (const arg of argv.slice(at + 1)) {
    if (arg.startsWith("--")) break;
    raw.push(...arg.split(",").filter(Boolean));
  }
  return raw
    .map((p) => p.replace(/\\/g, "/").replace(/^frontend\//, ""))
    .map((p) => path.resolve(FRONTEND, p))
    .filter((p) => fs.existsSync(p));
}

/** Add either the `--files` list (filtered to `extensions`) or `defaultGlob` to a ts-morph project; tests are never scanned. */
export function addScanFiles(
  project: { addSourceFilesAtPaths(p: string | string[]): unknown; addSourceFileAtPath(p: string): unknown },
  defaultGlob: string,
  extensions: string[],
): void {
  const files = fileArgs();
  // Tests render components with throwaway labels; they are not user-facing copy or styling.
  if (files === null) {
    project.addSourceFilesAtPaths([defaultGlob, "!src/__tests__/**"]);
    return;
  }
  const srcRoot = path.join(FRONTEND, "src") + path.sep;
  const testsRoot = path.join(srcRoot, "__tests__") + path.sep;
  for (const file of files) {
    if (file.startsWith(srcRoot) && !file.startsWith(testsRoot) && extensions.includes(path.extname(file))) project.addSourceFileAtPath(file);
  }
}
