// frontend/src/components/changelog/changelogText.ts

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

/**
 * The text of a changelog post's (server-sanitised) HTML as one line, for the
 * preview shown while an entry is collapsed. Block boundaries become spaces so
 * "<li>a</li><li>b</li>" reads "a b", not "ab".
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|blockquote)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity])
    .replace(/\s+/g, ' ')
    .trim();
}
