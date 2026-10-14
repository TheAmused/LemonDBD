// frontend/src/lib/download.ts
/**
 * Triggers a browser download of a Blob or string content with a given filename and optional MIME type.
 */
export function downloadFile(
  blobOrString: Blob | string,
  filename: string,
  mimeType: string = 'application/json'
): void {
  if (typeof window === 'undefined') return;

  const blob =
    blobOrString instanceof Blob
      ? blobOrString
      : new Blob([blobOrString], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
