'use client';
// frontend/src/components/user/RecoveryCodesPanel.tsx
//
// The one-time display of freshly generated recovery codes. The server never shows them again, so
// "Done" stays disabled until the person says they saved them.

import React, { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { useDictionary } from '@/context/DictionaryContext';

interface RecoveryCodesPanelProps {
  codes: string[];
  onDone: () => void;
}

export const RecoveryCodesPanel: React.FC<RecoveryCodesPanelProps> = ({ codes, onDone }) => {
  const t = useDictionary().twoFactor;
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the codes are on screen and can still be downloaded.
    }
  };

  const download = () => {
    const blob = new Blob([`${t.downloadFileHeader}\n\n${codes.join('\n')}\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lemondbd-recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 text-left">
      <h3 className="type-section-title text-text-primary">{t.codesTitle}</h3>
      <p className="type-body-lg text-text-muted">{t.codesIntro}</p>
      <ul className="grid grid-cols-2 gap-2 rounded-xl border border-border-color bg-bg-primary p-3 text-sm tracking-wider text-text-primary shadow-inner">
        {codes.map((code) => (
          <li key={code} className="text-center">
            <code>{code}</code>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={copy}
          leftIcon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        >
          <span>{copied ? t.copied : t.copyCodes}</span>
        </Button>
        <Button variant="secondary" size="sm" onClick={download} leftIcon={<Download className="h-3.5 w-3.5" />}>
          <span>{t.downloadCodes}</span>
        </Button>
      </div>
      <Checkbox checked={saved} onChange={setSaved}>
        <span className="type-body text-text-secondary">{t.savedCheckbox}</span>
      </Checkbox>
      <Button variant="primary" onClick={onDone} disabled={!saved} className="w-full">
        <span>{t.doneButton}</span>
      </Button>
    </div>
  );
};
