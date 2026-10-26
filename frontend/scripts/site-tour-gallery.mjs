// frontend/scripts/site-tour-gallery.mjs
// Standalone offline zero-dependency HTML5 Visual Explorer generator for LemonDBD site tour.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, VIEWPORTS } from './site-tour-catalog.mjs';
import { galleryBaseCss } from './gallery/galleryBaseCss.mjs';
import { galleryComponentCss } from './gallery/galleryComponentCss.mjs';
import { galleryMarkup } from './gallery/galleryMarkup.mjs';
import { galleryClientCore } from './gallery/galleryClientCore.mjs';
import { galleryClientInteractions } from './gallery/galleryClientInteractions.mjs';

/**
 * Builds the complete standalone HTML string for the site tour gallery.
 * @param {object|null} manifest - The tour manifest object or null for empty template.
 * @param {object} [_options] - Additional generator options.
 * @returns {string} Fully formed standalone HTML5 document.
 */
export function generateGalleryHtml(manifest = null, _options = {}) {
  const safeManifest = manifest && typeof manifest === 'object' ? manifest : {
    generatedAt: new Date().toISOString(),
    summary: { totalPages: 0, totalModals: 0, viewports: ['desktop', 'laptop', 'tablet', 'mobile'], totalScreenshots: 0 },
    items: [],
  };

  const embeddedData = JSON.stringify(safeManifest).replace(/</g, '\\u003c');
  const categoriesData = JSON.stringify(CATEGORIES || []).replace(/</g, '\\u003c');
  const viewportsData = JSON.stringify(VIEWPORTS || []).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LemonDBD Site Tour Gallery</title>
  <meta name="description" content="Offline visual tour and responsive screenshot explorer for LemonDBD" />
  <style>
${galleryBaseCss}
${galleryComponentCss}
  </style>
</head>
${galleryMarkup}
  <script>
    window.__EMBEDDED_MANIFEST__ = ${embeddedData};
    window.__EMBEDDED_CATEGORIES__ = ${categoriesData};
    window.__EMBEDDED_VIEWPORTS__ = ${viewportsData};
${galleryClientCore}
${galleryClientInteractions}
  </script>
</body>
</html>`;
}

/**
 * Writes the generated HTML gallery directly to a target file path.
 * @param {string} targetPath - Absolute or relative file path for index.html.
 * @param {object|null} manifest - Tour manifest object.
 * @returns {string} The path where the gallery was written.
 */
export function writeGalleryFile(targetPath, manifest = null) {
  const html = generateGalleryHtml(manifest);
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(targetPath, html, 'utf-8');
  return targetPath;
}

// Auto-run if executed directly as a script
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const targetHtml = path.resolve(projectRoot, 'additions/screenshots/index.html');
  const manifestPath = path.resolve(projectRoot, 'additions/screenshots/manifest.json');

  let manifestData = null;
  if (fs.existsSync(manifestPath)) {
    try {
      manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      console.log(`Loaded existing manifest from: ${manifestPath}`);
    } catch (e) {
      console.warn(`Could not parse ${manifestPath}, using default empty manifest.`, e.message);
    }
  }

  writeGalleryFile(targetHtml, manifestData);
  console.log(`Wrote visual gallery to: ${targetHtml}`);
}
