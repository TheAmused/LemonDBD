'use client';
// frontend/src/components/smash-or-pass/creator/SmashRosterCreator.tsx
/**
 * The smash-or-pass roster creator: name it, add candidates, and it's saved
 * to this browser -- or, for an admin who checks "Official?", published live
 * to every visitor via `POST /api/v1/smash-or-pass/rosters` (mirrors
 * `TierListCreator`'s official-checkbox pattern one-to-one).
 *
 * Everything the viewer types goes through the same sanitizer a pasted-JSON
 * import would (`validateSmashRosterDocument`), so a roster built here can
 * never smuggle in anything the import flow would reject.
 *
 * Translation authoring (locale overrides for the ten backend
 * `TRANSLATABLE_FIELDS`) is admin+official only -- a custom roster is always
 * single-locale, matching the agreed plan's explicit non-goal.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, History, Plus, SearchX, X } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSmashRosterStore } from '@/hooks/useSmashRosterStore';
import { useSmashTaxonomies } from '@/hooks/useSmashTaxonomies';
import { sanitizeImageUrl } from '@/utils/smashOrPass/codec';
import { SMASH_ROSTER_LIMITS } from '@/utils/smashOrPass/constants';
import { CandidateFormInputs, CandidateTiles } from './EntityEditor';
import { CoverImageCropModal } from './CoverImageCropModal';
import { RosterBasicsSection } from './RosterBasicsSection';
import { RosterTaxonomyBlock } from './RosterTaxonomyBlock';
import { RosterTranslationsPanel } from './RosterTranslationsPanel';
import { RomanceArchetypeBuilder } from './RomanceArchetypeBuilder';
import { Button } from '@/components/common/Button';
import { Section, Feedback } from "./SmashRosterCreatorParts";
import { useDictionary } from "@/context/DictionaryContext";
import { GENDER_QUICK_PICKS, ROLE_QUICK_PICKS } from '@/utils/smashOrPass/constants';
import { useRosterDraft } from './useRosterDraft';
import { useRosterSubmit } from './useRosterSubmit';

interface SmashRosterCreatorProps {
  locale: string;
  /** A custom roster id to edit in place, instead of building a new one.
   * Official rosters have no backend update path, so `editId` only ever
   * refers to a locally-stored roster. */
  editId?: string;
}

