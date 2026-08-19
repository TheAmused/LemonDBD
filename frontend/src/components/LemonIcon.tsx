// frontend/src/components/LemonIcon.tsx
import React from 'react';

interface LemonIconProps {
  className?: string;
  size?: number;
  alt?: string;
}

export const LemonIcon: React.FC<LemonIconProps> = ({
  className = 'w-6 h-6',
  size,
  alt = 'LemonDBD Logo',
}) => {
  const dimension = size || 24;

  return (
    <img
      src="/icon.svg"
      alt={alt}
      className={`select-none object-contain pointer-events-none inline-block ${className}`}
      style={size ? { width: size, height: size } : undefined}
      width={dimension}
      height={dimension}
      draggable={false}
    />
  );
};
