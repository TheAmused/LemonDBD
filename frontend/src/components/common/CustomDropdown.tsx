'use client';
// frontend/src/components/common/CustomDropdown.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

export interface CustomDropdownProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  icon?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  align?: 'left' | 'right';
  minWidthClass?: string;
}

export function CustomDropdown<T extends string = string>({
  value,
  onChange,
  options,
  icon,
  ariaLabel,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  align = 'left',
  minWidthClass = 'min-w-[160px]',
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (optValue: T) => {
      onChange(optValue);
      setIsOpen(false);
    },
    [onChange]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || selectedOption?.label}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-surface border border-border-color hover:border-accent-amber/50 hover:bg-bg-elevated text-xs font-mono font-bold text-text-primary transition-all cursor-pointer shadow-xs select-none ${
          isOpen ? 'border-accent-amber bg-accent-amber/10 text-accent-amber shadow-xs' : ''
        } ${buttonClassName}`}
      >
        {icon && <span className="text-text-secondary shrink-0">{icon}</span>}
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-text-secondary transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-accent-amber' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="listbox"
            className={`absolute top-full mt-1.5 ${
              align === 'right' ? 'right-0' : 'left-0'
            } z-50 ${minWidthClass} max-h-60 overflow-y-auto rounded-2xl bg-bg-surface border border-border-color p-1.5 shadow-xl backdrop-blur-2xl custom-scrollbar ${menuClassName}`}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-accent-amber text-text-inverted font-black shadow-xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <span className="truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-[10px] text-text-muted font-normal truncate">
                        {opt.sublabel}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 stroke-[3] ml-2 shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

