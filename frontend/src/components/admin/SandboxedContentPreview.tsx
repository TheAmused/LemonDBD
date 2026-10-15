'use client';
// frontend/src/components/admin/SandboxedContentPreview.tsx
import React, { useMemo, useState } from 'react';
import { EyeOff, Eye, FileJson } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import { backendBase } from '@/utils/staticUrl';
import { buildEvidencePreview, isSafePreviewImage, parseEvidence } from '@/utils/contentPreview';

const RAW_LIMIT = 20_000;

/**
 * Shows reported, untrusted content to an admin. Everything is rendered as plain text; images stay
 * hidden until the admin chooses to load them (a reported image can be shocking, and fetching a
 * remote URL tells its host that an admin looked), and only https or inline raster images ever load.
 */
export function SandboxedContentPreview({ evidence }: { evidence: string }) {
  const dict = useDictionary();
  const [showImages, setShowImages] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const preview = useMemo(() => buildEvidencePreview(evidence), [evidence]);
  const raw = useMemo(() => {
    const doc = parseEvidence(evidence);
    const text = doc ? JSON.stringify(doc, null, 2) : evidence;
    return text.length > RAW_LIMIT ? `${text.slice(0, RAW_LIMIT)}\n…` : text;
  }, [evidence]);

  if (!preview) {
    return <p className="text-xs text-text-muted">{dict.admin.contentReportUnreadable}</p>;
  }

  const loadable = preview.images
    .filter((src) => src.startsWith('/static/') || isSafePreviewImage(src))
    .map((src) => (src.startsWith('/static/') ? `${backendBase}${src}` : src));
  const blocked = preview.images.length - loadable.length;

  return (
    <div className="space-y-4">
      {(preview.title || preview.description) && (
        <div className="space-y-1">
          {preview.title && <h4 className="type-strong text-text-primary break-words">{preview.title}</h4>}
          {preview.description && <p className="text-xs text-text-secondary break-words whitespace-pre-wrap">{preview.description}</p>}
        </div>
      )}

      {preview.texts.length > 0 && (
        <div>
          <p className="type-label-sm text-text-secondary mb-1.5">
            {formatMessage(dict.admin.contentReportTextCount, { count: String(preview.texts.length) })}
          </p>
          <ul className="max-h-64 overflow-y-auto rounded-card border border-border-subtle bg-bg-primary p-3 space-y-1.5">
            {preview.texts.map((text, index) => (
              <li key={index} className="text-xs text-text-primary break-words whitespace-pre-wrap">
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview.images.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="type-label-sm text-text-secondary">
              {formatMessage(dict.admin.contentReportImageCount, { count: String(preview.images.length) })}
            </p>
            <Button size="xs" onClick={() => setShowImages((v) => !v)} aria-pressed={showImages}>
              {showImages ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showImages ? dict.admin.contentReportHideImages : dict.admin.contentReportShowImages}
            </Button>
          </div>
          {showImages ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {loadable.map((src, index) => (
                <img
                  key={index}
                  src={src}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="aspect-square w-full rounded-chip border border-border-subtle bg-bg-primary object-cover"
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted">{dict.admin.contentReportImagesHidden}</p>
          )}
          {showImages && blocked > 0 && (
            <p className="text-xs text-text-muted">
              {formatMessage(dict.admin.contentReportImagesBlocked, { count: String(blocked) })}
            </p>
          )}
        </div>
      )}

      {preview.truncated && <p className="text-xs text-accent-amber">{dict.admin.contentReportTruncated}</p>}

      <div className="space-y-2">
        <Button size="xs" onClick={() => setShowRaw((v) => !v)} aria-expanded={showRaw}>
          <FileJson className="h-3.5 w-3.5" />
          {showRaw ? dict.admin.contentReportHideRaw : dict.admin.contentReportShowRaw}
        </Button>
        {showRaw && (
          <pre className="max-h-80 overflow-auto rounded-card border border-border-subtle bg-bg-primary p-3 type-caption text-text-secondary whitespace-pre-wrap break-all">
            {raw}
          </pre>
        )}
      </div>
    </div>
  );
}
