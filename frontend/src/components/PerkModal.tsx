'use client';

import React, { useEffect, useState } from 'react';
import { X, User, Shield, Copy, Check, Sparkles, ImageOff } from 'lucide-react';
import { Perk } from './PerkCard';

interface PerkModalProps {
  perk: Perk | null;
  onClose: () => void;
  dict: any;
}

export const PerkModal: React.FC<PerkModalProps> = ({ perk, onClose, dict }) => {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!perk) return null;

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const iconSrc = perk.icon_local_path
    ? `${backendBase}/static/${perk.icon_local_path}`
    : perk.icon_url;

  const isSurvivor = perk.category === 'Survivor';

  const handleCopySlug = () => {
    const slug = perk.name.lower().replace(/[\s\-/]+/g, '_');
    navigator.clipboard.writeText(slug);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Utility renderer for Markdown bold (**text**) and bullet lists (\n*)
  const renderFormattedDescription = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      const parsedContent = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-bold text-amber-600 dark:text-amber-400">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <em key={pIdx} className="italic text-slate-600 dark:text-slate-300">
              {part.slice(1, -1)}
            </em>
          );
        }
        return part;
      });

      if (line.trim().startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-700 dark:text-slate-300">
            {parsedContent}
          </li>
        );
      }

      return (
        <p key={idx} className="mb-2 leading-relaxed text-slate-700 dark:text-slate-300">
          {parsedContent}
        </p>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label={dict.modal.close}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-5 pr-8">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 p-3 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner">
            {!imgError ? (
              <img
                src={iconSrc}
                alt={perk.name}
                onError={() => setImgError(true)}
                className="h-14 w-14 object-contain drop-shadow-lg"
              />
            ) : (
              <ImageOff className="h-8 w-8 text-slate-400" />
            )}
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {perk.name}
            </h2>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <User className="h-3.5 w-3.5 text-slate-400" />
                {perk.character}
              </span>

              <span
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-extrabold uppercase ${
                  isSurvivor
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                {perk.category}
              </span>
            </div>
          </div>
        </div>

        {/* Formatted Perk Description */}
        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Perk Description
            </h4>
            <button
              onClick={handleCopySlug}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-500">{dict.modal.slugCopied}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>{dict.modal.copySlug}</span>
                </>
              )}
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto pr-2 text-sm leading-relaxed">
            {renderFormattedDescription(perk.description)}
          </div>
        </div>
      </div>
    </div>
  );
};