// frontend/src/components/icons/dbd/types.ts
//
// Shared prop type for every custom DBD-themed icon: matches lucide-react's
// own SVG contract (SVGProps<SVGSVGElement>) so className/aria-hidden/etc.
// pass through identically to the lucide icons these replace.

import React from 'react';

export type DbdIconProps = React.SVGProps<SVGSVGElement>;
