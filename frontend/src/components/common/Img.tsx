// frontend/src/components/common/Img.tsx
// The site's one picture element. Pictures come from the backend (its host is only known at
// runtime), from links people paste and from data:/blob: URLs; the Next image optimizer can fetch
// none of them, and next/image without it renders this same <img> while adding ~6KB of gzip
// client JS to every route. So this stays the native element (see the .oxlintrc.json override).
import React from 'react';

export type ImgProps = React.ComponentProps<'img'> & { alt: string };

export function Img({ alt, ...rest }: ImgProps) {
  return <img alt={alt} {...rest} />;
}
