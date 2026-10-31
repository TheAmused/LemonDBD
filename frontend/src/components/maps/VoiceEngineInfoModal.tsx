'use client';
// frontend/src/components/maps/VoiceEngineInfoModal.tsx

import { Button } from '@/components/common/Button';
import React from 'react';
import { Cpu, Globe, CheckCircle2, RefreshCw, DownloadCloud, Gauge, Mic } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import type {
  VoiceEngineType,
  ModelProgressInfo,
  ModelQuality,
  ModelDescriptor,
} from '@/services/clientSpeechModel';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";
import { IconLabel } from '@/components/common/IconLabel';
import { SelectableCard } from '@/components/common/SelectableCard';

export interface VoiceEngineInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEngine: VoiceEngineType;
  onSelectEngine: (engine: VoiceEngineType) => void;
  hasNativeWebSpeech: boolean;
  modelProgress: ModelProgressInfo;
  onPreloadModel: () => void;
  modelQuality?: ModelQuality;
  onSelectModelQuality?: (quality: ModelQuality) => void;
  modelDescriptor?: ModelDescriptor;
}

export const VoiceEngineInfoBody: React.FC<Omit<VoiceEngineInfoModalProps, 'isOpen' | 'onClose'>> = ({
      currentEngine,
      onSelectEngine,
      hasNativeWebSpeech,
      modelProgress,
      onPreloadModel,
      modelQuality = 'fast',
      onSelectModelQuality,
      modelDescriptor,
    }) => {
  const dict = useDictionary();
  const t = dict.voice;

  // Three plain sections, each under the same small heading: no frames or tinted boxes of their own.
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <IconLabel icon={Mic} variant="heading">{t.engine}</IconLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <SelectableCard
            selected={currentEngine === 'web-speech'}
            disabled={!hasNativeWebSpeech}
            onClick={() => onSelectEngine('web-speech')}
            className="space-y-2.5 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="icon-md text-text-secondary" aria-hidden="true" />
                <h4 className="type-label-sm text-text-primary">{t.engineNative}</h4>
              </div>
              {currentEngine === 'web-speech' && (
                <CheckCircle2 className="icon-md text-accent-green" aria-hidden="true" />
              )}
            </div>
            <p className="type-body text-text-muted">{t.howItWorksNative}</p>
            <div className="pt-1 flex items-center gap-1.5 type-strong-2xs text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-text-muted" aria-hidden="true" />
              <span>{dict.maps.chromeEdgeSafari}</span>
            </div>
          </SelectableCard>

          <SelectableCard
            selected={currentEngine === 'client-model'}
            onClick={() => onSelectEngine('client-model')}
            className="space-y-2.5 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="icon-md text-text-secondary" aria-hidden="true" />
                <h4 className="type-label-sm text-text-primary">{t.engineClient}</h4>
              </div>
              {currentEngine === 'client-model' && (
                <CheckCircle2 className="icon-md text-accent-green" aria-hidden="true" />
              )}
            </div>
            <p className="type-body text-text-muted">{t.howItWorksClient}</p>
          </SelectableCard>
        </div>
      </section>

      {/* Local model accuracy: whisper-tiny ('fast') vs whisper-base ('accurate') */}
      <section className="space-y-3">
        <IconLabel icon={Gauge} variant="heading">{t.accuracyTitle}</IconLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {(['fast', 'accurate'] as const).map((quality) => {
            const isSelected = modelQuality === quality;
            const label = quality === 'fast' ? t.accuracyFast : t.accuracyAccurate;
            const description = quality === 'fast' ? t.accuracyFastDesc : t.accuracyAccurateDesc;
            const sizeMb = isSelected && modelDescriptor ? modelDescriptor.approxSizeMb : null;

            return (
              <SelectableCard
                key={quality}
                selected={isSelected}
                disabled={!onSelectModelQuality}
                onClick={() => onSelectModelQuality?.(quality)}
                className="space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="type-label-sm text-text-primary">{label}</span>
                  {isSelected && (
                    <CheckCircle2 className="icon-md shrink-0 text-accent-green" aria-hidden="true" />
                  )}
                </div>
                <p className="text-mini text-text-muted leading-relaxed">{description}</p>
                {sizeMb !== null && (
                  <p className="type-strong-2xs text-text-muted">
                    {formatMessage(t.modelSize, { size: sizeMb })}
                  </p>
                )}
              </SelectableCard>
            );
          })}
        </div>
      </section>

      {/* The local model's download */}
      <section className="space-y-3">
        <IconLabel icon={DownloadCloud} variant="heading">{t.modelDownloadTitle}</IconLabel>
        <div className="flex items-center justify-between gap-3">
          <span className="type-strong text-text-primary">
            {modelProgress.status === 'downloading'
              ? formatMessage(t.downloadProgress, { progress: modelProgress.progress })
              : modelProgress.status === 'ready'
                ? t.statusReady
                : t.modelCached}
          </span>
          <span className="type-strong-2xs text-text-muted shrink-0">
            {modelProgress.progress}{dict.maps.percentSign}
          </span>
        </div>
        <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
          <div
            style={{ width: `${modelProgress.progress}%` }}
            className="h-full bg-accent-red transition-all duration-300 rounded-full"
          />
        </div>
        {modelProgress.status !== 'ready' && modelProgress.status !== 'downloading' && (
          <div className="flex items-center justify-end pt-1">
            <Button variant="secondary" size="sm" onClick={onPreloadModel}>
              <RefreshCw aria-hidden="true" />
              <span>{dict.maps.preloadModel}</span>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

export const VoiceEngineInfoModal: React.FC<VoiceEngineInfoModalProps> = ({
  isOpen,
  onClose,
  ...bodyProps
}) => {
  const dict = useDictionary();
  const t = dict.voice;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="xl"
      layer="system"
      title={t.howItWorksTitle || ''}
      ariaLabel={t.howItWorksTitle}
      closeButtonAriaLabel={dict.modal.close}
      testId="voice-engine-info-modal"
      padded
    >
      <VoiceEngineInfoBody {...bodyProps} />
    </Modal>
  );
};
