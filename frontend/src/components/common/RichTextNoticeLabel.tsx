// frontend/src/components/common/RichTextNoticeLabel.tsx
'use client';

import React from 'react';
import { useDictionary } from '@/context/DictionaryContext';

/** The "Notice" tag of a rich-text callout; its own client leaf so RichText itself stays hook-free. */
export const RichTextNoticeLabel: React.FC<{ className: string; label?: string }> = ({ className, label }) => {
  const dict = useDictionary();
  return <span className={className}>{label ?? dict.app.notice}</span>;
};
