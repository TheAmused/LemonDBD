'use client';
// frontend/src/components/icons/dbd/IridescentShardIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Smash-or-Pass leaderboard: Iridescent Shard / Ultra-Rare Tier.
 * Upgraded & upscaled into a razor-sharp, multi-faceted iridescent crystal prism
 * with complex internal refraction angles, prismatic table facets, and radiant glints.
 */
export const IridescentShardIcon: React.FC<DbdIconProps> = ({
  className,
  strokeWidth = 1.7,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Outer prismatic shard silhouette */}
    <polygon
      points="12,1.5 19.5,7 12,23 4.5,7"
      strokeWidth={2}
      fill="currentColor"
      fillOpacity={0.1}
    />

    {/* Horizontal girdle line separating crown from pavilion */}
    <path d="M4.5 7h15" strokeWidth={1.7} />

    {/* Upper crown facets */}
    {/* Table facet center */}
    <polygon
      points="12,1.5 15.5,7 12,5 8.5,7"
      fill="currentColor"
      fillOpacity={0.4}
      stroke="currentColor"
      strokeWidth={1.2}
    />
    <path d="M12 1.5v3.5" strokeWidth={1.4} />

    {/* Lower pavilion facets tapering to stiletto point */}
    {/* Central pavilion facet */}
    <polygon
      points="8.5,7 15.5,7 12,23"
      fill="currentColor"
      fillOpacity={0.25}
      stroke="currentColor"
      strokeWidth={1.5}
    />
    {/* Vertical facet spine */}
    <path d="M12 5v18" strokeWidth={1.8} />

    {/* Cross-cutting internal light refraction lines */}
    <path d="M4.5 7L12 15l7.5-8" strokeWidth={1.3} strokeOpacity={0.7} />
    <path d="M8.5 7L12 18l3.5-11" strokeWidth={1.2} strokeOpacity={0.8} />

    {/* Left pavilion facet shading */}
    <polygon
      points="4.5,7 8.5,7 12,23"
      fill="currentColor"
      fillOpacity={0.15}
      stroke="none"
    />

    {/* Ultra-rare iridescent sparkle glints */}
    <path d="M20.5 4.5l.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8z" fill="currentColor" stroke="none" />
    <circle cx="3" cy="9.5" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="19.5" cy="18" r="0.7" fill="currentColor" stroke="none" />
  </svg>
);
