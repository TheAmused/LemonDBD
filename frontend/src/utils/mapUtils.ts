import type { MapRealm } from '@/types/map';

const DEFAULT_BACKEND_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Resolves the displayable image source URL for a map realm.
 * Handles local static paths by prefixing backendBase/static/ and remote URLs.
 */
export function getMapImageSrc(
  map: Partial<MapRealm> | null | undefined,
  backendBase: string = DEFAULT_BACKEND_BASE
): string {
  if (!map) return '';
  const cleanBase = (backendBase || DEFAULT_BACKEND_BASE).replace(/\/+$/, '');
  if (map.callout_image_local_path) {
    const clean = map.callout_image_local_path.replace(/^\/?(static\/)?/, '');
    return `${cleanBase}/static/${clean}`;
  }
  return map.callout_image_url || map.image_url || '';
}

/**
 * Opens a popout window containing the high-resolution map image in full view.
 */
export function handlePopoutImageWindow(url: string, title: string): void {
  if (typeof window === 'undefined' || !url) return;
  const w = window.open('', '_blank', 'width=1200,height=900,resizable=yes,scrollbars=yes');
  if (w && w.document) {
    w.document.title = `${title} - Map Guide`;
    w.document.body.style.margin = '0';
    w.document.body.style.background = '#090d16';
    w.document.body.style.display = 'flex';
    w.document.body.style.alignItems = 'center';
    w.document.body.style.justifyContent = 'center';
    w.document.body.style.minHeight = '100vh';
    w.document.body.style.fontFamily = 'system-ui, sans-serif';
    w.document.body.style.color = '#fff';

    if (typeof w.document.body.replaceChildren === 'function') {
      w.document.body.replaceChildren();
    } else {
      w.document.body.textContent = '';
    }

    const img = w.document.createElement('img');
    img.src = url;
    img.alt = title;
    img.style.maxWidth = '98vw';
    img.style.maxHeight = '95vh';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '12px';
    img.style.boxShadow = '0 10px 40px rgba(0,0,0,0.8)';
    w.document.body.appendChild(img);
  }
}
