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
import { useEffect, useMemo, useState } from 'react';
import { History, Plus, SearchX, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { AuthRequiredState } from '@/components/common/AuthRequiredState';
import { Modal } from '@/components/common/Modal';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSmashRosterStore } from '@/hooks/useSmashRosterStore';
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
import { formatMessage } from '@/utils/i18nFormat';
import { apiUrl, authHeaders } from '@/utils/api';
import { useRouter } from 'next/navigation';

import { useRosterDraft, type OfficialRosterDetail } from './useRosterDraft';
import { useRosterSubmit } from './useRosterSubmit';
import { Toast } from '@/components/common/Toast';

/**
 * One column width for every block of the creator (basics, taxonomy, candidates, archetypes,
 * feedback AND the Create button), so the button is centred under exactly the column it submits.
 */
const CREATOR_COLUMN = 'w-full min-w-0 mx-auto max-w-4xl 2xl:max-wide-2k:max-w-6xl wide-2k:max-w-workspace';

interface SmashRosterCreatorProps {
  locale: string;
  editId?: string;
  officialSlug?: string;
}

export function SmashRosterCreator({ locale, editId, officialSlug }: SmashRosterCreatorProps) {
  const dict = useDictionary();
  const t = dict.smashOrPass;
  const c = t.creator;
  const router = useRouter();
  const { isAdmin, user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isUserAdmin = Boolean(isAdmin || user?.role === 'admin');
  const { state: storeState, hydrated: storeHydrated } = useSmashRosterStore();
  const editingRoster = editId ? storeState.custom[editId] : undefined;

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [official, setOfficial] = useState(Boolean(officialSlug));
  const [officialLoading, setOfficialLoading] = useState(Boolean(officialSlug && isUserAdmin));
  const [officialRoster, setOfficialRoster] = useState<OfficialRosterDetail | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!officialSlug) return;
    if (!isUserAdmin) {
      queueMicrotask(() => setOfficialLoading(false));
      return;
    }
    let active = true;
    fetch(apiUrl(`/api/v1/smash-or-pass/admin/rosters/${officialSlug}`), {
      headers: { ...authHeaders() },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load roster'))))
      .then((body: { data: OfficialRosterDetail }) => {
        if (!active) return;
        setOfficialRoster(body.data);
        setOfficial(true);
        setOfficialLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setOfficialLoading(false);
      });
    return () => {
      active = false;
    };
  }, [officialSlug, isUserAdmin]);

  useDocumentTitle(
    officialSlug
      ? `LemonDBD - ${officialRoster?.name || dict.tierLists.untitled}`
      : editId
        ? c.pageTitleEdit
        : c.pageTitleCreate
  );

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
    setIsSubmitting,
  } = useRosterDraft({ editId, editingRoster, storeHydrated, officialSlug, officialRoster });

  // The roster's dynamically configured roles and genders.
  const effectiveRoles = useMemo(
    () => draft.custom_roles || [],
    [draft.custom_roles]
  );

  const effectiveGenders = useMemo(
    () => draft.custom_genders || [],
    [draft.custom_genders]
  );

  const nameMissing = !draft.name.trim();
  const trimmedCover = draft.cover_image_url.trim();
  const safeCover = trimmedCover ? sanitizeImageUrl(trimmedCover) : null;
  const coverInvalid = Boolean(trimmedCover) && !safeCover;
  const entitiesMissing = draft.entities.length === 0;

  const isCurrentCandidateComplete = Boolean(activeEntity?.name.trim() && activeEntity?.role?.trim() && activeEntity?.gender?.trim());
  const canAddCandidate = draft.entities.length < SMASH_ROSTER_LIMITS.maxEntities && (draft.entities.length === 0 || isCurrentCandidateComplete);

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
    officialSlug,
    editingRoster,
    draft,
    official,
    isUserAdmin,
    rosterTranslations,
    entityTranslations,
    nameMissing,
    entitiesMissing,
    coverInvalid,
    resetDraft,
    setIsSubmitting,
  });

  if (authLoading || officialLoading) {
    return <div className="min-h-100" />;
  }

  if (!isAuthenticated) {
    return (
      <div className={CREATOR_COLUMN}>
        <AuthRequiredState
          title={t.authRequiredTitle}
          subtitle={t.authRequiredDesc}
        />
      </div>
    );
  }

  // Editing a roster the store doesn't have (deleted, or a stale link): send
  // back rather than silently falling through to "create a new roster".
  if (editId && storeHydrated && !editingRoster) {
    return (
      <div className="relative z-10 flex flex-col gap-2">
        <EmptyState icon={SearchX} title={t.empty.title} subtitle={t.empty.subtitle} />
      </div>
    );
  }

  // Official roster failed to load or not found
  if (officialSlug && !officialLoading && !officialRoster) {
    return (
      <div className="relative z-10 flex flex-col gap-2">
        <EmptyState icon={SearchX} title={t.empty.title} subtitle={t.empty.subtitle} />
      </div>
    );
  }

  const startOver = () => {
    resetDraft();
    resetSubmitState();
    setIsSubmitting(false);
  };

  const publishingNow = publishing && (official || Boolean(officialSlug)) && isUserAdmin;
  const submitLabel = publishingNow
    ? c.saving
    : officialSlug && isUserAdmin
      ? c.saveShort
      : official && isUserAdmin
        ? c.publish
        : editId
          ? c.saveShort
          : c.create;

  const submitButton = (
    <Button
      variant="primary"
      size="lg"
      onClick={() => { void submit(); }}
      loading={publishingNow}
      data-roster-create=""
      className="min-h-12 2xl:min-h-hit-2xl px-8 2xl:px-10 2xl:text-lg"
    >
      {submitLabel}
    </Button>
  );

  const errors = attempted
    ? [
        nameMissing && c.validationNameRequired,
        entitiesMissing && c.validationEntityRequired,
        coverInvalid && c.invalidImage,
      ].filter(Boolean)
    : [];

  return (
    <div className="relative z-10 flex flex-col gap-6 2xl:gap-8 max-w-7xl 2xl:max-wide-2k:max-w-workspace wide-2k:max-w-workspace-xl mx-auto w-full px-4 sm:px-6">
      <h1 className="sr-only">{editId ? c.editTitle : c.title}</h1>
      {restored && (
        <Toast
          icon={<History className="icon-md 2xl:icon-lg" aria-hidden="true" />}
          message={c.draftRestored}
          actions={
            <Button variant="secondary" size="xs" onClick={startOver} className="whitespace-nowrap">
              {c.startOver}
            </Button>
          }
          onDismiss={() => setRestored(false)}
          dismissLabel={c.closeToast}
        />
      )}
      {deleteError && (
        <Toast
          tone="red"
          message={deleteError}
          onDismiss={() => setDeleteError(null)}
          dismissLabel={c.closeToast}
        />
      )}

      {/* BLOCK 1: THE BASICS */}
      <div className={CREATOR_COLUMN}>
        <RosterBasicsSection
          draft={draft}
          patch={patch}
          attempted={attempted}
          nameMissing={nameMissing}
          coverInvalid={coverInvalid}
          isUserAdmin={isUserAdmin}
          official={official}
          onOfficialChange={setOfficial}
          officialSlug={officialSlug}
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

      {/* BLOCK 2: ROLES & GENDERS */}
      <div className={CREATOR_COLUMN}>
        <Section
          title={c.rolesGendersTitle}
          storageKey="lemondbd_smash_creator_section_taxonomy"
          defaultOpen={false}
        >
          <RosterTaxonomyBlock
            roles={draft.custom_roles || []}
            genders={draft.custom_genders || []}
            onChangeRoles={(roles) => patch({ custom_roles: roles })}
            onChangeGenders={(genders) => patch({ custom_genders: genders })}
          />
        </Section>
      </div>

      {/* BLOCK 3: CANDIDATES */}
      <div className={CREATOR_COLUMN}>
        <Section
          title={c.stepEntities}
          badge={draft.entities.length}
          storageKey="lemondbd_smash_creator_section_candidates"
          defaultOpen={true}
        >
          <div className="flex flex-col gap-6">
            {draft.entities.length === 0 ? (
              <EmptyState
                variant="compact"
                title={c.noEntitiesYet}
                action={canAddCandidate ? {
                  label: (
                    <>
                      <Plus className="icon-md" aria-hidden="true" />
                      <span>{c.addEntity}</span>
                    </>
                  ),
                  onClick: addEntity,
                } : undefined}
              />
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
                  canAdd={canAddCandidate}
                  disabledHint={c.addCandidateDisabledHint}
                />

                {!isCurrentCandidateComplete && draft.entities.length > 0 && draft.entities.length < SMASH_ROSTER_LIMITS.maxEntities && (
                  <p
                    id="add-candidate-disabled-hint"
                    data-testid="add-candidate-disabled-hint"
                    className="text-xs text-center text-text-muted italic -mt-3"
                  >
                    {c.addCandidateDisabledHint}
                  </p>
                )}
              </>
            )}
          </div>
        </Section>
      </div>

      {/* BLOCK 4: CUSTOM ROMANCE ARCHETYPES */}
      <div className={CREATOR_COLUMN}>
        <Section
          title={c.customArchetypesTitle}
          badge={draft.romance_archetypes.length}
          storageKey="lemondbd_smash_creator_section_archetypes"
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
      <div className={`${CREATOR_COLUMN} flex flex-col gap-4`}>
        <Feedback errors={errors as string[]} saveError={saveError} submitError={submitError} publishError={publishError} />
      </div>

      {/* ACTIONS: centred under the same column as every block above it */}
      <div className={`${CREATOR_COLUMN} flex flex-wrap items-center justify-center gap-3 pb-4`}>
        {submitButton}
        {officialSlug && isUserAdmin && (
          <Button
            variant="danger"
            size="lg"
            onClick={() => setShowDeleteModal(true)}
            className="min-h-11 2xl:min-h-hit-xl px-6 2xl:px-8 text-sm 2xl:text-base font-bold uppercase tracking-wider"
          >
            <Trash2 className="icon-sm" />
            <span>{t.picker.deleteRoster}</span>
          </Button>
        )}
      </div>

      {showDeleteModal && (
        <Modal
          isOpen
          onClose={() => setShowDeleteModal(false)}
          variant="confirm"
          layer="top"
          title={t.picker.deleteConfirmTitle}
          closeButtonAriaLabel={dict.modal.close}
          bodyClassName="p-5 text-center"
          footerClassName="p-4"
          footer={
            <div className="flex w-full justify-center gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowDeleteModal(false)}
              >
                {dict.tierLists.cancel}
              </Button>
              <Button
                variant="danger"
                size="md"
                disabled={deleting}
                onClick={() => {
                  void (async () => {
                    setDeleting(true);
                    try {
                      const res = await fetch(apiUrl(`/api/v1/smash-or-pass/admin/rosters/${officialSlug}`), {
                        method: 'DELETE',
                        headers: authHeaders(),
                      });
                      if (res.ok) {
                        resetDraft();
                        router.push(`/${locale}/smash-or-pass`);
                      } else {
                        const err = await res.json().catch(() => ({}));
                        setDeleteError(err?.error || err?.message || 'Failed to delete roster');
                        setShowDeleteModal(false);
                      }
                    } catch (e) {
                      setDeleteError(e instanceof Error ? e.message : 'Network error');
                      setShowDeleteModal(false);
                    } finally {
                      setDeleting(false);
                    }
                  })();
                }}
              >
                {t.picker.deleteConfirmAction}
              </Button>
            </div>
          }
        >
          <p className="type-body text-text-muted">
            {formatMessage(t.picker.deleteConfirmDesc, { name: draft.name || officialSlug })}
          </p>
        </Modal>
      )}

      {/* Cover Image Viewport Crop Modal (Roster card 31:50 aspect ratio) */}
      <CoverImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        imageUrl={draft.cover_image_url}
        themeColor={draft.theme_color}
        isAdmin={isUserAdmin}
        aspectRatio="roster"
        onApplyCrop={(croppedUrl) => {
          patch({ cover_image_url: croppedUrl });
          setIsCropModalOpen(false);
        }}
      />
    </div>
  );
}
