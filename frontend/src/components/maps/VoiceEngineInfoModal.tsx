'use client';
// frontend/src/components/maps/VoiceEngineInfoModal.tsx

import { Button } from '@/components/common/Button';
import React from 'react';
import {
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
import { Modal } from '@/components/common/Modal';
import type { Dictionary } from '@/locales/types';
import type {
  VoiceEngineType,
  ModelProgressInfo,
  ModelQuality,
  ModelDescriptor,
} from '@/services/clientSpeechModel';
import { formatMessage } from '@/utils/i18nFormat';

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

export const VoiceEngineInfoBody: React.FC<Omit<VoiceEngineInfoModalProps, 'isOpen' | 'onClose'>> = ({
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
  const t = (dict?.voice || {}) as Record<string, string>;

  return (
    <div className="space-y-6">
    {/* Current Browser Status Card */}
    <div className="rounded-2xl border border-border-color bg-bg-elevated p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="type-label-xs text-text-muted flex items-center gap-1.5">
          <Laptop className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
          {dict?.maps?.detectedBrowser || ''}
        </span>
        <span className="rounded-full bg-bg-surface px-2.5 py-0.5 type-strong text-text-primary">
          {browserName}
        </span>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="type-label-xs text-text-muted flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
          {dict?.maps?.activeRecognitionEngine || ''}
        </span>
        <span
          className="rounded-full px-2.5 py-0.5 type-strong border bg-accent-red/10 text-accent-red border-accent-red/30"
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
            <h4 className="type-label-sm text-text-primary">
              {t.engineNative || ''}
            </h4>
          </div>
          {currentEngine === 'web-speech' && (
            <CheckCircle2 className="h-4 w-4 text-accent-green" aria-hidden="true" />
          )}
        </div>

        <p className="type-body text-text-muted">
          {t.howItWorksNative || ''}
        </p>

        <div className="pt-1 flex items-center gap-1.5 type-strong-2xs text-text-muted">
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
            <h4 className="type-label-sm text-text-primary">
              {t.engineClient || ''}
            </h4>
          </div>
          {currentEngine === 'client-model' && (
            <CheckCircle2 className="h-4 w-4 text-accent-green" aria-hidden="true" />
          )}
        </div>

        <p className="type-body text-text-muted">
          {t.howItWorksClient || ''}
        </p>

        <div className="pt-1 flex items-center gap-1.5 type-strong-2xs text-text-secondary">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{dict?.maps?.universalPrivateInBrowser || ''}</span>
        </div>
      </div>
    </div>

    {/* Local model accuracy: whisper-tiny ('fast') vs whisper-base ('accurate') */}
    <div className="rounded-2xl border border-border-color bg-bg-elevated p-4 space-y-3">
      <div className="flex items-center gap-1.5 type-label-xs text-text-muted">
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
                <span className="type-label-sm text-text-primary">
                  {label || ''}
                </span>
                {isSelected && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-green" aria-hidden="true" />
                )}
              </div>
              <p className="text-mini text-text-muted leading-relaxed">
                {description || ''}
              </p>
              {sizeMb !== null && (
                <p className="type-strong-2xs text-text-muted">
                  {formatMessage((t.modelSize || ''), { size: sizeMb })}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>

    {/* Why Fallback Is Needed Box */}
    <div className="rounded-2xl border border-accent-amber/30 bg-accent-amber/10 p-4 space-y-2">
      <div className="flex items-center gap-2 text-accent-amber type-strong">
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{t.whyNeededTitle || ''}</span>
      </div>
      <p className="type-body text-text-secondary">
        {t.whyNeededText || ''}
      </p>
    </div>

    {/* Client Model Download Box */}
    <div className="rounded-2xl border border-border-color bg-bg-elevated p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DownloadCloud className="h-4 w-4 text-accent-red" aria-hidden="true" />
          <span className="type-strong text-text-primary">
            {modelProgress.status === 'downloading'
              ? formatMessage((t.downloadProgress || ''), { progress: modelProgress.progress })
              : modelProgress.status === 'ready'
                ? t.statusReady || ''
                : t.modelCacheInfo || t.modelCached || ''}
          </span>
        </div>
        <span className="type-strong-2xs text-text-muted">
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
          <Button
            variant="secondary"
            size="sm"
            onClick={onPreloadModel}
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            <span>{dict?.maps?.preloadModel || ''}</span>
          </Button>
        </div>
      )}
    </div>
    </div>
  );
};

export const VoiceEngineInfoModal: React.FC<VoiceEngineInfoModalProps> = ({
  isOpen,
  onClose,
  ...bodyProps
}) => {
  const { dict } = bodyProps;
  const t = (dict?.voice || {}) as Record<string, string>;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="xl"
      layer="system"
      icon={<Cpu className="h-5 w-5" aria-hidden="true" />}
      title={t.howItWorksTitle || ''}
      ariaLabel={t.howItWorksTitle || 'Voice engine info'}
      closeButtonAriaLabel={dict?.modal?.close || ''}
      testId="voice-engine-info-modal"
      padded
    >
      <VoiceEngineInfoBody {...bodyProps} />
    </Modal>
  );
};
