'use client';
// frontend/src/components/admin/LocalizedTextControl.tsx
//
// One text in every language, in one field: a language picker beside the text. English is the setting
// itself, the other languages are its `<key>_<code>` siblings; a language left empty falls back to English.
import React, { useState } from 'react';
import { CustomDropdown, type DropdownOption } from '@/components/common/CustomDropdown';
import { Input } from '@/components/common/Field';
import { LANGUAGES } from '@/components/sidebar/SidebarBottomControls';
import { i18n } from '@/i18n/config';

interface LocalizedTextControlProps {
  /** The English setting; the other languages are `<baseKey>_<code>`. */
  baseKey: string;
  maxLength: number;
  ariaLabel: string;
  valueOf: (key: string) => string;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
}

const keyFor = (baseKey: string, code: string) => (code === i18n.defaultLocale ? baseKey : `${baseKey}_${code}`);

export function LocalizedTextControl({ baseKey, maxLength, ariaLabel, valueOf, onChange, disabled }: LocalizedTextControlProps) {
  const [code, setCode] = useState<string>(i18n.defaultLocale);
  const key = keyFor(baseKey, code);
  const value = valueOf(key);
  // A dot marks the languages that already have a text.
  const options: DropdownOption<string>[] = LANGUAGES.map((language) => ({
    value: language.code,
    label: language.label,
    icon: valueOf(keyFor(baseKey, language.code)).trim() ? <span className="h-1.5 w-1.5 rounded-full bg-accent-green" aria-hidden="true" /> : undefined,
  }));

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-stretch gap-2">
        <CustomDropdown<string>
          value={code}
          options={options}
          onChange={setCode}
          label={code.toUpperCase()}
          ariaLabel={ariaLabel}
          accent="primary"
          buttonClassName="h-full py-1.5"
          align="left"
        />
        <Input
          id={`cfg-${baseKey}`}
          fieldSize="sm"
          className="min-w-0 flex-1"
          maxLength={maxLength}
          spellCheck
          lang={code}
          aria-label={ariaLabel}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(key, e.target.value)}
        />
      </div>
      <span className="type-caption text-text-muted sm:text-right">
        {value.trim().length}/{maxLength}
      </span>
    </div>
  );
}
