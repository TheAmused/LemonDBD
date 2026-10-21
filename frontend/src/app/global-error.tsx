'use client';
// frontend/src/app/global-error.tsx
//
// Last-resort error boundary: replaces the root layout when app/[locale]/layout.tsx itself throws.
// The markup lives in GlobalErrorDocument (it must not depend on any provider); this file adds the
// global styles, which the crashed layout would otherwise have loaded.

import { GlobalErrorDocument } from '@/components/layout/GlobalErrorDocument';
import '@/app/globals.css';

export default GlobalErrorDocument;
