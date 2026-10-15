'use client';
// frontend/src/components/auth/QrCode.tsx
//
// Draws a QR code in the browser. The otpauth:// URI contains the account's TOTP secret, so it must
// never be sent to an image-generating web service: encoding happens here, with no network call.

import React, { useMemo } from 'react';
import { encode } from 'uqr';

interface QrCodeProps {
  value: string;
  label: string;
  className?: string;
}

/** One SVG path: a horizontal run of dark modules per row. */
function buildPath(rows: boolean[][], border: number): string {
  const parts: string[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x += 1;
      parts.push(`M${start + border} ${y + border}h${x - start}v1h${-(x - start)}z`);
    }
  });
  return parts.join('');
}

export const QrCode: React.FC<QrCodeProps> = ({ value, label, className }) => {
  const { path, size } = useMemo(() => {
    const border = 4; // the quiet zone scanners need around the code
    try {
      const { data, size: modules } = encode(value || ' ', { ecc: 'M', border: 0 });
      return { path: buildPath(data, border), size: modules + border * 2 };
    } catch {
      return { path: '', size: 29 };
    }
  }, [value]);

  // Always black on white, whatever the site theme: scanners need that contrast, so these two
  // fills deliberately do not follow the theme tokens.
  return (
    <svg
      role="img"
      aria-label={label}
      width={192}
      height={192}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={`rounded-chip ${className ?? ''}`}
    >
      <rect width={size} height={size} fill="white" />
      <path d={path} fill="black" />
    </svg>
  );
};
