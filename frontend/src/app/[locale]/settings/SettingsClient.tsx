'use client';
// frontend/src/app/[locale]/settings/SettingsClient.tsx

import React from 'react';
import {
  CampfireIcon,
  ThornHeartIcon,
  ThunderPulseIcon,
  EntityHeartIcon,
  ChaosSwirlIcon,
  CautionVeilIcon,
  SealCheckIcon,
  WardCharmIcon,
} from '@/components/icons/DbdIcons';
import { Surface } from '@/components/common/Surface';
import { Switch } from '@/components/common/Switch';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { usePreferences, type BackgroundAnimationMode } from '@/hooks/usePreferences';
import { useDictionary } from '@/context/DictionaryContext';
import { useAuth } from '@/context/AuthContext';

interface SectionCardHeaderProps {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  title: string;
  description?: string;
}

function SectionCardHeader({ icon: Icon, title, description }: SectionCardHeaderProps) {
  return (
    <div className="space-y-1 pb-3 border-b border-border-subtle">
      <div className="flex items-center gap-2.5">
        <Icon className="h-5 w-5 text-accent-red" aria-hidden="true" />
        <h2 className="type-section-title text-text-primary">{title}</h2>
      </div>
      {description && (
        <p className="type-body-2xs text-text-muted">{description}</p>
      )}
    </div>
  );
}

export function SettingsClient() {
  const dict = useDictionary();
  const { preferences, updatePreferences } = usePreferences();
  const { isAuthenticated } = useAuth();

  const campfireModes: Array<{ mode: BackgroundAnimationMode; label: string }> = [
    { mode: 'on', label: dict.settings.campfireOn },
    { mode: 'eco', label: dict.settings.campfireEco },
    { mode: 'off', label: dict.settings.campfireOff },
  ];

  return (
    <div className="space-y-6 w-full pb-8">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="type-page-title text-text-primary">{dict.settings.title}</h1>
          <p className="type-body-fluid text-text-secondary">{dict.settings.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="type-label-2xs text-text-muted">{dict.settings.syncStatus}:</span>
          <Badge
            tone={isAuthenticated ? 'green' : 'neutral'}
            size="sm"
            icon={
              isAuthenticated ? (
                <SealCheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <WardCharmIcon className="h-3.5 w-3.5" aria-hidden="true" />
              )
            }
          >
            {isAuthenticated ? dict.settings.statusSynced : dict.settings.statusLocal}
          </Badge>
        </div>
      </header>

      {/* 1. Global Site Preferences (Applies site-wide across all pages) */}
      <Surface tone="flat" padding="lg" className="space-y-5">
        <SectionCardHeader
          icon={CampfireIcon}
          title={dict.settings.sectionGlobalTitle}
          description={dict.settings.sectionGlobalDesc}
        />

        <div className="space-y-4 divide-y divide-border-subtle/60">
          {/* Campfire Particles (Ambient Background) */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <CampfireIcon className="h-4 w-4 text-accent-amber" aria-hidden="true" />
                <span className="type-strong-fluid text-text-primary">
                  {dict.settings.campfire}
                </span>
              </div>
              <p className="type-body-fluid text-text-secondary">
                {dict.settings.campfireDesc}
              </p>
            </div>
            <fieldset
              aria-label={dict.settings.campfire}
              className="flex items-center gap-2 self-start sm:self-auto shrink-0 border-0 p-0 m-0"
            >
              {campfireModes.map(({ mode, label }) => (
                <Button
                  key={mode}
                  variant={preferences.backgroundAnimation === mode ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={preferences.backgroundAnimation === mode}
                  onClick={() => void updatePreferences({ backgroundAnimation: mode })}
                  className="min-h-11 min-w-18"
                >
                  {label}
                </Button>
              ))}
            </fieldset>
          </div>

          {/* Mature / 18+ Content Toggle */}
          <div className="pt-4 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CautionVeilIcon className="h-4 w-4 text-accent-amber" aria-hidden="true" />
                <span className="type-strong-fluid text-text-primary">
                  {dict.settings.nsfw}
                </span>
                <span className="type-label-2xs font-bold text-accent-amber px-2 py-0.5 rounded-full border border-accent-amber/40 bg-accent-amber/10">
                  18+
                </span>
              </div>
              <p className="type-body-fluid text-text-secondary">
                {dict.settings.nsfwDesc}
              </p>
            </div>
            <Switch
              checked={preferences.nsfw}
              onChange={(checked) => void updatePreferences({ nsfw: checked })}
              ariaLabel={dict.settings.nsfw}
            />
          </div>
        </div>
      </Surface>

      {/* 2. Smash or Pass & Minigames (In-trial effects) */}
      <Surface tone="flat" padding="lg" className="space-y-5">
        <SectionCardHeader
          icon={ThornHeartIcon}
          title={dict.settings.sectionMinigamesTitle}
          description={dict.settings.sectionMinigamesDesc}
        />

        <div className="space-y-4 divide-y divide-border-subtle/60">
          {/* Sound Effects */}
          <div className="pt-2 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <ThunderPulseIcon className="h-4 w-4 text-accent-red" aria-hidden="true" />
                <span className="type-strong-fluid text-text-primary">
                  {dict.settings.soundEffects}
                </span>
              </div>
              <p className="type-body-fluid text-text-secondary">
                {dict.settings.soundEffectsDesc}
              </p>
            </div>
            <Switch
              checked={preferences.sounds}
              onChange={(checked) => void updatePreferences({ sounds: checked })}
              ariaLabel={dict.settings.soundEffects}
            />
          </div>

          {/* Music */}
          <div className="pt-4 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <EntityHeartIcon className="h-4 w-4 text-accent-red" aria-hidden="true" />
                <span className="type-strong-fluid text-text-primary">
                  {dict.settings.music}
                </span>
              </div>
              <p className="type-body-fluid text-text-secondary">
                {dict.settings.musicDesc}
              </p>
            </div>
            <Switch
              checked={preferences.music}
              onChange={(checked) => void updatePreferences({ music: checked })}
              ariaLabel={dict.settings.music}
            />
          </div>

          {/* Visual Animations */}
          <div className="pt-4 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <ChaosSwirlIcon className="h-4 w-4 text-accent-red" aria-hidden="true" />
                <span className="type-strong-fluid text-text-primary">
                  {dict.settings.animations}
                </span>
              </div>
              <p className="type-body-fluid text-text-secondary">
                {dict.settings.animationsDesc}
              </p>
            </div>
            <Switch
              checked={preferences.effects}
              onChange={(checked) => void updatePreferences({ effects: checked })}
              ariaLabel={dict.settings.animations}
            />
          </div>
        </div>
      </Surface>
    </div>
  );
}
