import React from 'react';

interface LemonIconProps {
  className?: string;
  size?: number;
}

export const LemonIcon: React.FC<LemonIconProps> = ({ className = 'w-6 h-6', size }) => {
  return (
    <img
      src="/icon.svg"
      alt="LemonDBD Logo"
      className={`select-none object-contain pointer-events-none inline-block ${className}`}
      style={size ? { width: size, height: size } : undefined}
      width={size || 24}
      height={size || 24}
      draggable={false}
    />
  );
};