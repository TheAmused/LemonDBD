import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

/** Ordered most-specific prefix first so `streaks/modes/` matches before `streaks/`. */
export const THUMB_WIDTH_RULES = [
  { prefix: 'tarot/', width: 320 },
  { prefix: 'streaks/modes/', width: 360 },
  { prefix: 'streaks/', width: 256 },
  { prefix: 'randomizer/', width: 400 },
];

const RASTER_EXT_RE = /\.(?:webp|png|jpe?g)$/i;
const DEFAULT_CONCURRENCY = 4;
const WEBP_QUALITY = 82;
const MTIME_EPSILON_MS = 2;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_IMAGES_ROOT = path.resolve(__dirname, '../public/images');

export function resolveThumbWidth(relPosix) {
  if (!RASTER_EXT_RE.test(relPosix)) return null;
  for (const rule of THUMB_WIDTH_RULES) {
    if (relPosix.startsWith(rule.prefix)) return rule.width;
  }
  return null;
}

async function collectSourceImages(rootDir, currentDir = rootDir, out = []) {
  let entries;
  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true });
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      return out;
    }
    throw err;
  }

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_thumbs') continue;
      await collectSourceImages(rootDir, fullPath, out);
      continue;
    }
    if (!entry.isFile()) continue;

    const relPosix = path.relative(rootDir, fullPath).split(path.sep).join('/');
    const width = resolveThumbWidth(relPosix);
    if (width !== null) {
      out.push({ srcPath: fullPath, relPosix, width });
    }
  }
  return out;
}

async function generateOne(srcPath, targetPath, width) {
  const srcStat = await fs.stat(srcPath);
  const thumbStat = await fs.stat(targetPath).catch(() => null);
  if (thumbStat && Math.abs(thumbStat.mtimeMs - srcStat.mtimeMs) < MTIME_EPSILON_MS) {
    return 'skipped';
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const tmpPath = `${targetPath}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`;

  try {
    await sharp(srcPath)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(tmpPath);
    await fs.utimes(tmpPath, srcStat.atime, srcStat.mtime);
    await fs.rename(tmpPath, targetPath);
  } catch (err) {
    await fs.unlink(tmpPath).catch(() => {});
    throw err;
  }

  return 'generated';
}

async function pruneOrphanedThumbs(dirPath, expectedTargets) {
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      return { pruned: 0, remaining: 0 };
    }
    throw err;
  }

  let pruned = 0;
  let remaining = 0;

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const sub = await pruneOrphanedThumbs(fullPath, expectedTargets);
      pruned += sub.pruned;
      if (sub.remaining === 0) {
        await fs.rmdir(fullPath).catch(() => {});
      } else {
        remaining += sub.remaining;
      }
    } else if (entry.isFile()) {
      if (!expectedTargets.has(path.resolve(fullPath))) {
        await fs.unlink(fullPath);
        pruned += 1;
      } else {
        remaining += 1;
      }
    }
  }

  return { pruned, remaining };
}

export async function buildPublicThumbs({
  imagesRoot = DEFAULT_IMAGES_ROOT,
  concurrency = DEFAULT_CONCURRENCY,
} = {}) {
  sharp.cache(false);

  const thumbsRoot = path.join(imagesRoot, '_thumbs');
  const sources = await collectSourceImages(imagesRoot);
  const expectedTargets = new Set();

  const tasks = sources.map(({ srcPath, relPosix, width }) => {
    const targetRel = relPosix.replace(RASTER_EXT_RE, '.webp');
    const targetPath = path.join(thumbsRoot, ...targetRel.split('/'));
    expectedTargets.add(path.resolve(targetPath));
    return { srcPath, targetPath, width };
  });

  let generated = 0;
  let skipped = 0;
  let nextIndex = 0;

  const workerCount = Math.min(Math.max(1, concurrency), Math.max(1, tasks.length));
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < tasks.length) {
        const current = tasks[nextIndex];
        nextIndex += 1;
        const outcome = await generateOne(current.srcPath, current.targetPath, current.width);
        if (outcome === 'generated') generated += 1;
        else skipped += 1;
      }
    }),
  );

  const { pruned } = await pruneOrphanedThumbs(thumbsRoot, expectedTargets);
  return { generated, skipped, pruned };
}

function isCliEntry() {
  const entry = process.argv[1];
  if (!entry) return false;
  const resolved = path.resolve(entry);
  return process.platform === 'win32'
    ? resolved.toLowerCase() === __filename.toLowerCase()
    : resolved === __filename;
}

if (isCliEntry()) {
  void buildPublicThumbs()
    .then((summary) => {
      console.log(
        `[build-public-thumbs] generated=${summary.generated} skipped=${summary.skipped} pruned=${summary.pruned}`,
      );
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    });
}
