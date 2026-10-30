'use client';
// frontend/src/components/maps/VoiceEngineInfoModal.tsx

import { Button } from '@/components/common/Button';
import React from 'react';
import {  Cpu,
  Globe,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Info,
  Laptop,
  DownloadCloud,
  Gauge,} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import type {
  VoiceEngineType,
  ModelProgressInfo,
  ModelQuality,
  ModelDescriptor,
} from '@/services/clientSpeechModel';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";
import { Badge } from '@/components/common/Badge';
import { InfoChip } from '@/components/common/InfoChip';
import { Surface } from '@/components/common/Surface';
import { IconLabel } from '@/components/common/IconLabel';
import { SelectableCard } from '@/components/common/SelectableCard';

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
    }) => {
  const dict = useDictionary();
  const t = dict.voice;

  return (
    <div className="space-y-6">
    {/* Current Browser Status Card */}
    <Surface tone="elevated" padding="none" className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <IconLabel as="span" icon={Laptop} variant="heading">{dict.maps.detectedBrowser}</IconLabel>
        <InfoChip>
          {browserName}
        </InfoChip>
      </div>

      <div className="flex items-center justify-between pt-1">
        <IconLabel as="span" icon={Cpu} variant="heading">{dict.maps.activeRecognitionEngine}</IconLabel>
        <Badge
          tone="red" size="md" plain
        >
          {currentEngine === 'web-speech'
            ? t.engineNativeBadge || ''
            : t.engineClientBadge || ''}
        </Badge>
      </div>
    </Surface>

    {/* Comparison: How It Works & Why It Is Needed */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {/* Native Web Speech Framework */}
      <SelectableCard
        selected={currentEngine === 'web-speech'}
        disabled={!hasNativeWebSpeech}
        onClick={() => onSelectEngine('web-speech')}
        className="space-y-2.5 p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="icon-md text-text-secondary" aria-hidden="true" />
            <h4 className="type-label-sm text-text-primary">
              {t.engineNative || ''}
            </h4>
          </div>
          {currentEngine === 'web-speech' && (
            <CheckCircle2 className="icon-md text-accent-green" aria-hidden="true" />
          )}
        </div>

        <p className="type-body text-text-muted">
          {t.howItWorksNative || ''}
        </p>

        <div className="pt-1 flex items-center gap-1.5 type-strong-2xs text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-text-muted" aria-hidden="true" />
          <span>{dict.maps.chromeEdgeSafari}</span>
        </div>
      </SelectableCard>

      {/* Client-Side Fallback Model */}
      <SelectableCard
        selected={currentEngine === 'client-model'}
        onClick={() => onSelectEngine('client-model')}
        className="space-y-2.5 p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="icon-md text-text-secondary" aria-hidden="true" />
            <h4 className="type-label-sm text-text-primary">
              {t.engineClient || ''}
            </h4>
          </div>
          {currentEngine === 'client-model' && (
            <CheckCircle2 className="icon-md text-accent-green" aria-hidden="true" />
          )}
        </div>

        <p className="type-body text-text-muted">
          {t.howItWorksClient || ''}
        </p>

        <div className="pt-1 flex items-center gap-1.5 type-strong-2xs text-text-secondary">
          <ShieldCheck className="icon-sm" aria-hidden="true" />
          <span>{dict.maps.universalPrivateInBrowser}</span>
        </div>
      </SelectableCard>
    </div>

    {/* Local model accuracy: whisper-tiny ('fast') vs whisper-base ('accurate') */}
    <Surface tone="elevated" padding="none" className="p-4 space-y-3">
      <IconLabel icon={Gauge} variant="heading">{t.accuracyTitle || ''}</IconLabel>

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
                <span className="type-label-sm text-text-primary">
                  {label || ''}
                </span>
                {isSelected && (
                  <CheckCircle2 className="icon-md shrink-0 text-accent-green" aria-hidden="true" />
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
            </SelectableCard>
          );
        })}
      </div>
    </Surface>

    {/* Why Fallback Is Needed Box */}
    <div className="rounded-card border border-accent-amber/30 bg-accent-amber/10 p-4 space-y-2">
      <div className="flex items-center gap-2 text-accent-amber type-strong">
        <Info className="icon-md shrink-0" aria-hidden="true" />
        <span>{t.whyNeededTitle || ''}</span>
      </div>
      <p className="type-body text-text-secondary">
        {t.whyNeededText || ''}
      </p>
    </div>

    {/* Client Model Download Box */}
    <Surface tone="elevated" padding="none" className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DownloadCloud className="icon-md text-accent-red" aria-hidden="true" />
          <span className="type-strong text-text-primary">
            {modelProgress.status === 'downloading'
              ? formatMessage((t.downloadProgress || ''), { progress: modelProgress.progress })
              : modelProgress.status === 'ready'
                ? t.statusReady || ''
                : t.modelCached}
          </span>
        </div>
        <span className="type-strong-2xs text-text-muted">
          {modelProgress.progress}{dict.maps.percentSign}
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
            <RefreshCw aria-hidden="true" />
            <span>{dict.maps.preloadModel}</span>
          </Button>
        </div>
      )}
    </Surface>
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