export function SmashRosterCreator({ locale, editId }: SmashRosterCreatorProps) {
  const dict = useDictionary();
  const t = dict.smashOrPass;
  const c = t.creator;
  const { isAdmin, token, user } = useAuth();
  const isUserAdmin = Boolean(isAdmin || user?.role === 'admin');
  const { state: storeState, hydrated: storeHydrated } = useSmashRosterStore();
  const { roles: taxonomyRoles, genders: taxonomyGenders, registerTerm } = useSmashTaxonomies();
  const editingRoster = editId ? storeState.custom[editId] : undefined;

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [official, setOfficial] = useState(false);

  useDocumentTitle(editId ? `${c.pageTitleEdit || 'LemonDBD - Edit Smash or Pass roster'}` : (c.pageTitleCreate || 'LemonDBD - Create a Smash or Pass roster'));

  const {
    draft,
    patch,
    patchEntity,
    addEntity,
    removeEntity,
    activeEntity,
    activeEntityIndex,
    setSelectedEntityKey,
    restored,
    setRestored,
    resetDraft,
    rosterTranslations,
    setRosterTranslations,
    entityTranslations,
    setEntityTranslation,
    activeTranslationLocale,
    setActiveTranslationLocale,
  } = useRosterDraft({ editId, editingRoster, storeHydrated });

  const effectiveRoles = useMemo(() => {
    if (draft.custom_roles && draft.custom_roles.length > 0) return draft.custom_roles;
    if (taxonomyRoles && taxonomyRoles.length > 0) return taxonomyRoles;
    return [...ROLE_QUICK_PICKS];
  }, [draft.custom_roles, taxonomyRoles]);

  const effectiveGenders = useMemo(() => {
    if (draft.custom_genders && draft.custom_genders.length > 0) return draft.custom_genders;
    if (taxonomyGenders && taxonomyGenders.length > 0) return taxonomyGenders;
    return [...GENDER_QUICK_PICKS];
  }, [draft.custom_genders, taxonomyGenders]);

  const nameMissing = !draft.name.trim();
  const trimmedCover = draft.cover_image_url.trim();
  const safeCover = trimmedCover ? sanitizeImageUrl(trimmedCover) : null;
  const coverInvalid = Boolean(trimmedCover) && !safeCover;
  const validEntityCount = draft.entities.filter((e) => e.name.trim()).length;
  const entitiesMissing = validEntityCount === 0;

  const isSimpleMode = draft.roster_mode === 'simple';
  const showTranslations = isUserAdmin && official;

  const {
    submit,
    attempted,
    saveError,
    submitError,
    publishing,
    publishError,
    resetSubmitState,
  } = useRosterSubmit({
    locale,
    editId,
    editingRoster,
    draft,
    official,
    isUserAdmin,
    rosterTranslations,
    entityTranslations,
    nameMissing,
    entitiesMissing,
    coverInvalid,
  });

  // Editing a roster the store doesn't have (deleted, or a stale link): send
  // back rather than silently falling through to "create a new roster".
  if (editId && storeHydrated && !editingRoster) {
    return (
      <div className="relative z-10 flex flex-col gap-2">
        <Link
          href={`/${locale}/smash-or-pass`}
          className="inline-flex min-h-[44px] w-fit items-center gap-1 type-label-sm text-text-secondary hover:text-accent-red"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {c.title || 'Create a Roster'}
        </Link>
        <EmptyState icon={SearchX} title={t?.empty?.title || 'Not Found'} subtitle={t?.empty?.subtitle || ''} />
      </div>
    );
  }

  const startOver = () => {
    resetDraft();
    resetSubmitState();
  };

  const publishingNow = publishing && official && isUserAdmin;
  const submitLabel = publishingNow
    ? (c.saving || 'Saving...')
    : official && isUserAdmin
      ? (c.publish || 'Publish')
      : editId
        ? (c.saveShort || 'Save')
        : (c.create || 'Create');

  const submitButton = (extra?: string) => (
    <Button
      variant="primary"
      size="lg"
      onClick={submit}
      loading={publishingNow}
      data-roster-create=""
      className={extra ?? 'min-h-[48px] 2xl:min-h-[54px] px-8 2xl:px-10 2xl:text-lg'}
    >
      {submitLabel}
    </Button>
  );

  const errors = attempted
    ? [
        nameMissing && (c.validationNameRequired || 'Give this roster a name.'),
        entitiesMissing && (c.validationEntityRequired || 'Add at least one candidate.'),
        coverInvalid && (c.invalidImage || 'That cover image link is invalid.'),
      ].filter(Boolean)
    : [];

  return (
    <div className="relative z-10 flex flex-col gap-6 2xl:gap-8 max-w-7xl 2xl:max-wide-2k:max-w-[1800px] wide-2k:max-w-[2400px] mx-auto w-full px-4 sm:px-6">
      <h1 className="sr-only">{editId ? (c.editTitle || 'Edit Roster') : (c.title || 'Create a Roster')}</h1>
      {restored && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 right-5 z-50 flex max-w-md w-[calc(100vw-2.5rem)] sm:w-auto items-center gap-3 rounded-xl border border-accent-amber/40 bg-bg-surface/95 backdrop-blur-xl p-3 2xl:p-4 shadow-2xl text-xs sm:text-sm 2xl:text-base font-semibold text-text-primary animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <History className="h-4 w-4 2xl:h-5 2xl:w-5 text-accent-amber shrink-0" aria-hidden="true" />
          <span className="flex-1 text-accent-amber">{c.draftRestored || 'Your unfinished draft was restored.'}</span>
          <Button
            variant="secondary" size="xs"
            onClick={startOver}
            className="whitespace-nowrap"
          >
            {c.startOver || 'Start over'}
          </Button>
          <Button
            variant="ghost" size="sm" icon
            onClick={() => setRestored(false)}
            aria-label={c.closeToast || 'Dismiss'}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* TOP ROW: IN-LINE NAVIGATION (LEFT), THE BASICS BLOCK (MIDDLE), CREATE (RIGHT) */}
      <header className="flex flex-col lg:flex-row items-stretch lg:items-start justify-between gap-3 lg:gap-4 w-full">
        {/* Mobile top bar (< lg) */}
        <div className="flex lg:hidden items-center justify-between gap-2 w-full">
          <Link
            href={`/${locale}/smash-or-pass`}
            className="inline-flex min-h-[44px] items-center gap-1.5 type-label-sm text-text-secondary hover:text-accent-red transition-colors"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {c.backToHub || 'Smash or Pass'}
          </Link>
          <div className="flex items-center gap-2">
            {submitButton('min-h-[40px] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider')}
          </div>
        </div>

        {/* Desktop top left navigation (>= lg) */}
        <div className="hidden lg:flex shrink-0 lg:max-wide-2k:w-48 wide-2k:w-48 pt-2.5">
          <Link
            href={`/${locale}/smash-or-pass`}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs 2xl:text-sm font-bold uppercase tracking-wider text-text-secondary hover:text-accent-red transition-colors"
          >
            <ChevronLeft className="h-4 w-4 2xl:h-5 2xl:w-5" aria-hidden="true" />
            {c.backToHub || 'Smash or Pass'}
          </Link>
        </div>

        {/* MIDDLE: THE BASICS BLOCK */}
        <div className="flex-1 w-full min-w-0 max-w-4xl 2xl:max-wide-2k:max-w-6xl wide-2k:max-w-[1800px] mx-auto">
          <RosterBasicsSection
            draft={draft}
            patch={patch}
            attempted={attempted}
            nameMissing={nameMissing}
            coverInvalid={coverInvalid}
            safeCover={safeCover}
            isUserAdmin={isUserAdmin}
            official={official}
            onOfficialChange={setOfficial}
            onOpenCrop={() => setIsCropModalOpen(true)}
          >
            {showTranslations && (
              <RosterTranslationsPanel
                activeLocale={activeTranslationLocale}
                onLocaleChange={setActiveTranslationLocale}
                translations={rosterTranslations}
                setTranslations={setRosterTranslations}
              />
            )}
          </RosterBasicsSection>
        </div>

        {/* Desktop top right buttons (>= lg) */}
        <div className="hidden lg:flex shrink-0 lg:max-wide-2k:w-48 wide-2k:w-48 items-center justify-end gap-2.5 sm:gap-3 pt-2">
          {submitButton(
            'min-h-[40px] 2xl:min-h-[46px] px-4 2xl:px-6 py-1.5 text-xs 2xl:text-sm font-bold uppercase tracking-wider'
          )}
        </div>
      </header>

      {/* BLOCK 2: ROLES & GENDERS */}
      <div className="w-full max-w-4xl 2xl:max-wide-2k:max-w-6xl wide-2k:max-w-[1800px] mx-auto">
        <Section
          title={c.rolesGendersTitle}
          badge={`${effectiveRoles.length} roles • ${effectiveGenders.length} genders`}
          defaultOpen={false}
        >
          <RosterTaxonomyBlock
            roles={draft.custom_roles || []}
            genders={draft.custom_genders || []}
            onChangeRoles={(roles) => patch({ custom_roles: roles })}
            onChangeGenders={(genders) => patch({ custom_genders: genders })}
            onRegisterTerm={registerTerm}
          />
        </Section>
      </div>

      {/* BLOCK 3: CANDIDATES */}
      <div className="w-full max-w-4xl 2xl:max-wide-2k:max-w-6xl wide-2k:max-w-[1800px] mx-auto">
        <Section
          title={c.stepEntities || 'Candidates'}
          badge={draft.entities.length}
          defaultOpen={true}
          headerAction={
            <Button
              variant="secondary" size="sm"
              onClick={addEntity}
              disabled={draft.entities.length >= SMASH_ROSTER_LIMITS.maxEntities}
              className="uppercase tracking-wider"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{c.addEntity || 'Add Candidate'}</span>
            </Button>
          }
        >
          <div className="flex flex-col gap-6">
            {draft.entities.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border-color bg-bg-elevated/20">
                <p className="text-sm text-text-muted mb-3">
                  {c.noEntitiesYet || 'No candidates yet. Add your first one above.'}
                </p>
                <Button
                  variant="secondary" size="sm"
                  onClick={addEntity}
                  className="uppercase tracking-wider"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>{c.addEntity || 'Add Candidate'}</span>
                </Button>
              </div>
            ) : (
              <>
                {/* Part 1: All Inputs for Currently Selected Candidate */}
                {activeEntity && (
                  <CandidateFormInputs
                    key={activeEntity.key}
                    entity={activeEntity}
                    index={activeEntityIndex}
                    totalCount={draft.entities.length}
                    onChange={(patchValue) => patchEntity(activeEntity.key, patchValue)}
                    onRemove={() => removeEntity(activeEntity.key)}
                    showTranslations={showTranslations}
                    translations={entityTranslations[activeEntity.key] || {}}
                    onTranslationChange={(loc, field, value) => setEntityTranslation(activeEntity.key, loc, field, value)}
                    locale={locale}
                    isSimpleMode={isSimpleMode}
                    customLabels={draft.custom_labels}
                    availableRoles={effectiveRoles}
                    availableGenders={effectiveGenders}
                    onRegisterTaxonomy={registerTerm}
                  />
                )}

                {/* Horizontal divider between inputs and candidate tiles */}
                <div className="border-t border-border-color my-1" />

                {/* Part 2: Squished Candidate Tiles (matching Tier Lists items) */}
                <CandidateTiles
                  entities={draft.entities}
                  selectedKey={activeEntity?.key || ''}
                  onSelect={(k) => setSelectedEntityKey(k)}
                  onRename={(k, name) => patchEntity(k, { name })}
                  onRemove={(k) => removeEntity(k)}
                  onAdd={addEntity}
                  canAdd={draft.entities.length < SMASH_ROSTER_LIMITS.maxEntities}
                />
              </>
            )}
          </div>
        </Section>
      </div>

      {/* BLOCK 4: CUSTOM ROMANCE ARCHETYPES & PERSONALITY RULES */}
      <div className="w-full max-w-4xl 2xl:max-wide-2k:max-w-6xl wide-2k:max-w-[1800px] mx-auto">
        <Section
          title={c.customArchetypesTitle}
          badge={draft.romance_archetypes.length}
          defaultOpen={false}
        >
          <RomanceArchetypeBuilder
            archetypes={draft.romance_archetypes}
            onChange={(archetypes) => patch({ romance_archetypes: archetypes })}
            availableRoles={effectiveRoles}
            availableGenders={effectiveGenders}
            embedded={true}
          />
        </Section>
      </div>

      {/* Feedback Alerts */}
      <div className="w-full max-w-4xl 2xl:max-wide-2k:max-w-6xl wide-2k:max-w-[1800px] mx-auto flex flex-col gap-4">
        <Feedback errors={errors as string[]} saveError={saveError} submitError={submitError} publishError={publishError} />
      </div>

      {/* Cover Image 16:9 Viewport Crop Modal */}
      <CoverImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        imageUrl={draft.cover_image_url}
        themeColor={draft.theme_color}
        isAdmin={isUserAdmin}
        onApplyCrop={(croppedUrl) => {
          patch({ cover_image_url: croppedUrl });
          setIsCropModalOpen(false);
        }}
      />
    </div>
  );
}
