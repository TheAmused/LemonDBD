// frontend/src/components/LemonIcon.tsx
import React from 'react';

interface LemonIconProps {
  className?: string;
  size?: number;
  alt?: string;
}

// Native aspect ratio of logo.webp (371x478), so the width/height hints below
// keep the browser's layout reservation accurate instead of implying a square.
const LOGO_ASPECT_RATIO = 478 / 371;

export const LemonIcon: React.FC<LemonIconProps> = ({
  className = 'w-6 h-6',
  size,
  alt = 'LemonDBD Logo',
}) => {
  const dimension = size || 24;

  return (
    <img
      src="/logo.webp"
      alt={alt}
      className={`select-none object-contain pointer-events-none inline-block ${className}`}
      style={size ? { width: size, height: size * LOGO_ASPECT_RATIO } : undefined}
      width={dimension}
      height={Math.round(dimension * LOGO_ASPECT_RATIO)}
      draggable={false}
    />
  );
};
