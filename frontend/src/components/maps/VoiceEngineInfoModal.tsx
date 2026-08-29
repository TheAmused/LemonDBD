'use client';
// frontend/src/components/maps/VoiceEngineInfoModal.tsx

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Cpu,
  Globe,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Info,
  Laptop,
  DownloadCloud,
} from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { VoiceEngineType, ModelProgressInfo } from '@/services/clientSpeechModel';

export interface VoiceEngineInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEngine: VoiceEngineType;
  onSelectEngine: (engine: VoiceEngineType) => void;
  browserName: string;
  hasNativeWebSpeech: boolean;
  modelProgress: ModelProgressInfo;
  onPreloadModel: () => void;
  dict?: Dictionary | any;
}

export const VoiceEngineInfoModal: React.FC<VoiceEngineInfoModalProps> = ({
  isOpen,
  onClose,
  currentEngine,
  onSelectEngine,
  browserName,
  hasNativeWebSpeech,
  modelProgress,
  onPreloadModel,
  dict,
}) => {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const t = (dict?.voice || {}) as Record<string, string>;

  const modalElement = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-engine-modal-title"
      data-testid="voice-engine-info-modal"
    >
      {/* Fullscreen Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-6 sm:p-7 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-200 space-y-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shadow-sm" aria-hidden="true">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="voice-engine-modal-title"
                className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight"
              >
                {t.howItWorksTitle || ''}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={dict?.modal?.close || ''}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Current Browser Status Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-mono">
              <Laptop className="h-3.5 w-3.5 text-cyan-500" aria-hidden="true" />
              {dict?.maps?.detectedBrowser || ''}
            </span>
            <span className="rounded-full bg-slate-200/80 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
              {browserName}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-mono">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              {dict?.maps?.activeRecognitionEngine || ''}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-black font-mono border ${currentEngine === 'web-speech'
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                }`}
            >
              {currentEngine === 'web-speech'
                ? t.engineNativeBadge || ''
                : t.engineClientBadge || ''}
            </span>
          </div>
        </div>

        {/* Comparison: How It Works & Why It Is Needed */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Native Web Speech Framework */}
          <div
            onClick={() => {
              if (hasNativeWebSpeech) onSelectEngine('web-speech');
            }}
            className={`rounded-2xl border p-4 transition-all space-y-2.5 ${hasNativeWebSpeech ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
              } ${currentEngine === 'web-speech'
                ? 'border-cyan-500/50 bg-cyan-500/5 dark:bg-cyan-500/10 ring-2 ring-cyan-500/30'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-cyan-500" aria-hidden="true" />
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
                  {t.engineNative || ''}
                </h4>
              </div>
              {currentEngine === 'web-speech' && (
                <CheckCircle2 className="h-4 w-4 text-cyan-500" aria-hidden="true" />
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.howItWorksNative || ''}
            </p>

            <div className="pt-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-500 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" aria-hidden="true" />
              <span>{dict?.maps?.chromeEdgeSafari || ''}</span>
            </div>
          </div>

          {/* Client-Side Fallback Model */}
          <div
            onClick={() => onSelectEngine('client-model')}
            className={`rounded-2xl border p-4 transition-all space-y-2.5 cursor-pointer ${currentEngine === 'client-model'
                ? 'border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10 ring-2 ring-emerald-500/30'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
                  {t.engineClient || ''}
                </h4>
              </div>
              {currentEngine === 'client-model' && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.howItWorksClient || ''}
            </p>

            <div className="pt-1 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{dict?.maps?.universalPrivateInBrowser || ''}</span>
            </div>
          </div>
        </div>

        {/* Why Fallback Is Needed Box */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-extrabold text-xs font-mono">
            <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t.whyNeededTitle || ''}</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {t.whyNeededText || ''}
          </p>
        </div>

        {/* Client Model Download Box */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DownloadCloud className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                {modelProgress.status === 'downloading'
                  ? (t.downloadProgress || '').replace('{progress}', String(modelProgress.progress))
                  : modelProgress.status === 'ready'
                    ? t.statusReady || ''
                    : t.modelCacheInfo || t.modelCached || ''}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500">
              {modelProgress.progress}{dict?.maps?.percentSign || '%'}
            </span>
          </div>

          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              style={{ width: `${modelProgress.progress}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t.modelCached || ''}
            </p>

            {modelProgress.status !== 'ready' && modelProgress.status !== 'downloading' && (
              <button
                type="button"
                onClick={onPreloadModel}
                className="flex items-center gap-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer font-mono"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                <span>{dict?.maps?.preloadModel || ''}</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-5 py-2 text-xs font-bold shadow-md transition-all hover:opacity-90 cursor-pointer font-mono"
          >
            {dict?.modal?.close || dict?.modal?.gotIt || ''}
          </button>
        </div>
      </div>
    </div>
  );

  if (mounted && typeof document !== 'undefined') {
    return createPortal(modalElement, document.body);
  }

  return modalElement;
};