// frontend/src/hooks/usePrivacyInfo.ts
import { useEffect, useState } from 'react';
import { apiUrl } from '@/utils/api';
import type { PrivacyInfo } from '@/utils/privacyPlaceholders';

/** Site facts (contact email, lifetimes) from `GET /api/v1/privacy-info`; null until loaded or if it fails. */
export function usePrivacyInfo(): PrivacyInfo | null {
  const [info, setInfo] = useState<PrivacyInfo | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl('/api/v1/privacy-info'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PrivacyInfo | null) => {
        if (!cancelled && data) setInfo(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return info;
}
