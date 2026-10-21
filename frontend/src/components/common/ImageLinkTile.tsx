// frontend/src/components/common/ImageLinkTile.tsx
// A picture that opens full size in a new tab (an attachment, a screenshot): fixed-height tile, cropped
// image, an "opens elsewhere" mark on hover. For a small square picture in a list row use Thumb.
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Img } from '@/components/common/Img';

export interface ImageLinkTileProps {
  href: string;
  /** The picture to show (usually the same file as href). */
  src: string;
  /** Names the link for screen readers. */
  label: string;
  className?: string;
}

export function ImageLinkTile({ href, src, label, className }: ImageLinkTileProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={cn(
        'group relative block h-28 overflow-hidden rounded-control border border-border-color bg-bg-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red',
        className
      )}
    >
      <Img src={src} alt={label} className="h-full w-full object-cover transition-opacity group-hover:opacity-80" />
      <ExternalLink className="icon-md absolute right-2 top-2 text-text-inverted opacity-0 drop-shadow transition-opacity group-hover:opacity-100" aria-hidden="true" />
    </a>
  );
}
