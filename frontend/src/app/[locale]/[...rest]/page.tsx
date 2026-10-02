// frontend/src/app/[locale]/[...rest]/page.tsx
//
// Catches every URL under a locale that no page owns, so it renders the real 404 page (with the
// sidebar) from `../not-found.tsx` instead of Next's bare default.
import { notFound } from 'next/navigation';

export default function UnknownPage(): never {
  notFound();
}
