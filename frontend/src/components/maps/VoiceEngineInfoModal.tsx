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
  Gauge,
} from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type {
  VoiceEngineType,
  ModelProgressInfo,
  ModelQuality,
  ModelDescriptor,
} from '@/services/clientSpeechModel';

export interface VoiceEngineInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEngine: VoiceEngineType;
  onSelectEngine: (engine: VoiceEngineType) => void;
  browserName: string;
  hasNativeWebSpeech: boolean;
  modelProgress: ModelProgressInfo;
  onPreloadModel: () => void;
  modelQuality?: ModelQuality;
  onSelectModelQuality?: (quality: ModelQuality) => void;
  modelDescriptor?: ModelDescriptor;
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
  modelQuality = 'fast',
  onSelectModelQuality,
  modelDescriptor,
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
        className="relative z-10 w-full max-w-xl rounded-3xl border border-border-color bg-bg-surface p-6 sm:p-7 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-200 space-y-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-color">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-red/10 border border-accent-red/30 text-accent-red shadow-sm" aria-hidden="true">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="voice-engine-modal-title"
                className="text-base sm:text-lg font-black text-text-primary font-mono tracking-tight"
              >
                {t.howItWorksTitle || ''}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={dict?.modal?.close || ''}
            className="rounded-xl p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Current Browser Status Card */}
        <div className="rounded-2xl border border-border-color bg-bg-elevated p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5 font-mono">
              <Laptop className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              {dict?.maps?.detectedBrowser || ''}
            </span>
            <span className="rounded-full bg-bg-surface px-2.5 py-0.5 text-xs font-bold text-text-primary font-mono">
              {browserName}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5 font-mono">
              <Sparkles className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              {dict?.maps?.activeRecognitionEngine || ''}
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-black font-mono border bg-accent-red/10 text-accent-red border-accent-red/30"
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
                ? 'border-accent-red/50 bg-accent-red/5 ring-2 ring-accent-red/30'
                : 'border-border-color bg-bg-surface hover:border-border-subtle'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                <h4 className="text-xs font-black text-text-primary uppercase tracking-wider font-mono">
                  {t.engineNative || ''}
                </h4>
              </div>
              {currentEngine === 'web-speech' && (
                <CheckCircle2 className="h-4 w-4 text-accent-green" aria-hidden="true" />
              )}
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              {t.howItWorksNative || ''}
            </p>

            <div className="pt-1 flex items-center gap-1.5 text-[10px] font-bold text-text-muted font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-text-muted" aria-hidden="true" />
              <span>{dict?.maps?.chromeEdgeSafari || ''}</span>
            </div>
          </div>

          {/* Client-Side Fallback Model */}
          <div
            onClick={() => onSelectEngine('client-model')}
            className={`rounded-2xl border p-4 transition-all space-y-2.5 cursor-pointer ${currentEngine === 'client-model'
                ? 'border-accent-red/50 bg-accent-red/5 ring-2 ring-accent-red/30'
                : 'border-border-color bg-bg-surface hover:border-border-subtle'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                <h4 className="text-xs font-black text-text-primary uppercase tracking-wider font-mono">
                  {t.engineClient || ''}
                </h4>
              </div>
              {currentEngine === 'client-model' && (
                <CheckCircle2 className="h-4 w-4 text-accent-green" aria-hidden="true" />
              )}
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              {t.howItWorksClient || ''}
            </p>

            <div className="pt-1 flex items-center gap-1.5 text-[10px] font-bold text-text-secondary font-mono">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{dict?.maps?.universalPrivateInBrowser || ''}</span>
            </div>
          </div>
        </div>

        {/* Local model accuracy: whisper-tiny ('fast') vs whisper-base ('accurate') */}
        <div className="rounded-2xl border border-border-color bg-bg-elevated p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-text-muted font-mono">
            <Gauge className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <span>{t.accuracyTitle || ''}</span>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            role="radiogroup"
            aria-label={t.accuracyTitle || ''}
          >
            {(['fast', 'accurate'] as const).map((quality) => {
              const isSelected = modelQuality === quality;
              const label = quality === 'fast' ? t.accuracyFast : t.accuracyAccurate;
              const description = quality === 'fast' ? t.accuracyFastDesc : t.accuracyAccurateDesc;
              const sizeMb = isSelected && modelDescriptor ? modelDescriptor.approxSizeMb : null;

              return (
                <button
                  key={quality}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={!onSelectModelQuality}
                  onClick={() => onSelectModelQuality?.(quality)}
                  className={`rounded-2xl border p-3 text-left transition-all space-y-1.5 ${
                    onSelectModelQuality ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                  } ${
                    isSelected
                      ? 'border-accent-red/50 bg-accent-red/5 ring-2 ring-accent-red/30'
                      : 'border-border-color bg-bg-surface hover:border-border-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-text-primary uppercase tracking-wider font-mono">
                      {label || ''}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-green" aria-hidden="true" />
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    {description || ''}
                  </p>
                  {sizeMb !== null && (
                    <p className="text-[10px] font-bold text-text-muted font-mono">
                      {(t.modelSize || '').replace('{size}', String(sizeMb))}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Why Fallback Is Needed Box */}
        <div className="rounded-2xl border border-accent-amber/30 bg-accent-amber/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-accent-amber font-extrabold text-xs font-mono">
            <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t.whyNeededTitle || ''}</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            {t.whyNeededText || ''}
          </p>
        </div>

        {/* Client Model Download Box */}
        <div className="rounded-2xl border border-border-color bg-bg-elevated p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DownloadCloud className="h-4 w-4 text-accent-red" aria-hidden="true" />
              <span className="text-xs font-bold text-text-primary font-mono">
                {modelProgress.status === 'downloading'
                  ? (t.downloadProgress || '').replace('{progress}', String(modelProgress.progress))
                  : modelProgress.status === 'ready'
                    ? t.statusReady || ''
                    : t.modelCacheInfo || t.modelCached || ''}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-text-muted">
              {modelProgress.progress}{dict?.maps?.percentSign || '%'}
            </span>
          </div>

          <div className="h-2 rounded-full bg-bg-surface overflow-hidden">
            <div
              style={{ width: `${modelProgress.progress}%` }}
              className="h-full bg-accent-red transition-all duration-300 rounded-full"
            />
          </div>

          {modelProgress.status !== 'ready' && modelProgress.status !== 'downloading' && (
            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={onPreloadModel}
                className="flex items-center gap-1.5 rounded-xl bg-bg-surface hover:bg-bg-elevated px-3 py-1.5 text-xs font-bold text-text-primary transition-colors cursor-pointer font-mono"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                <span>{dict?.maps?.preloadModel || ''}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (mounted && typeof document !== 'undefined') {
    return createPortal(modalElement, document.body);
  }

  return modalElement;
};